#!/bin/bash
set -e

VERSION=${1:-"2.28.4"}
PLATFORMS=${2:-"linux/amd64,linux/arm64"}
IMAGE="fredmoser/mapx_geoserver"

# Multi-arch manifest lists cannot be loaded into the local docker
# daemon : the image is built + pushed to the registry ( docker login
# first ), then referenced by tag in docker-compose.yml / deployments.
echo "Building + pushing $IMAGE:$VERSION for $PLATFORMS"

docker buildx build \
  --builder mx_builder \
  --platform $PLATFORMS \
  --progress plain \
  --build-arg GEOSERVER_VERSION=$VERSION \
  --tag $IMAGE:$VERSION \
  --push \
  .

echo "Pushed $IMAGE:$VERSION"
