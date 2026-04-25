use axum::{
    routing::{get, post},
    Router,
};
use std::error::Error;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[derive(Clone)]
pub struct AppState {
    pub config: config::AppConfig,
    pub db_pool: db::DbPool,
}

mod config;
mod db;
mod error;
mod auth {
    pub mod extractor;
    pub mod jwt;
    pub mod middleware;
    pub mod password;
}
mod models {
    pub mod todo;
    pub mod user;
}
mod services {
    pub mod auth;
}
mod routes {
    pub mod auth;
    pub mod health;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = config::AppConfig::from_env()?;
    init_tracing(&config.rust_log);

    let socket_addr = config.socket_addr()?;
    let db_pool = db::connect(&config).await?;
    db::migrate(&db_pool).await?;
    let state = AppState {
        config: config.clone(),
        db_pool: db_pool.clone(),
    };

    let app = Router::new()
        .route("/health", get(routes::health::health))
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login))
        .with_state(state)
        .layer(ServiceBuilder::new());

    let listener = TcpListener::bind(socket_addr).await?;
    info!(
        %socket_addr,
        database_ready = true,
        jwt_expiry_hours = config.jwt_expiry_hours,
        has_database_url = !config.database_url.is_empty(),
        has_jwt_secret = !config.jwt_secret.is_empty(),
        "backend listening"
    );

    axum::serve(listener, app).await?;

    Ok(())
}

fn init_tracing(rust_log: &str) {
    tracing_subscriber::registry()
        .with(EnvFilter::new(rust_log))
        .with(tracing_subscriber::fmt::layer())
        .init();
}
