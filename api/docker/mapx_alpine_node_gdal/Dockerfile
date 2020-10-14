FROM node:12.19-alpine as builder

ARG GDAL_VERSION=v3.1.3
ARG LIBKML_VERSION=1.3.0

ARG GDAL_DEPS_DEV='\
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

ARG GDAL_DEPS_RUN='\
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

ARG DEPS_RUN='\
    postgresql-client\
    '

WORKDIR /build
#
# Download stuff
#
RUN wget -O libkml.tar.gz "https://github.com/libkml/libkml/archive/${LIBKML_VERSION}.tar.gz"
RUN wget -O gdal.tar.gz "https://github.com/OSGeo/gdal/archive/${GDAL_VERSION}.tar.gz"

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
  CXXFLAGS="-D__MUSL__ -Os" CFLAGS="-march=native -mtune=native -Os" LDFLAGS="-s" && \
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
    --without-gif && \
    #--enable-lto && \
  make && make install && \
  #
  # cleanup
  #
  apk del .build_dep && \
  cd / && \
  rm -rf /build && \
  rm -rf /var/cache/apk/*

FROM node:12.19-alpine as final

COPY --from=builder / /
 

