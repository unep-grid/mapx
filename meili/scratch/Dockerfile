ARG VERSION=0.20.0
ARG REPO=https://github.com/meilisearch/MeiliSearch/archive/refs/tags/
FROM rust:1.51.0 AS build
ARG VERSION
ARG REPO
RUN rustup target add x86_64-unknown-linux-musl
RUN apt update && apt install -y musl-tools
WORKDIR /build
WORKDIR /build/meilisearch
RUN curl -L ${REPO}/v${VERSION}.tar.gz | tar xzv
WORKDIR MeiliSearch-${VERSION}
RUN echo "1" && cargo build --release --target x86_64-unknown-linux-musl
RUN cargo build --release 
RUN mkdir -p /built
RUN cp target/x86_64-unknown-linux-musl/release/meilisearch /built/
FROM scratch
COPY --from=build /built/meilisearch .
ENV MEILI_HTTP_ADDR 0.0.0.0:7700
EXPOSE 7700/tcp
USER 1000
CMD ["./meilisearch"]
