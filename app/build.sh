#!/bin/bash
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG=${1:-local}  # Default to 'local' instead of VERSION

echo "Building app image with tag: $TAG"

docker build \
  --progress plain \
  --tag fredmoser/mapx_app:$TAG \
  --load \
  .

echo "Build complete. Image: fredmoser/mapx_app:$TAG"
