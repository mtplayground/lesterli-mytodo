use crate::{
    error::AppError,
    services::auth::{self, AuthenticatedUserOutput, LoginUserInput, RegisterUserInput},
    AppState,
};
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: RegisteredUserResponse,
}

#[derive(Debug, Serialize)]
pub struct RegisteredUserResponse {
    pub id: Uuid,
    pub email: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), AppError> {
    let registered = auth::register_user(
        &state,
        RegisterUserInput {
            email: payload.email,
            password: payload.password,
        },
    )
    .await
    .map_err(AppError::from)?;

    Ok(auth_response(StatusCode::CREATED, registered))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), AppError> {
    let authenticated = auth::login_user(
        &state,
        LoginUserInput {
            email: payload.email,
            password: payload.password,
        },
    )
    .await
    .map_err(AppError::from)?;

    Ok(auth_response(StatusCode::OK, authenticated))
}

fn auth_response(status: StatusCode, authenticated: AuthenticatedUserOutput) -> (StatusCode, Json<AuthResponse>) {
    (
        status,
        Json(AuthResponse {
            token: authenticated.token,
            user: RegisteredUserResponse {
                id: authenticated.user.id,
                email: authenticated.user.email,
                created_at: authenticated.user.created_at.unix_timestamp(),
                updated_at: authenticated.user.updated_at.unix_timestamp(),
            },
        }),
    )
}
