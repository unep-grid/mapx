# MapX maintenance page

Standalone maintenance page with messages in the six official UN languages
and an optional globe. Published as `fredmoser/mapx_maintenance:<version>`.

## Local preview

Add `127.0.0.1 maintenance.mapx.localhost` to `/etc/hosts`, then run from the
repository root:

```sh
npm run start:maintenance
```

Open <http://maintenance.mapx.localhost:8880/>. The command runs
`docker compose up -d --build maintenance`, starting maintenance and Traefik.
It uses the built frontend and loads settings from `mapx.dev.env`.

Rerun the command after changing source files or settings. Compose rebuilds
the image and recreates the container as needed. To stop just maintenance:

```sh
docker compose stop maintenance
```

## Settings

| Variable | Behavior |
| --- | --- |
| `MAINTENANCE_END` | Optional ISO date with timezone, displayed in UTC. Missing or invalid dates show “date to be announced”. |
| `MAPTILER_TOKEN` | Optional browser token for the decorative globe. Empty values disable it. |
| `MAINTENANCE_API_HOST_PREFIX` | Hosts starting with this prefix receive JSON `503` responses. Defaults to `api.` when missing or blank. |
| `PORT` | Standalone server port; defaults to `8080`. Compose fixes it at `8080` behind Traefik. |

Configuration is read at server startup. Express serves the public date and
token through `/config.json`; neither is embedded in the frontend build.
Fallback messages appear immediately if configuration is unavailable.

In production, supply settings through the container environment and recreate
containers or roll out pods after changes. Configuration changes do not require
rebuilding the image.

## Server behavior

- App hosts receive the maintenance page. API hosts receive JSON `503` responses
  for every path and method, except `/healthz`. Future maintenance dates add a
  `Retry-After` header.
- `/healthz` returns `200` for health checks.
- `/service-worker.js` replaces the app's old worker with one that clears caches,
  reloads its windows, and unregisters itself.
- The local preview has its own hostname; existing app and API routes stay in place.

## Frontend development

For hot reload, run from `maintenance/`:

```sh
npm ci
npm run dev
```

Open <http://localhost:8080/>. This mode reads `maintenance/.env`; shell values
take precedence, including empty values. It does not load the root
`mapx.dev.env` automatically. Restart after changing settings.
Express owns the runtime routes in both modes; Vite provides development assets.

Also from `maintenance/`:

- `npm test`: production build and regression tests.
- `npm run build && npm start`: serve the production build using shell settings.
- `docker build -t fredmoser/mapx_maintenance:local .`: build the standalone image.
