use crate::{
    models::todo::{CreateTodoInput, Todo, UpdateTodoInput},
    repo::todos::{self as todo_repo, TodoListFilters},
    AppState,
};
use sqlx::Error as SqlxError;
use uuid::Uuid;

const MAX_TITLE_LENGTH: usize = 200;
const MAX_DESCRIPTION_LENGTH: usize = 5_000;

#[derive(Debug)]
pub enum TodoServiceError {
    Validation(String),
    NotFound(String),
    Database(SqlxError),
}

impl From<SqlxError> for TodoServiceError {
    fn from(error: SqlxError) -> Self {
        Self::Database(error)
    }
}

pub async fn create_todo(
    state: &AppState,
    user_id: Uuid,
    input: CreateTodoInput,
) -> Result<Todo, TodoServiceError> {
    let input = normalize_create_input(input)?;

    todo_repo::create_todo(&state.db_pool, user_id, &input)
        .await
        .map_err(TodoServiceError::from)
}

pub async fn list_todos(
    state: &AppState,
    user_id: Uuid,
    filters: TodoListFilters,
) -> Result<Vec<Todo>, TodoServiceError> {
    todo_repo::list_todos(&state.db_pool, user_id, &filters)
        .await
        .map_err(TodoServiceError::from)
}

pub async fn get_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<Todo, TodoServiceError> {
    todo_repo::get_todo(&state.db_pool, user_id, todo_id)
        .await
        .map_err(TodoServiceError::from)?
        .ok_or_else(|| TodoServiceError::NotFound(String::from("todo not found")))
}

pub async fn update_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
    input: UpdateTodoInput,
) -> Result<Todo, TodoServiceError> {
    let input = normalize_update_input(input)?;

    todo_repo::update_todo(&state.db_pool, user_id, todo_id, &input)
        .await
        .map_err(TodoServiceError::from)?
        .ok_or_else(|| TodoServiceError::NotFound(String::from("todo not found")))
}

pub async fn delete_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<(), TodoServiceError> {
    let deleted = todo_repo::delete_todo(&state.db_pool, user_id, todo_id)
        .await
        .map_err(TodoServiceError::from)?;

    if deleted {
        Ok(())
    } else {
        Err(TodoServiceError::NotFound(String::from("todo not found")))
    }
}

pub const fn max_title_length() -> usize {
    MAX_TITLE_LENGTH
}

pub const fn max_description_length() -> usize {
    MAX_DESCRIPTION_LENGTH
}

fn normalize_create_input(input: CreateTodoInput) -> Result<CreateTodoInput, TodoServiceError> {
    Ok(CreateTodoInput {
        title: normalize_title(&input.title)?,
        description: normalize_description(input.description)?,
    })
}

fn normalize_update_input(input: UpdateTodoInput) -> Result<UpdateTodoInput, TodoServiceError> {
    Ok(UpdateTodoInput {
        title: normalize_title(&input.title)?,
        description: normalize_description(input.description)?,
        completed: input.completed,
    })
}

fn normalize_title(raw_title: &str) -> Result<String, TodoServiceError> {
    let title = raw_title.trim();

    if title.is_empty() {
        return Err(TodoServiceError::Validation(String::from(
            "title is required",
        )));
    }

    if title.chars().count() > MAX_TITLE_LENGTH {
        return Err(TodoServiceError::Validation(format!(
            "title must be at most {MAX_TITLE_LENGTH} characters"
        )));
    }

    Ok(title.to_owned())
}

fn normalize_description(
    description: Option<String>,
) -> Result<Option<String>, TodoServiceError> {
    let Some(description) = description else {
        return Ok(None);
    };

    let trimmed = description.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    if trimmed.chars().count() > MAX_DESCRIPTION_LENGTH {
        return Err(TodoServiceError::Validation(format!(
            "description must be at most {MAX_DESCRIPTION_LENGTH} characters"
        )));
    }

    Ok(Some(trimmed.to_owned()))
}
