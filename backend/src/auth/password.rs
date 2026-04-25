use argon2::{
    password_hash::{
        rand_core::OsRng, Error as PasswordHashError, PasswordHash, PasswordHasher,
        PasswordVerifier, SaltString,
    },
    Argon2,
};
use std::{error::Error, fmt};

#[derive(Debug)]
pub enum PasswordError {
    Hash(PasswordHashError),
}

impl fmt::Display for PasswordError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Hash(error) => write!(formatter, "password hashing failed: {error}"),
        }
    }
}

impl Error for PasswordError {}

impl From<PasswordHashError> for PasswordError {
    fn from(error: PasswordHashError) -> Self {
        Self::Hash(error)
    }
}

pub fn hash_password(password: &str) -> Result<String, PasswordError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    Ok(argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string())
}

pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, PasswordError> {
    let parsed_hash = PasswordHash::new(password_hash)?;
    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(PasswordHashError::Password) => Ok(false),
        Err(error) => Err(error.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::{hash_password, verify_password};

    #[test]
    fn hashes_and_verifies_passwords() {
        let password = "correct horse battery staple";
        let hash = hash_password(password).expect("password should hash");

        let matches = verify_password(password, &hash).expect("password should verify");

        assert!(matches);
    }

    #[test]
    fn rejects_invalid_passwords() {
        let hash = hash_password("expected").expect("password should hash");

        let matches = verify_password("unexpected", &hash).expect("password should verify");

        assert!(!matches);
    }
}
