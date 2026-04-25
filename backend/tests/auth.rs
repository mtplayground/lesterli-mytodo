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
async fn register_login_profile_and_change_password_flow() {
    let app = test_app().await;
    let email = unique_email("auth");
    let initial_password = "supersecret123";
    let updated_password = "newsupersecret456";

    let register_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/register",
            json!({
                "email": email,
                "password": initial_password,
            }),
            None,
        ))
        .await
        .expect("register request should succeed");
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let register_body = json_body(register_response).await;
    let token = register_body["token"]
        .as_str()
        .expect("register token should be present");
    assert_eq!(register_body["user"]["email"], email);

    let login_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/login",
            json!({
                "email": email,
                "password": initial_password,
            }),
            None,
        ))
        .await
        .expect("login request should succeed");
    assert_eq!(login_response.status(), StatusCode::OK);

    let me_response = app
        .clone()
        .oneshot(json_request("GET", "/api/me", Value::Null, Some(token)))
        .await
        .expect("profile request should succeed");
    assert_eq!(me_response.status(), StatusCode::OK);

    let me_body = json_body(me_response).await;
    assert_eq!(me_body["email"], email);

    let change_password_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/me/password",
            json!({
                "current_password": initial_password,
                "new_password": updated_password,
            }),
            Some(token),
        ))
        .await
        .expect("change password request should succeed");
    assert_eq!(change_password_response.status(), StatusCode::NO_CONTENT);

    let old_login_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/login",
            json!({
                "email": email,
                "password": initial_password,
            }),
            None,
        ))
        .await
        .expect("old login request should succeed");
    assert_eq!(old_login_response.status(), StatusCode::UNAUTHORIZED);

    let new_login_response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/login",
            json!({
                "email": email,
                "password": updated_password,
            }),
            None,
        ))
        .await
        .expect("new login request should succeed");
    assert_eq!(new_login_response.status(), StatusCode::OK);
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
