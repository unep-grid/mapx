ARG GDAL_VERSION=3.6.4
ARG LIBKML_VERSION=1.3.0
ARG NODE_VERSION=22.14.0
ARG ALPINE_VERSION=3.21

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} as builder

ARG GDAL_VERSION
ARG LIBKML_VERSION

ENV GDAL_DEPS_DEV='\
    build-base \
    cmake \
    musl-dev \
    linux-headers \
    postgresql-dev \
    sqlite-dev \
    libxml2-dev \
    proj-dev \
    geos-dev \
    expat-dev \
    minizip-dev \
    uriparser-dev \
    zlib-dev \
    ca-certificates'

ENV GDAL_DEPS_RUN='\
    # kml deps
    expat \
    minizip \
    uriparser \
    zlib \
    # gdal deps
    curl \
    expat \
    geos \
    libpq \
    libxml2 \
    libxslt \
    sqlite-libs \
    tiff \
    zlib \
    proj\
    '

ENV DEPS_RUN='\
    postgresql-client\
    '

WORKDIR /build
#
# Download stuff
#
RUN wget -O libkml.tar.gz "https://github.com/libkml/libkml/archive/${LIBKML_VERSION}.tar.gz"
RUN wget -O gdal.tar.gz "https://github.com/OSGeo/gdal/archive/v${GDAL_VERSION}.tar.gz"

#
# GDAL
#
RUN \  
  echo "http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
  apk add --no-cache --virtual .build_dep $GDAL_DEPS_DEV && \
  apk add --no-cache $GDAL_DEPS_RUN && \
  apk add --no-cache $DEPS_RUN && \
  # https://github.com/gliderlabs/docker-alpine/issues/30
  # issue with update-ca-certificates failing:
  update-ca-certificates && \
  #
  # Build KML
  # 
  tar --extract --file libkml.tar.gz && \
  cd libkml-${LIBKML_VERSION} && \
  mkdir buildkml && \
  cd buildkml && \
  cmake .. && \
  make && \
  make install && \
  #
  # gdal
  # see option in configure (https://raw.githubusercontent.com/OSGeo/gdal/master/gdal/configure)
  #
  cd /build && \
  tar --extract --file gdal.tar.gz && \
  cd gdal-${GDAL_VERSION} && \
  mkdir build && \
  cd build && \
  cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr \
    -DCMAKE_CXX_FLAGS="-D__MUSL__ -O1 -fPIC -pipe -fpermissive" \
    -DCMAKE_C_FLAGS="-O1 -fPIC -pipe" \
    -DGDAL_BUILD_OPTIONAL_DRIVERS=OFF \
    -DGDAL_ENABLE_DRIVER_SHAPE=ON \
    -DGDAL_ENABLE_DRIVER_GPKG=ON \
    -DGDAL_ENABLE_DRIVER_GML=ON \
    -DGDAL_ENABLE_DRIVER_GPX=ON \
    -DGDAL_ENABLE_DRIVER_CSV=ON \
    -DGDAL_ENABLE_DRIVER_PGDUMP=ON \
    -DBUILD_PYTHON_BINDINGS=OFF \
    -DBUILD_DOCS=OFF \
    -DBUILD_TESTING=OFF \
    -DGDAL_USE_INTERNAL_LIBS=ON \
    -DGDAL_USE_JPEG=OFF \
    -DGDAL_USE_PNG=OFF \
    -DGDAL_USE_GIF=OFF && \
  cmake --build . -j1 && \
  cmake --build . --target install && \
  #
  # cleanup
  #
  apk del .build_dep && \
  cd / && \
  rm -rf /build && \
  rm -rf /var/cache/apk/*

FROM scratch as final
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production

COPY --from=builder / /

WORKDIR /api

COPY . .

#
# If no dev dependencies required, build node_modules here,
# 
RUN npm install --production && \
    rm package-lock.json 

#--------------------- Debian / alpine user setting ----------------------------
ENV USER=api
ENV GROUP=mapx
ENV UID=12345
ENV GID=101
ENV DATADIR=/shared 

RUN addgroup \
    --system \
    --gid $GID \
     $GROUP &&\
    adduser \
     --system \
     --disabled-password \
     --gecos ""\
     --ingroup $GROUP \
     --no-create-home \
     --uid $UID \
     $USER 

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR 
USER $USER 
VOLUME $DATADIR 
#-------------------------------------------------------------------------------

EXPOSE 3030

CMD ["node", "index.js"]
