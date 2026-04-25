use axum::{routing::get, Router};
use std::error::Error;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod config;
mod db;
mod auth {
    pub mod jwt;
    pub mod password;
}
mod models {
    pub mod user;
}
mod routes {
    pub mod health;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = config::AppConfig::from_env()?;
    init_tracing(&config.rust_log);

    let socket_addr = config.socket_addr()?;
    let db_pool = db::connect(&config).await?;
    db::migrate(&db_pool).await?;

    let app = Router::new()
        .route("/health", get(routes::health::health))
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
