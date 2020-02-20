FROM node:8.15.1-alpine

ARG GDAL_VERSION=v2.4.0
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
    proj4-dev \
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
    proj4'
    
#
# Modified from https://github.com/petr-k/gdal-python-alpine
#
RUN \  
  echo "http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
  apk add --no-cache --virtual .build_dep $GDAL_DEPS_DEV && \
  apk add --no-cache $GDAL_DEPS_RUN && \
  #
  # Build
  #
  # issue with update-ca-certificates failing:
  # https://github.com/gliderlabs/docker-alpine/issues/30
  update-ca-certificates && \
  mkdir /build && \
  #
  # Libkml
  #
  cd /build && \
  wget -O libkml.tar.gz "https://github.com/libkml/libkml/archive/${LIBKML_VERSION}.tar.gz" && \
  tar --extract --file libkml.tar.gz && \
  cd libkml-${LIBKML_VERSION} && \
  mkdir build && \
  cd build && \
  cmake .. && \
  make && \
  make install && \
  #
  # gdal
  # see option in configure (https://raw.githubusercontent.com/OSGeo/gdal/master/gdal/configure)
  #
  cd /build && \
  wget -O gdal.tar.gz "https://github.com/OSGeo/gdal/archive/${GDAL_VERSION}.tar.gz" && \
  tar --extract --file gdal.tar.gz --strip-components 1 && \
  cd gdal && \
  CXXFLAGS="-D__MUSL__ -Os" CFLAGS="-march=native -mtune=native -Os" LDFLAGS="-s" && \
  ./configure --prefix=/usr \
    --with-libkml=yes \
    --with-geos=yes \
    --with-proj=yes \
    --with-threads=yes \
    --with-sqlite3=yes \
    --with-geotiff=yes \
    --with-libtiff=yes \
    --with-libz=yes \
    --without-bsb \
    --without-ingres \
    --without-pcidsk \
    --without-cfitsio \
    --without-cryptopp \
    --without-curl \
    --without-ecw \
    --without-fme \
    --without-freexl \
    --without-gif \
    --without-gnm \
    --without-grass \
    --without-grib \
    --without-hdf4 \
    --without-hdf5 \
    --without-idb \
    --without-jasper \
    --without-jp2mrsid \
    --without-jpeg \
    --without-kakadu \
    --without-libgrass \
    --without-libtool \
    --without-mrf \
    --without-mrsid \
    --without-mysql \
    --without-netcdf \
    --without-odbc \
    --without-ogdi \
    --without-openjpeg \
    --without-pcraster \
    --without-pcre \
    --without-perl \
    --without-png \
    --without-python \
    --without-qhull \
    --without-sde \
    --without-webp \
    --without-xerces \
  && make && make install && \
  #
  # cleanup
  #
  apk del .build_dep && \
  cd / && \
  rm -rf /build && \
  rm -rf /var/cache/apk/*


#
# Install dependencies
#
RUN \  
  echo "http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
  apk add --no-cache postgresql-client \
  rm -rf /var/cache/apk/*


