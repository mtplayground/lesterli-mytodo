use axum::{
    body::{to_bytes, Body},
    http::{header::AUTHORIZATION, Request, StatusCode},
};
use lesterli_mytodo_backend::{build_app, build_state, config::AppConfig, db};
use serde_json::{json, Value};
use serial_test::serial;
use tower::ServiceExt;

#[tokio::test]
#[serial]
async fn todo_crud_enforces_ownership() {
    let app = test_app().await;
    let owner = register_user(&app, unique_email("owner"), "supersecret123").await;
    let intruder = register_user(&app, unique_email("intruder"), "supersecret123").await;

    let created_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/todos",
            json!({
                "title": "Owner todo",
                "description": "private",
            }),
            Some(&owner.token),
        ))
        .await
        .expect("create todo request should succeed");
    assert_eq!(created_response.status(), StatusCode::CREATED);
    let created_body = json_body(created_response).await;
    let todo_id = created_body["id"]
        .as_str()
        .expect("todo id should be present");

    let list_response = app
        .clone()
        .oneshot(json_request("GET", "/api/todos", Value::Null, Some(&owner.token)))
        .await
        .expect("list todos request should succeed");
    assert_eq!(list_response.status(), StatusCode::OK);
    let list_body = json_body(list_response).await;
    assert_eq!(list_body.as_array().expect("todos should be an array").len(), 1);

    let owner_get_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            &format!("/api/todos/{todo_id}"),
            Value::Null,
            Some(&owner.token),
        ))
        .await
        .expect("owner get request should succeed");
    assert_eq!(owner_get_response.status(), StatusCode::OK);

    let intruder_get_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            &format!("/api/todos/{todo_id}"),
            Value::Null,
            Some(&intruder.token),
        ))
        .await
        .expect("intruder get request should succeed");
    assert_eq!(intruder_get_response.status(), StatusCode::NOT_FOUND);

    let intruder_update_response = app
        .clone()
        .oneshot(json_request(
            "PUT",
            &format!("/api/todos/{todo_id}"),
            json!({
                "title": "Hijacked",
                "description": "should fail",
                "completed": true,
            }),
            Some(&intruder.token),
        ))
        .await
        .expect("intruder update request should succeed");
    assert_eq!(intruder_update_response.status(), StatusCode::NOT_FOUND);

    let owner_update_response = app
        .clone()
        .oneshot(json_request(
            "PUT",
            &format!("/api/todos/{todo_id}"),
            json!({
                "title": "Owner todo updated",
                "description": "still private",
                "completed": true,
            }),
            Some(&owner.token),
        ))
        .await
        .expect("owner update request should succeed");
    assert_eq!(owner_update_response.status(), StatusCode::OK);

    let intruder_delete_response = app
        .clone()
        .oneshot(json_request(
            "DELETE",
            &format!("/api/todos/{todo_id}"),
            Value::Null,
            Some(&intruder.token),
        ))
        .await
        .expect("intruder delete request should succeed");
    assert_eq!(intruder_delete_response.status(), StatusCode::NOT_FOUND);

    let owner_delete_response = app
        .clone()
        .oneshot(json_request(
            "DELETE",
            &format!("/api/todos/{todo_id}"),
            Value::Null,
            Some(&owner.token),
        ))
        .await
        .expect("owner delete request should succeed");
    assert_eq!(owner_delete_response.status(), StatusCode::NO_CONTENT);

    let deleted_get_response = app
        .oneshot(json_request(
            "GET",
            &format!("/api/todos/{todo_id}"),
            Value::Null,
            Some(&owner.token),
        ))
        .await
        .expect("deleted get request should succeed");
    assert_eq!(deleted_get_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[serial]
async fn todo_list_supports_status_and_search_filters() {
    let app = test_app().await;
    let user = register_user(&app, unique_email("filters"), "supersecret123").await;

    create_todo(&app, &user.token, "Alpha task", "contains zebra").await;
    create_todo(&app, &user.token, "Bravo task", "plain text").await;
    let completed_todo = create_todo(&app, &user.token, "Completed item", "zebra done").await;

    let complete_response = app
        .clone()
        .oneshot(json_request(
            "PUT",
            &format!("/api/todos/{}", completed_todo["id"].as_str().expect("todo id should exist")),
            json!({
                "title": "Completed item",
                "description": "zebra done",
                "completed": true,
            }),
            Some(&user.token),
        ))
        .await
        .expect("complete todo request should succeed");
    assert_eq!(complete_response.status(), StatusCode::OK);

    let active_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            "/api/todos?status=active",
            Value::Null,
            Some(&user.token),
        ))
        .await
        .expect("active filter request should succeed");
    assert_eq!(active_response.status(), StatusCode::OK);
    let active_body = json_body(active_response).await;
    assert_eq!(titles(&active_body), vec!["Bravo task", "Alpha task"]);

    let completed_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            "/api/todos?status=completed",
            Value::Null,
            Some(&user.token),
        ))
        .await
        .expect("completed filter request should succeed");
    assert_eq!(completed_response.status(), StatusCode::OK);
    let completed_body = json_body(completed_response).await;
    assert_eq!(titles(&completed_body), vec!["Completed item"]);

    let search_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            "/api/todos?q=zebra",
            Value::Null,
            Some(&user.token),
        ))
        .await
        .expect("search request should succeed");
    assert_eq!(search_response.status(), StatusCode::OK);
    let search_body = json_body(search_response).await;
    assert_eq!(titles(&search_body), vec!["Completed item", "Alpha task"]);

    let combined_response = app
        .clone()
        .oneshot(json_request(
            "GET",
            "/api/todos?status=completed&q=zebra",
            Value::Null,
            Some(&user.token),
        ))
        .await
        .expect("combined filter request should succeed");
    assert_eq!(combined_response.status(), StatusCode::OK);
    let combined_body = json_body(combined_response).await;
    assert_eq!(titles(&combined_body), vec!["Completed item"]);

    let invalid_status_response = app
        .oneshot(json_request(
            "GET",
            "/api/todos?status=bogus",
            Value::Null,
            Some(&user.token),
        ))
        .await
        .expect("invalid status request should succeed");
    assert_eq!(invalid_status_response.status(), StatusCode::BAD_REQUEST);
}

#[derive(Debug)]
struct RegisteredUser {
    token: String,
}

async fn test_app() -> axum::Router {
    let config = test_config();
    let state = build_state(config)
        .await
        .expect("test app state should initialize");

    db::migrate(&state.db_pool)
        .await
        .expect("migrations should run");
    sqlx::query("TRUNCATE TABLE todos, users CASCADE")
        .execute(&state.db_pool)
        .await
        .expect("test data should be cleared");

    build_app(state)
}

fn test_config() -> AppConfig {
    AppConfig {
        database_url: std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for integration tests"),
        jwt_secret: String::from("integration-test-secret"),
        jwt_expiry_hours: 24,
        bind_addr: String::from("127.0.0.1:8080"),
        rust_log: String::from("error"),
    }
}

fn unique_email(prefix: &str) -> String {
    format!("{prefix}-{}@example.com", uuid::Uuid::new_v4())
}

async fn register_user(app: &axum::Router, email: String, password: &str) -> RegisteredUser {
    let response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/register",
            json!({
                "email": email,
                "password": password,
            }),
            None,
        ))
        .await
        .expect("register request should succeed");
    assert_eq!(response.status(), StatusCode::CREATED);
    let body = json_body(response).await;

    RegisteredUser {
        token: body["token"]
            .as_str()
            .expect("token should be present")
            .to_owned(),
    }
}

async fn create_todo(app: &axum::Router, token: &str, title: &str, description: &str) -> Value {
    let response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/todos",
            json!({
                "title": title,
                "description": description,
            }),
            Some(token),
        ))
        .await
        .expect("create todo request should succeed");
    assert_eq!(response.status(), StatusCode::CREATED);

    json_body(response).await
}

fn json_request(method: &str, uri: &str, body: Value, token: Option<&str>) -> Request<Body> {
    let mut request = Request::builder().method(method).uri(uri);
    if let Some(token) = token {
        request = request.header(AUTHORIZATION, format!("Bearer {token}"));
    }

    request
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("request should build")
}

async fn json_body(response: axum::response::Response) -> Value {
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body should read");

    serde_json::from_slice(&bytes).expect("response body should be valid json")
}

fn titles(payload: &Value) -> Vec<String> {
    payload
        .as_array()
        .expect("payload should be an array")
        .iter()
        .map(|todo| {
            todo["title"]
                .as_str()
                .expect("title should be present")
                .to_owned()
        })
        .collect()
}
