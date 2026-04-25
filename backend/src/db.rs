use crate::config::AppConfig;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub type DbPool = PgPool;

pub async fn connect(config: &AppConfig) -> Result<DbPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await
}

pub async fn migrate(pool: &DbPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
