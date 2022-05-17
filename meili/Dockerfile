# Compile
FROM rust:alpine3.14 AS compiler

RUN apk add -q --update-cache --no-cache build-base openssl-dev curl

ARG VERSION=0.20.0
ARG REPO=https://github.com/meilisearch/MeiliSearch/archive/refs/tags/

ENV RUSTFLAGS="-C target-feature=-crt-static"

WORKDIR /build
RUN curl -L ${REPO}/v${VERSION}.tar.gz | tar xzv
WORKDIR /build/meilisearch-${VERSION}

RUN set -eux; \
    apkArch="$(apk --print-arch)"; \
    if [ "$apkArch" = "aarch64" ]; then \
        export JEMALLOC_SYS_WITH_LG_PAGE=16; \
    fi && \
    cargo build --release

# Run
FROM alpine:3.14

ENV MEILI_HTTP_ADDR 0.0.0.0:7700
ENV MEILI_SERVER_PROVIDER docker

ARG VERSION=0.20.0

RUN apk update --quiet \
    && apk add -q --no-cache libgcc tini curl

COPY --from=compiler /build/meilisearch-${VERSION}/target/release/meilisearch .

#--------------------- Debian / alpine user setting ----------------------------
ENV USER=meili
ENV GROUP=mapx
ENV GID=89129
ENV DATADIR=/data.ms 

RUN addgroup \
    --system \
     $GROUP &&\
    adduser \
     --system \
     --disabled-password \
     --gecos ""\
     --ingroup $GROUP \
     --no-create-home \
     --uid $GID $USER 

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR 

USER $USER 
VOLUME $DATADIR
#-------------------------------------------------------------------------------

EXPOSE 7700/tcp
ENTRYPOINT ["tini", "--"]
CMD ./meilisearch
