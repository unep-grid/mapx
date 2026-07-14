#!/bin/bash
set -e

VERSION=${1:-"3.0-dev-mapx.1"}
# The pinned upstream image currently publishes an amd64 manifest only.
PLATFORMS=${2:-"linux/amd64"}
IMAGE="fredmoser/mapx_pycsw"

echo "Building + pushing $IMAGE:$VERSION for $PLATFORMS"

docker buildx build \
  --builder mx_builder \
  --platform "$PLATFORMS" \
  --progress plain \
  --tag "$IMAGE:$VERSION" \
  --push \
  .

echo "Pushed $IMAGE:$VERSION"
