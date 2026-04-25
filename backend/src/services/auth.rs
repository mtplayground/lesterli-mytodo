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
