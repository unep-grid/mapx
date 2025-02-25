#!/bin/bash
set -e

VERSION=${1:-"2.22.2"}
PLATFORMS=${2:-"linux/amd64,linux/arm64"}

echo "Building geoserver image with version: $VERSION for platforms: $PLATFORMS"

# Build and push the image using the existing mx_builder
docker buildx build \
  --builder mx_builder \
  --platform $PLATFORMS \
  --progress plain \
  --build-arg GEOSERVER_VERSION=$VERSION \
  --tag fredmoser/mapx_geoserver:$VERSION \
  --load \
  .

echo "Build complete. Image: fredmoser/mapx_geoserver:$VERSION"
