# lesterli-mytodo

Monorepo for a PostgreSQL-backed todo web app with a Rust backend and React frontend.

## Status

Issue `#1` establishes the repository structure and shared tooling only. Application code, environment wiring, database integration, Docker, and feature work are intentionally deferred to later issues.

## Repository Layout

```text
.
├── backend/
│   ├── clippy.toml
│   └── rustfmt.toml
├── frontend/
│   ├── .prettierrc.json
│   ├── eslint.config.js
│   └── package.json
├── .editorconfig
├── .gitignore
└── .plan
```

## Tooling Baseline

- `backend/`: Rust formatting and lint policy configuration for upcoming backend work.
- `frontend/`: ESLint and Prettier configuration plus npm scripts for frontend linting and formatting.
- Root files: shared editor behavior, repository ignores, and the cross-issue architecture plan.

## Conventions

- Persistent state will use PostgreSQL only.
- Backend runtime will target Rust with `sqlx`.
- Frontend runtime will target React with Vite in a later issue.

## Local Database Setup

1. Copy the example environment values and set `DATABASE_URL` for your local or remote PostgreSQL instance.
2. Install SQLx CLI with PostgreSQL support:
   `cargo install sqlx-cli --no-default-features --features postgres,rustls`
3. Run migrations from the backend workspace:
   `cd backend && sqlx migrate run`
4. Start the backend with the same `DATABASE_URL`; startup also applies embedded migrations from `backend/migrations/`.

## Next Steps

- Issue `#2`: bootstrap the Rust/Axum backend skeleton.
- Issue `#3`: bootstrap the React + Vite + Tailwind frontend skeleton.
- Issue `#4`: add environment variable handling and `.env.example`.
