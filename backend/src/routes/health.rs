use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { status: "ok" }))
}
