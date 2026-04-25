use std::{env, error::Error, fmt, net::SocketAddr};

const DEFAULT_BIND_ADDR: &str = "0.0.0.0:8080";
const DEFAULT_JWT_EXPIRY_HOURS: u64 = 24;
const DEFAULT_RUST_LOG: &str = "lesterli_mytodo_backend=info";

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub bind_addr: String,
    pub rust_log: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        dotenvy::dotenv().ok();

        Ok(Self {
            database_url: required_var("DATABASE_URL")?,
            jwt_secret: required_var("JWT_SECRET")?,
            jwt_expiry_hours: optional_u64("JWT_EXPIRY_HOURS", DEFAULT_JWT_EXPIRY_HOURS)?,
            bind_addr: optional_var("BIND_ADDR", DEFAULT_BIND_ADDR)?,
            rust_log: optional_var("RUST_LOG", DEFAULT_RUST_LOG)?,
        })
    }

    pub fn socket_addr(&self) -> Result<SocketAddr, ConfigError> {
        self.bind_addr
            .parse::<SocketAddr>()
            .map_err(|error| ConfigError::invalid_var("BIND_ADDR", error.to_string()))
    }
}

#[derive(Debug)]
pub enum ConfigError {
    MissingVar(&'static str),
    InvalidVar {
        name: &'static str,
        value: String,
        reason: String,
    },
}

impl ConfigError {
    fn invalid_var(name: &'static str, reason: String) -> Self {
        let value = env::var(name).unwrap_or_default();
        Self::InvalidVar {
            name,
            value,
            reason,
        }
    }
}

impl fmt::Display for ConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingVar(name) => write!(formatter, "missing required environment variable `{name}`"),
            Self::InvalidVar { name, value, reason } => write!(
                formatter,
                "invalid environment variable `{name}` with value `{value}`: {reason}"
            ),
        }
    }
}

impl Error for ConfigError {}

fn required_var(name: &'static str) -> Result<String, ConfigError> {
    env::var(name).map_err(|_| ConfigError::MissingVar(name))
}

fn optional_var(name: &'static str, default: &'static str) -> Result<String, ConfigError> {
    match env::var(name) {
        Ok(value) if !value.trim().is_empty() => Ok(value),
        Ok(_) => Err(ConfigError::invalid_var(
            name,
            String::from("value cannot be empty"),
        )),
        Err(env::VarError::NotPresent) => Ok(String::from(default)),
        Err(error) => Err(ConfigError::invalid_var(name, error.to_string())),
    }
}

fn optional_u64(name: &'static str, default: u64) -> Result<u64, ConfigError> {
    match env::var(name) {
        Ok(value) if value.trim().is_empty() => Err(ConfigError::invalid_var(
            name,
            String::from("value cannot be empty"),
        )),
        Ok(value) => value
            .parse::<u64>()
            .map_err(|error| ConfigError::invalid_var(name, error.to_string())),
        Err(env::VarError::NotPresent) => Ok(default),
        Err(error) => Err(ConfigError::invalid_var(name, error.to_string())),
    }
}
