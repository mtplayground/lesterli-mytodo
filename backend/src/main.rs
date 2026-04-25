use axum::{routing::get, Router};
use std::{env, error::Error, io, net::SocketAddr};
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod routes {
    pub mod health;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    init_tracing();

    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| String::from("0.0.0.0:8080"));
    let socket_addr = parse_bind_addr(&bind_addr)?;

    let app = Router::new()
        .route("/health", get(routes::health::health))
        .layer(ServiceBuilder::new());

    let listener = TcpListener::bind(socket_addr).await?;
    info!(%socket_addr, "backend listening");

    axum::serve(listener, app).await?;

    Ok(())
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("lesterli_mytodo_backend=info")),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

fn parse_bind_addr(bind_addr: &str) -> Result<SocketAddr, io::Error> {
    bind_addr.parse::<SocketAddr>().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("invalid BIND_ADDR `{bind_addr}`: {error}"),
        )
    })
}
