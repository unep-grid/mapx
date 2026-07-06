# MapX search image ( Meilisearch )

Thin layer over the official `getmeili/meilisearch` image, adding the
MapX user / group convention and the `/data.ms` volume path.

Rarely updated : built + pushed manually ( not by CI ), then referenced
by tag from `docker-compose.yml` and deployments.

## Release

```sh
docker login
./build.sh              # build + push fredmoser/mapx_search:1.48.2 ( amd64 + arm64 )
./build.sh 1.49.0       # other version, must match an official vX.Y.Z tag
```

Then update the `search` service image tag in `docker-compose.yml`.

## Local test build ( single arch, no push )

```sh
docker build --load -t fredmoser/mapx_search:test .
```

## Notes

- Meilisearch >= 1.0 cannot open a `data.ms` created by v0.20 : use a
  fresh volume. Indexes are derived data, rebuilt from postgres by the
  api routines at boot ( `updateIndexesRoutine` ).
- `MEILI_MASTER_KEY` must be at least 16 bytes ( meilisearch >= 1.0 ).
