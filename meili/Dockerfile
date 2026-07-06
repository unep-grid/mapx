#
# Thin layer over the official Meilisearch image (multi-arch amd64/arm64).
# Adds the MapX user/group convention and keeps the historical /data.ms
# volume path (official image defaults to /meili_data).
#
# ⚠️  Meilisearch >= 1.0 cannot open a data.ms created by v0.20:
# use a fresh volume; indexes are derived data, rebuilt by the api
# routines at boot ("updateIndexesRoutine").
#
ARG VERSION=1.48.2
FROM getmeili/meilisearch:v${VERSION}

ENV MEILI_HTTP_ADDR=0.0.0.0:7700
ENV MEILI_SERVER_PROVIDER=docker
ENV MEILI_NO_ANALYTICS=true
ENV MEILI_DB_PATH=/data.ms
# Dump / snapshot dirs default to the (root-owned) workdir: keep them
# in the data volume so they are writable and persisted.
ENV MEILI_DUMP_DIR=/data.ms/dumps
ENV MEILI_SNAPSHOT_DIR=/data.ms/snapshots

#--------------------- Debian / alpine user setting ----------------------------
ENV USER=meili
ENV GROUP=mapx
ENV UID=89129
ENV GID=101
ENV DATADIR=/data.ms

RUN addgroup \
    --system \
    --gid $GID\
     $GROUP &&\
    adduser \
     --system \
     --disabled-password \
     --gecos ""\
     --ingroup $GROUP \
     --no-create-home \
     --uid $UID $USER

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR /meili_data

USER $USER
VOLUME $DATADIR
#-------------------------------------------------------------------------------

EXPOSE 7700/tcp
ENTRYPOINT ["tini", "--"]
CMD ["/bin/meilisearch"]
