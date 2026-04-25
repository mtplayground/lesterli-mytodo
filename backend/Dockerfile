FROM rust:1.85-slim-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release --locked

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser

WORKDIR /app

COPY --from=builder /app/target/release/lesterli-mytodo-backend /usr/local/bin/lesterli-mytodo-backend

ENV BIND_ADDR=0.0.0.0:8080

EXPOSE 8080

USER appuser

CMD ["lesterli-mytodo-backend"]
