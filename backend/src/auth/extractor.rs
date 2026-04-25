use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use uuid::Uuid;

use crate::error::AppError;

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
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<UserId>()
            .copied()
            .ok_or_else(|| AppError::Unauthorized(String::from("authentication required")))
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let user_id = UserId::from_request_parts(parts, state).await?;

        Ok(Self { user_id })
    }
}
