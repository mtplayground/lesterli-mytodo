use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    Json,
};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct AuthErrorResponse {
    pub error: String,
}

pub type AuthRejection = (StatusCode, Json<AuthErrorResponse>);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UserId(pub Uuid);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CurrentUser {
    pub user_id: UserId,
}

impl<S> FromRequestParts<S> for UserId
where
    S: Send + Sync,
{
    type Rejection = AuthRejection;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<UserId>()
            .copied()
            .ok_or_else(|| unauthorized("authentication required"))
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AuthRejection;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let user_id = UserId::from_request_parts(parts, state).await?;

        Ok(Self { user_id })
    }
}

pub fn unauthorized(message: impl Into<String>) -> AuthRejection {
    (
        StatusCode::UNAUTHORIZED,
        Json(AuthErrorResponse {
            error: message.into(),
        }),
    )
}
