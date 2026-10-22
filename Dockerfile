FROM rust:1.98.0-bookworm@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922 AS chef

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-chef --locked --version 0.1.74 \
    && cargo install dioxus-cli --locked --version 0.7.3 \
    && rustup target add wasm32-unknown-unknown

WORKDIR /app

FROM chef AS planner

COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder

COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --features server --recipe-path recipe.json
RUN cargo chef cook --release --target wasm32-unknown-unknown --recipe-path recipe.json

COPY . .

# Avoid debug info in release wasm builds; wasm-opt on the bundled binaryen build
# crashes on this project when DWARF sections are present.
ENV CARGO_PROFILE_RELEASE_DEBUG=0

RUN cargo build --locked --release --features server --bin notes-supply-site-server
RUN dx build --platform web --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/notes-supply-site-server /usr/local/bin/notes-supply-site-server
COPY --from=builder /app/target/dx/notes-supply-site/release/web/public /app/public

ENV NOTES_SUPPLY_SITE_BIND_ADDR=0.0.0.0:4000
ENV NOTES_SUPPLY_SITE_WEB_ROOT=/app/public

EXPOSE 4000

USER 65532:65532

CMD ["notes-supply-site-server"]
