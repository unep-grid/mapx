ARG GDAL_VERSION=3.1.4
ARG LIBKML_VERSION=1.3.0
ARG NODE_VERSION=16.15.0
ARG ALPINE_VERSION=3.15

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} as builder

ARG GDAL_VERSION
ARG LIBKML_VERSION

ENV GDAL_DEPS_DEV='\
    # common certificates for https
    libressl ca-certificates \
    # base compile
    build-base cmake musl-dev linux-headers tar \
    # kml deps see https://github.com/boundlessgeo/alpine-pkg-b7s/blob/master/libkml/APKBUILD
    cmake \
    boost-dev \
    expat-dev \
    minizip-dev \
    uriparser-dev \
    zlib-dev \
    # gdal deps see https://github.com/boundlessgeo/alpine-pkg-b7s/blob/master/gdal/APKBUILD
    linux-headers \
    curl-dev \
    expat-dev \
    geos-dev \
    proj-dev \
    libxml2-dev \
    postgresql-dev \
    libxslt-dev \
    sqlite-dev \
    tiff-dev \
    zlib-dev'

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
  tar --extract --file gdal.tar.gz --strip-components 1 && \
  cd gdal && \
  CXXFLAGS="-D__MUSL__ -O1" CFLAGS="-O1" LDFLAGS="-s" && \
  ./configure \
    --prefix=/usr \
    --without-libtool \
    --with-hide-internal-symbols \
    --with-geos=yes \
    --with-proj=yes \
    --with-threads=yes \
    --with-sqlite3=yes \
    --with-pg=yes \
    --with-libkml=yes \
    --with-libz=internal \
    --with-libtiff=internal --with-rename-internal-libtiff-symbols \
    --with-geotiff=internal --with-rename-internal-libgeotiff-symbols \
    --disable-all-optional-drivers \
    --enable-driver-shape \
    --enable-driver-gpkg \
    --enable-driver-dxf \
    --enable-driver-gml \
    --enable-driver-gpx \
    --enable-driver-csv \
    --enable-driver-pgdump \
    --without-jpeg12 \
    --without-pcraster \
    --without-pcidsk \
    --without-lerc \
    --without-gnm \
    --without-gif \
    --with-png=no && \
    #--enable-lto && \
  make -j1 && make install && \
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
