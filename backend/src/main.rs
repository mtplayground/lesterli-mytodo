use lesterli_mytodo_backend::{build_app, build_state, config, db};
use std::error::Error;
use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = config::AppConfig::from_env()?;
    init_tracing(&config.rust_log);

    let socket_addr = config.socket_addr()?;
    let state = build_state(config.clone()).await?;
    db::migrate(&state.db_pool).await?;
    let app = build_app(state);

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
