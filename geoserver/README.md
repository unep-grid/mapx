# MapX geoserver image

Custom GeoServer image for MapX.

Rarely updated : built + pushed manually or through the support services
workflow, then referenced by tag from `docker-compose.yml` and deployments.

## Release

```sh
docker login
./build.sh              # build + push fredmoser/mapx_geoserver:2.28.4 ( amd64 + arm64 )
./build.sh 2.28.4       # explicit version
```

Then update the `geoserver` service image tag in `docker-compose.yml`.

## Local test build ( single arch, no push )

```sh
docker build --load -t fredmoser/mapx_geoserver:test .
```
