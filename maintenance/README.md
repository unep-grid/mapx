# MapX maintenance page

Standalone maintenance page for MapX, published as
`fredmoser/mapx_maintenance:<version>`.

## Runtime configuration

The image reads these environment variables when it serves `/config.json`:

```env
MAINTENANCE_END=2026-08-27T18:00:00+02:00
MAPTILER_TOKEN=your-token
```

`MAINTENANCE_END` is displayed in UTC in each of the six official UN
languages. If `MAPTILER_TOKEN` is empty, the page displays the message without
the decorative globe.

Kubernetes environment variables are fixed for the lifetime of a pod. Roll
out or restart the maintenance deployment after changing either value; the
image itself does not need to be rebuilt or pushed.

## Local development

```sh
npm install
MAINTENANCE_END=2026-08-27T18:00:00+02:00 \
MAPTILER_TOKEN=your-token \
npm run dev
```

The Vite development server proxies `/config.json` only in the production
server, so use the production server to test runtime configuration:

```sh
npm run build
MAINTENANCE_END=2026-08-27T18:00:00+02:00 \
MAPTILER_TOKEN=your-token \
npm start
```

The server listens on port `8080` by default and exposes `/healthz`.

## Docker

```sh
docker build -t fredmoser/mapx_maintenance:0.1.0 .
docker run --rm -p 8080:8080 \
  -e MAINTENANCE_END=2026-08-27T18:00:00+02:00 \
  -e MAPTILER_TOKEN=your-token \
  fredmoser/mapx_maintenance:0.1.0
```
