use crate::{
    db::DbPool,
    models::todo::{CreateTodoInput, Todo, UpdateTodoInput},
};
use uuid::Uuid;

#[derive(Debug, Clone, Default)]
pub struct TodoListFilters {
    pub completed: Option<bool>,
    pub query: Option<String>,
}

pub async fn create_todo(
    pool: &DbPool,
    user_id: Uuid,
    input: &CreateTodoInput,
) -> Result<Todo, sqlx::Error> {
    sqlx::query_as::<_, Todo>(
        r#"
        INSERT INTO todos (user_id, title, description)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, title, description, completed, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .bind(&input.title)
    .bind(&input.description)
    .fetch_one(pool)
    .await
}

pub async fn list_todos(
    pool: &DbPool,
    user_id: Uuid,
    filters: &TodoListFilters,
) -> Result<Vec<Todo>, sqlx::Error> {
    sqlx::query_as::<_, Todo>(
        r#"
        SELECT id, user_id, title, description, completed, created_at, updated_at
        FROM todos
        WHERE user_id = $1
          AND ($2::BOOL IS NULL OR completed = $2)
          AND (
              $3::TEXT IS NULL
              OR title ILIKE $3
              OR COALESCE(description, '') ILIKE $3
          )
        ORDER BY created_at DESC, id DESC
        "#,
    )
    .bind(user_id)
    .bind(filters.completed)
    .bind(filters.query.as_deref())
    .fetch_all(pool)
    .await
}

pub async fn get_todo(
    pool: &DbPool,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<Option<Todo>, sqlx::Error> {
    sqlx::query_as::<_, Todo>(
        r#"
        SELECT id, user_id, title, description, completed, created_at, updated_at
        FROM todos
        WHERE user_id = $1 AND id = $2
        "#,
    )
    .bind(user_id)
    .bind(todo_id)
    .fetch_optional(pool)
    .await
}

pub async fn update_todo(
    pool: &DbPool,
    user_id: Uuid,
    todo_id: Uuid,
    input: &UpdateTodoInput,
) -> Result<Option<Todo>, sqlx::Error> {
    sqlx::query_as::<_, Todo>(
        r#"
        UPDATE todos
        SET title = $3,
            description = $4,
            completed = $5,
            updated_at = NOW()
        WHERE user_id = $1 AND id = $2
        RETURNING id, user_id, title, description, completed, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .bind(todo_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(input.completed)
    .fetch_optional(pool)
    .await
}

pub async fn delete_todo(
    pool: &DbPool,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        DELETE FROM todos
        WHERE user_id = $1 AND id = $2
        "#,
    )
    .bind(user_id)
    .bind(todo_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}
