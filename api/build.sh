#!/bin/bash
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG=${1:-$VERSION}

echo "Building api image with tag: $TAG"

docker build \
  --progress plain \
  --tag fredmoser/mapx_api:$TAG \
  .

echo "Build complete. Image: fredmoser/mapx_api:$TAG"
