# lesterli-mytodo

PostgreSQL-backed todo application with an Axum backend and a React/Vite frontend.

## Stack

- Backend: Rust, Axum, SQLx, PostgreSQL, JWT auth
- Frontend: React, Vite, Tailwind, TanStack Query, Zustand
- Containers: Docker Compose with `postgres`, `backend`, and `frontend`

## Repository Layout

```text
.
├── backend/
│   ├── migrations/
│   ├── src/
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Environment Variables

Copy the root example file before running the stack:

```bash
cp .env.example .env
```

Root `.env` values used by the project:

- `DATABASE_URL`: backend PostgreSQL connection string
- `JWT_SECRET`: signing key for auth tokens
- `JWT_EXPIRY_HOURS`: JWT lifetime in hours
- `BIND_ADDR`: backend listen address, default `0.0.0.0:8080`
- `RUST_LOG`: backend log filter
- `VITE_API_BASE_URL`: frontend API base URL used at build time
- `POSTGRES_DB`: Compose Postgres database name
- `POSTGRES_USER`: Compose Postgres user
- `POSTGRES_PASSWORD`: Compose Postgres password

For local frontend-only work, `frontend/.env.example` is also available.

## Docker Compose

### Prerequisites

- Docker
- Docker Compose v2

### Start The Full Stack

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend health endpoint: `http://localhost:8081/health`
- PostgreSQL: `localhost:5432`

Notes:

- The backend waits for PostgreSQL and applies embedded SQLx migrations on startup.
- The frontend image is built with `VITE_API_BASE_URL`; the default Compose value points at `http://localhost:8081`.

### Stop The Stack

```bash
docker compose down
```

To remove the Postgres volume as well:

```bash
docker compose down -v
```

### Useful Compose Commands

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose ps
```

## Local Development

### Backend

```bash
cp .env.example .env
export $(grep -v '^#' .env | xargs)
cd backend
cargo build --release
cargo run
```

The backend listens on `0.0.0.0:8080` by default.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

## First-Run Migration Command

If you want to run migrations manually outside Compose:

```bash
cp .env.example .env
export $(grep -v '^#' .env | xargs)
cd backend
cargo install sqlx-cli --no-default-features --features postgres,rustls
sqlx migrate run
```

The backend also runs embedded migrations automatically during startup, so Compose users do not need a separate migration step.

## Seeding The App

There is no dedicated seed script. Use either the UI flow or the API.

### Seed Through The UI

1. Start the stack with `docker compose up --build`.
2. Open `http://localhost:8080`.
3. Register a user.
4. Create one or more todos from the `/todos` page.

### Seed Through The API

Register a user:

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@example.com",
    "password": "Password123!"
  }'
```

Create a todo with the returned token:

```bash
curl -X POST http://localhost:8081/api/todos \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <JWT>' \
  -d '{
    "title": "Ship deployment docs",
    "description": "Verified manually after boot"
  }'
```

## Verification Checklist

After `docker compose up --build`, verify:

- `http://localhost:8081/health` returns `{"status":"ok"}`
- `http://localhost:8080` loads the frontend
- Registration and login succeed
- Creating, editing, filtering, and deleting todos succeed
- Profile page loads and password change works
