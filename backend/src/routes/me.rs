use crate::{
    auth::extractor::CurrentUser,
    error::AppError,
    services::auth::{self, ChangePasswordInput, RegisteredUser},
    AppState,
};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub id: Uuid,
    pub email: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn get_me(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
) -> Result<Json<MeResponse>, AppError> {
    let user = auth::get_current_user(&state, user_id.0)
        .await
        .map_err(AppError::from)?;

    Ok(Json(me_response(user)))
}

pub async fn change_password(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<StatusCode, AppError> {
    auth::change_password(
        &state,
        user_id.0,
        ChangePasswordInput {
            current_password: payload.current_password,
            new_password: payload.new_password,
        },
    )
    .await
    .map_err(AppError::from)?;

    Ok(StatusCode::NO_CONTENT)
}

fn me_response(user: RegisteredUser) -> MeResponse {
    MeResponse {
        id: user.id,
        email: user.email,
        created_at: user.created_at.unix_timestamp(),
        updated_at: user.updated_at.unix_timestamp(),
    }
}
