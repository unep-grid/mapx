ARG VERSION=0.20.0
ARG REPO=https://github.com/meilisearch/MeiliSearch/archive/refs/tags/
FROM rust:1.51.0 AS build
ARG VERSION
ARG REPO
WORKDIR /build
WORKDIR /build/meilisearch
RUN curl -L ${REPO}/v${VERSION}.tar.gz | tar xzv
WORKDIR MeiliSearch-${VERSION}
RUN cargo build --release 
RUN mkdir -p /built
RUN cp target/release/meilisearch /built/
FROM bitnami/minideb:jessie
COPY --from=build /built/meilisearch .
ENV MEILI_HTTP_ADDR 0.0.0.0:7700
EXPOSE 7700/tcp
USER 1000
CMD ["./meilisearch"]
