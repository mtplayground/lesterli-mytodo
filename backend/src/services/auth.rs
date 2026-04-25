use crate::{
    auth::{jwt, password},
    AppState,
};
use sqlx::Error as SqlxError;
use time::OffsetDateTime;
use uuid::Uuid;

const MIN_PASSWORD_LENGTH: usize = 8;

#[derive(Debug)]
pub struct RegisterUserInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug)]
pub struct LoginUserInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug)]
pub struct ChangePasswordInput {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug)]
pub struct AuthenticatedUserOutput {
    pub token: String,
    pub user: RegisteredUser,
}

#[derive(Debug)]
pub struct RegisteredUser {
    pub id: Uuid,
    pub email: String,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug)]
pub enum AuthServiceError {
    Validation(String),
    Conflict(String),
    NotFound(String),
    Unauthorized(String),
    PasswordHash(password::PasswordError),
    Jwt(jwt::JwtError),
    Database(SqlxError),
}

impl From<password::PasswordError> for AuthServiceError {
    fn from(error: password::PasswordError) -> Self {
        Self::PasswordHash(error)
    }
}

impl From<jwt::JwtError> for AuthServiceError {
    fn from(error: jwt::JwtError) -> Self {
        Self::Jwt(error)
    }
}

pub async fn register_user(
    state: &AppState,
    input: RegisterUserInput,
) -> Result<AuthenticatedUserOutput, AuthServiceError> {
    let email = normalize_email(&input.email)?;
    validate_password(&input.password)?;

    let password_hash = password::hash_password(&input.password)?;
    let row = sqlx::query_as::<_, (Uuid, String, OffsetDateTime, OffsetDateTime)>(
        r#"
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, created_at, updated_at
        "#,
    )
    .bind(&email)
    .bind(&password_hash)
    .fetch_one(&state.db_pool)
    .await
    .map_err(map_database_error)?;

    let user = RegisteredUser {
        id: row.0,
        email: row.1,
        created_at: row.2,
        updated_at: row.3,
    };
    let token = jwt::encode_token(user.id, &state.config)?;

    Ok(AuthenticatedUserOutput { token, user })
}

pub async fn login_user(
    state: &AppState,
    input: LoginUserInput,
) -> Result<AuthenticatedUserOutput, AuthServiceError> {
    let email = normalize_email(&input.email)?;
    validate_login_password(&input.password)?;

    let row = sqlx::query_as::<_, (Uuid, String, String, OffsetDateTime, OffsetDateTime)>(
        r#"
        SELECT id, email, password_hash, created_at, updated_at
        FROM users
        WHERE email = $1
        "#,
    )
    .bind(&email)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(AuthServiceError::Database)?;

    let Some((id, email, password_hash, created_at, updated_at)) = row else {
        return Err(AuthServiceError::Unauthorized(String::from(
            "invalid email or password",
        )));
    };

    let password_matches = password::verify_password(&input.password, &password_hash)?;
    if !password_matches {
        return Err(AuthServiceError::Unauthorized(String::from(
            "invalid email or password",
        )));
    }

    let user = RegisteredUser {
        id,
        email,
        created_at,
        updated_at,
    };
    let token = jwt::encode_token(user.id, &state.config)?;

    Ok(AuthenticatedUserOutput { token, user })
}

pub async fn get_current_user(
    state: &AppState,
    user_id: Uuid,
) -> Result<RegisteredUser, AuthServiceError> {
    fetch_user_by_id(state, user_id)
        .await?
        .ok_or_else(|| AuthServiceError::NotFound(String::from("user not found")))
}

pub async fn change_password(
    state: &AppState,
    user_id: Uuid,
    input: ChangePasswordInput,
) -> Result<(), AuthServiceError> {
    validate_login_password(&input.current_password)?;
    validate_password(&input.new_password)?;

    let row = sqlx::query_as::<_, (String,)>(
        r#"
        SELECT password_hash
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(AuthServiceError::Database)?;

    let Some((password_hash,)) = row else {
        return Err(AuthServiceError::NotFound(String::from("user not found")));
    };

    let password_matches = password::verify_password(&input.current_password, &password_hash)?;
    if !password_matches {
        return Err(AuthServiceError::Unauthorized(String::from(
            "current password is incorrect",
        )));
    }

    let new_password_hash = password::hash_password(&input.new_password)?;

    sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(&new_password_hash)
    .execute(&state.db_pool)
    .await
    .map_err(AuthServiceError::Database)?;

    Ok(())
}

fn normalize_email(raw_email: &str) -> Result<String, AuthServiceError> {
    let email = raw_email.trim().to_lowercase();

    if email.is_empty() {
        return Err(AuthServiceError::Validation(String::from(
            "email is required",
        )));
    }

    let mut parts = email.split('@');
    let local = parts.next().unwrap_or_default();
    let domain = parts.next().unwrap_or_default();

    if local.is_empty()
        || domain.is_empty()
        || parts.next().is_some()
        || !domain.contains('.')
        || domain.starts_with('.')
        || domain.ends_with('.')
    {
        return Err(AuthServiceError::Validation(String::from(
            "email must be a valid address",
        )));
    }

    Ok(email)
}

fn validate_password(password: &str) -> Result<(), AuthServiceError> {
    if password.len() < MIN_PASSWORD_LENGTH {
        return Err(AuthServiceError::Validation(format!(
            "password must be at least {MIN_PASSWORD_LENGTH} characters"
        )));
    }

    Ok(())
}

fn validate_login_password(password: &str) -> Result<(), AuthServiceError> {
    if password.is_empty() {
        return Err(AuthServiceError::Validation(String::from(
            "password is required",
        )));
    }

    Ok(())
}

fn map_database_error(error: SqlxError) -> AuthServiceError {
    match &error {
        SqlxError::Database(database_error)
            if database_error.code().as_deref() == Some("23505") =>
        {
            AuthServiceError::Conflict(String::from("email is already registered"))
        }
        _ => AuthServiceError::Database(error),
    }
}

async fn fetch_user_by_id(
    state: &AppState,
    user_id: Uuid,
) -> Result<Option<RegisteredUser>, AuthServiceError> {
    let row = sqlx::query_as::<_, (Uuid, String, OffsetDateTime, OffsetDateTime)>(
        r#"
        SELECT id, email, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(AuthServiceError::Database)?;

    Ok(row.map(|(id, email, created_at, updated_at)| RegisteredUser {
        id,
        email,
        created_at,
        updated_at,
    }))
}
