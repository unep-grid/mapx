# MapX pycsw image

Thin layer over the pinned `geopython/pycsw` image. It packages the MapX
configuration, repository mappings and catalogue templates so deployments do
not require ConfigMaps or volume mounts for those files.

Runtime settings and PostgreSQL credentials remain environment variables and
are not included in the image.

## Release

```sh
docker login
./build.sh                         # fredmoser/mapx_pycsw:3.0-dev-mapx.1
./build.sh 3.0-dev-mapx.2          # next MapX packaging revision
```

Then update the pycsw image tag in `docker-compose.yml` and the Helm chart.

The pinned upstream digest currently contains a `linux/amd64` image rather
than a multi-architecture manifest. Do not publish an arm64 variant from that
digest: use a multi-architecture upstream image first.

## Local test build

```sh
docker build --platform linux/amd64 --load \
  -t fredmoser/mapx_pycsw:test .
```

The bind mounts in `docker-compose.yml` intentionally override the packaged
files during development, allowing templates and mappings to be changed
without rebuilding the image. Helm deployments should use the packaged files
and require no corresponding volumes.

## Runtime configuration

The image expects these environment variables:

- `PYCSW_PUBLIC_URL`
- `PYCSW_TABLE`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER_READ`
- `POSTGRES_USER_READ_PASSWORD`
