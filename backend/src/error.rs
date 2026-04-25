use crate::{
    auth::{jwt, password},
    services::{auth::AuthServiceError, todos::TodoServiceError},
};
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::{error::Error, fmt};

#[derive(Debug)]
pub enum AppError {
    Validation(String),
    Unauthorized(String),
    Conflict(String),
    NotFound(String),
    Database(sqlx::Error),
    Jwt(jwt::JwtError),
    PasswordHash(password::PasswordError),
    Internal(String),
}

#[derive(Debug, Serialize)]
struct ErrorPayload {
    error: &'static str,
    message: String,
}

impl fmt::Display for AppError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Validation(message)
            | Self::Unauthorized(message)
            | Self::Conflict(message)
            | Self::NotFound(message)
            | Self::Internal(message) => write!(formatter, "{message}"),
            Self::Database(error) => write!(formatter, "{error}"),
            Self::Jwt(error) => write!(formatter, "{error}"),
            Self::PasswordHash(error) => write!(formatter, "{error}"),
        }
    }
}

impl Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error, message) = match self {
            Self::Validation(message) => (StatusCode::BAD_REQUEST, "validation_error", message),
            Self::Unauthorized(message) => (StatusCode::UNAUTHORIZED, "unauthorized", message),
            Self::Conflict(message) => (StatusCode::CONFLICT, "conflict", message),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, "not_found", message),
            Self::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database_error",
                String::from("database operation failed"),
            ),
            Self::Jwt(_) | Self::PasswordHash(_) | Self::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                String::from("internal server error"),
            ),
        };

        (
            status,
            Json(ErrorPayload {
                error,
                message,
            }),
        )
            .into_response()
    }
}

impl From<AuthServiceError> for AppError {
    fn from(error: AuthServiceError) -> Self {
        match error {
            AuthServiceError::Validation(message) => Self::Validation(message),
            AuthServiceError::Conflict(message) => Self::Conflict(message),
            AuthServiceError::NotFound(message) => Self::NotFound(message),
            AuthServiceError::Unauthorized(message) => Self::Unauthorized(message),
            AuthServiceError::PasswordHash(error) => Self::PasswordHash(error),
            AuthServiceError::Jwt(error) => Self::Jwt(error),
            AuthServiceError::Database(error) => Self::Database(error),
        }
    }
}

impl From<TodoServiceError> for AppError {
    fn from(error: TodoServiceError) -> Self {
        match error {
            TodoServiceError::Validation(message) => Self::Validation(message),
            TodoServiceError::NotFound(message) => Self::NotFound(message),
            TodoServiceError::Database(error) => Self::Database(error),
        }
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error)
    }
}

impl From<jwt::JwtError> for AppError {
    fn from(error: jwt::JwtError) -> Self {
        Self::Jwt(error)
    }
}

impl From<password::PasswordError> for AppError {
    fn from(error: password::PasswordError) -> Self {
        Self::PasswordHash(error)
    }
}
