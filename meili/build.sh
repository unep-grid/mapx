#!/bin/bash
set -e

VERSION=${1:-"0.20.0"}
PLATFORMS=${2:-"linux/amd64,linux/arm64"}

echo "Building search image with version: $VERSION for platforms: $PLATFORMS"

# Build and push the image using the existing mx_builder
docker buildx build \
  --builder mx_builder \
  --platform $PLATFORMS \
  --progress plain \
  --build-arg VERSION=$VERSION \
  --tag fredmoser/mapx_search:$VERSION \
  --load \
  .

echo "Build complete. Image: fredmoser/mapx_search:$VERSION"
