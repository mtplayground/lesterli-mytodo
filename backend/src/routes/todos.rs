use crate::{
    auth::extractor::CurrentUser,
    error::AppError,
    models::todo::{CreateTodoInput, TodoResponse, UpdateTodoInput},
    services::todos,
    AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::borrow::Cow;
use uuid::Uuid;
use validator::{Validate, ValidationError, ValidationErrors};

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTodoRequest {
    #[validate(custom(function = "validate_title"))]
    pub title: String,
    #[validate(custom(function = "validate_description"))]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateTodoRequest {
    #[validate(custom(function = "validate_title"))]
    pub title: String,
    #[validate(custom(function = "validate_description"))]
    pub description: Option<String>,
    pub completed: bool,
}

pub async fn create_todo(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
    Json(payload): Json<CreateTodoRequest>,
) -> Result<(StatusCode, Json<TodoResponse>), AppError> {
    validate_payload(&payload)?;

    let todo = todos::create_todo(
        &state,
        user_id.0,
        CreateTodoInput {
            title: payload.title,
            description: payload.description,
        },
    )
    .await
    .map_err(AppError::from)?;

    Ok((StatusCode::CREATED, Json(todo.into())))
}

pub async fn list_todos(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
) -> Result<Json<Vec<TodoResponse>>, AppError> {
    let todos = todos::list_todos(&state, user_id.0)
        .await
        .map_err(AppError::from)?;

    Ok(Json(todos.into_iter().map(TodoResponse::from).collect()))
}

pub async fn get_todo(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
    Path(todo_id): Path<Uuid>,
) -> Result<Json<TodoResponse>, AppError> {
    let todo = todos::get_todo(&state, user_id.0, todo_id)
        .await
        .map_err(AppError::from)?;

    Ok(Json(todo.into()))
}

pub async fn update_todo(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
    Path(todo_id): Path<Uuid>,
    Json(payload): Json<UpdateTodoRequest>,
) -> Result<Json<TodoResponse>, AppError> {
    validate_payload(&payload)?;

    let todo = todos::update_todo(
        &state,
        user_id.0,
        todo_id,
        UpdateTodoInput {
            title: payload.title,
            description: payload.description,
            completed: payload.completed,
        },
    )
    .await
    .map_err(AppError::from)?;

    Ok(Json(todo.into()))
}

pub async fn delete_todo(
    State(state): State<AppState>,
    CurrentUser { user_id }: CurrentUser,
    Path(todo_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    todos::delete_todo(&state, user_id.0, todo_id)
        .await
        .map_err(AppError::from)?;

    Ok(StatusCode::NO_CONTENT)
}

fn validate_payload(payload: &impl Validate) -> Result<(), AppError> {
    payload
        .validate()
        .map_err(|error| AppError::Validation(validation_message(&error)))
}

fn validation_message(errors: &ValidationErrors) -> String {
    errors
        .field_errors()
        .values()
        .flat_map(|entries| entries.iter())
        .find_map(|entry| entry.message.as_ref().map(ToString::to_string))
        .unwrap_or_else(|| String::from("invalid todo payload"))
}

fn validate_title(title: &str) -> Result<(), ValidationError> {
    let trimmed = title.trim();

    if trimmed.is_empty() {
        return Err(validation_error("title is required"));
    }

    if trimmed.chars().count() > todos::max_title_length() {
        return Err(validation_error(&format!(
            "title must be at most {} characters",
            todos::max_title_length()
        )));
    }

    Ok(())
}

fn validate_description(description: &String) -> Result<(), ValidationError> {
    if description.trim().chars().count() > todos::max_description_length() {
        return Err(validation_error(&format!(
            "description must be at most {} characters",
            todos::max_description_length()
        )));
    }

    Ok(())
}

fn validation_error(message: &str) -> ValidationError {
    let mut error = ValidationError::new("invalid");
    error.message = Some(Cow::Owned(String::from(message)));
    error
}
