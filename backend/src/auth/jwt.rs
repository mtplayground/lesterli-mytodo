use crate::config::AppConfig;
use jsonwebtoken::{
    decode, encode, errors::Error as JwtLibraryError, Algorithm, DecodingKey, EncodingKey, Header,
    TokenData, Validation,
};
use serde::{Deserialize, Serialize};
use std::{error::Error, fmt};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthClaims {
    pub sub: Uuid,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug)]
pub enum JwtError {
    Encode(JwtLibraryError),
    Decode(JwtLibraryError),
    InvalidExpiry(u64),
}

impl fmt::Display for JwtError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Encode(error) => write!(formatter, "jwt encode failed: {error}"),
            Self::Decode(error) => write!(formatter, "jwt decode failed: {error}"),
            Self::InvalidExpiry(hours) => {
                write!(formatter, "jwt expiry hours `{hours}` exceeds supported range")
            }
        }
    }
}

impl Error for JwtError {}

pub fn encode_token(user_id: Uuid, config: &AppConfig) -> Result<String, JwtError> {
    let now = OffsetDateTime::now_utc().unix_timestamp();
    let expiry_seconds = config
        .jwt_expiry_hours
        .checked_mul(60 * 60)
        .ok_or(JwtError::InvalidExpiry(config.jwt_expiry_hours))?;
    let expiry_timestamp = now
        .checked_add(i64::try_from(expiry_seconds).map_err(|_| JwtError::InvalidExpiry(config.jwt_expiry_hours))?)
        .ok_or(JwtError::InvalidExpiry(config.jwt_expiry_hours))?;

    let claims = AuthClaims {
        sub: user_id,
        exp: usize::try_from(expiry_timestamp)
            .map_err(|_| JwtError::InvalidExpiry(config.jwt_expiry_hours))?,
        iat: usize::try_from(now).map_err(|_| JwtError::InvalidExpiry(config.jwt_expiry_hours))?,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(JwtError::Encode)
}

pub fn decode_token(token: &str, config: &AppConfig) -> Result<TokenData<AuthClaims>, JwtError> {
    let validation = Validation::new(Algorithm::HS256);

    decode::<AuthClaims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(JwtError::Decode)
}

#[cfg(test)]
mod tests {
    use super::{decode_token, encode_token};
    use crate::config::AppConfig;
    use uuid::Uuid;

    fn test_config() -> AppConfig {
        AppConfig {
            database_url: String::from("postgres://postgres:postgres@localhost:5432/test"),
            jwt_secret: String::from("super-secret-test-key"),
            jwt_expiry_hours: 24,
            bind_addr: String::from("127.0.0.1:8080"),
            rust_log: String::from("info"),
        }
    }

    #[test]
    fn encodes_and_decodes_tokens() {
        let config = test_config();
        let user_id = Uuid::new_v4();
        let token = encode_token(user_id, &config).expect("token should encode");

        let decoded = decode_token(&token, &config).expect("token should decode");

        assert_eq!(decoded.claims.sub, user_id);
        assert!(decoded.claims.exp > decoded.claims.iat);
    }
}
