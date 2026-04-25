use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower::ServiceBuilder;

#[derive(Clone)]
pub struct AppState {
    pub config: config::AppConfig,
    pub db_pool: db::DbPool,
}

pub mod config;
pub mod db;
pub mod error;
pub mod auth {
    pub mod extractor;
    pub mod jwt;
    pub mod middleware;
    pub mod password;
}
pub mod models {
    pub mod todo;
    pub mod user;
}
pub mod repo {
    pub mod todos;
}
pub mod routes {
    pub mod auth;
    pub mod health;
    pub mod me;
    pub mod todos;
}
pub mod services {
    pub mod auth;
    pub mod todos;
}

pub fn build_app(state: AppState) -> Router {
    let protected_api_routes = Router::new()
        .route(
            "/api/todos",
            post(routes::todos::create_todo).get(routes::todos::list_todos),
        )
        .route("/api/me", get(routes::me::get_me))
        .route("/api/me/password", post(routes::me::change_password))
        .route(
            "/api/todos/{id}",
            get(routes::todos::get_todo)
                .put(routes::todos::update_todo)
                .delete(routes::todos::delete_todo),
        )
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth::middleware::require_auth,
        ));

    Router::new()
        .route("/health", get(routes::health::health))
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login))
        .merge(protected_api_routes)
        .with_state(state)
        .layer(ServiceBuilder::new())
}

pub async fn build_state(config: config::AppConfig) -> Result<AppState, sqlx::Error> {
    let db_pool = db::connect(&config).await?;

    Ok(AppState { config, db_pool })
}
