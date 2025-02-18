#!/bin/bash
set -e

VERSION=${1:-"2.22.2"}

echo "Building geoserver image with version: $VERSION"

docker build \
  --progress plain \
  --build-arg GEOSERVER_VERSION=$VERSION \
  --tag fredmoser/mapx_geoserver:$VERSION \
  .

echo "Build complete. Image: fredmoser/mapx_geoserver:$VERSION"
