use crate::{
    auth::{extractor::{unauthorized, AuthRejection, UserId}, jwt},
    AppState,
};
use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};

pub async fn require_auth(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AuthRejection> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .ok_or_else(|| unauthorized("missing authorization header"))?;
    let auth_value = auth_header
        .to_str()
        .map_err(|_| unauthorized("invalid authorization header"))?;
    let token = auth_value
        .strip_prefix("Bearer ")
        .ok_or_else(|| unauthorized("authorization header must use Bearer token"))?;
    let claims = jwt::decode_token(token, &state.config)
        .map_err(|_| unauthorized("invalid or expired token"))?;

    request.extensions_mut().insert(UserId(claims.claims.sub));

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::require_auth;
    use crate::{
        auth::{extractor::UserId, jwt::encode_token},
        config::AppConfig,
        AppState,
    };
    use axum::{
        body::{to_bytes, Body},
        http::{header::AUTHORIZATION, Request, StatusCode},
        middleware,
        routing::get,
        Router,
    };
    use sqlx::postgres::PgPoolOptions;
    use tower::ServiceExt;
    use uuid::Uuid;

    #[tokio::test]
    async fn accepts_valid_bearer_tokens_and_injects_user_id() {
        let state = test_state();
        let user_id = Uuid::new_v4();
        let token = encode_token(user_id, &state.config).expect("token should encode");
        let app = protected_router(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(AUTHORIZATION, format!("Bearer {token}"))
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body should read");

        assert_eq!(String::from_utf8(body.to_vec()).expect("body should be utf-8"), user_id.to_string());
    }

    #[tokio::test]
    async fn rejects_requests_without_authorization_header() {
        let app = protected_router(test_state());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should succeed");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    fn protected_router(state: AppState) -> Router {
        Router::new()
            .route("/protected", get(protected_handler))
            .route_layer(middleware::from_fn_with_state(
                state.clone(),
                require_auth,
            ))
            .with_state(state)
    }

    async fn protected_handler(user_id: UserId) -> String {
        user_id.0.to_string()
    }

    fn test_state() -> AppState {
        AppState {
            config: AppConfig {
                database_url: String::from("postgres://postgres:postgres@localhost:5432/test"),
                jwt_secret: String::from("test-jwt-secret"),
                jwt_expiry_hours: 24,
                bind_addr: String::from("127.0.0.1:8080"),
                rust_log: String::from("info"),
            },
            db_pool: PgPoolOptions::new()
                .connect_lazy("postgres://postgres:postgres@localhost:5432/test")
                .expect("lazy pool should build"),
        }
    }
}
