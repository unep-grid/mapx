#!/bin/bash
set -e

VERSION=${1:-"0.20.0"}

echo "Building search image with version: $VERSION"

docker build \
  --progress plain \
  --build-arg VERSION=$VERSION \
  --tag fredmoser/mapx_search:$VERSION \
  .

echo "Build complete. Image: fredmoser/mapx_search:$VERSION"
