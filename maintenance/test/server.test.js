import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { after, before, test } from "node:test";

import { resolveConfiguration } from "../configuration.js";
import { createMaintenanceServer } from "../server.js";

const environment = {};
let server;
let baseUrl;

before(async () => {
  environment.MAINTENANCE_END = "2099-08-27T18:00:00+02:00";
  environment.MAPTILER_TOKEN = "test-token";
  server = createMaintenanceServer({
    configuration: resolveConfiguration(environment),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  delete environment.MAINTENANCE_END;
  delete environment.MAPTILER_TOKEN;
  await new Promise((resolve, reject) =>
    server?.listening
      ? server.close((error) => (error ? reject(error) : resolve()))
      : resolve(),
  );
});

test("reports a healthy server", async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok\n");
});

test("serves runtime configuration without caching", async () => {
  const response = await fetch(`${baseUrl}/config.json`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    maintenanceEnd: "2099-08-27T18:00:00+02:00",
    mapTilerToken: "test-token",
  });
});

test("ignores malformed Host headers without crashing", async () => {
  const statusCode = await new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port: server.address().port,
        path: "/healthz",
        headers: { Host: "[" },
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.end();
  });

  assert.equal(statusCode, 200);
  assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200);
});

test("only caches fingerprinted build assets immutably", async () => {
  const indexResponse = await fetch(`${baseUrl}/index.html`);
  const indexHtml = await indexResponse.text();
  assert.equal(indexResponse.headers.get("cache-control"), "no-store");

  const logoResponse = await fetch(`${baseUrl}/map-x-logo-full.svg`);
  assert.equal(logoResponse.headers.get("cache-control"), "no-store");

  const assetPath = indexHtml.match(/(?:src|href)="(\/assets\/[^"]+)"/)?.[1];
  assert.ok(
    assetPath,
    "the built index should reference a fingerprinted asset",
  );

  const assetResponse = await fetch(`${baseUrl}${assetPath}`);
  assert.equal(
    assetResponse.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
});

test("serves the service worker kill switch on the app host", async () => {
  const response = await fetch(`${baseUrl}/service-worker.js`);
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "text/javascript; charset=utf-8",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("service-worker-allowed"), "/");

  const body = await response.text();
  assert.equal(
    body,
    await readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
  );
});

function requestWithHost({ port, host, path, method = "GET" }) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: { Host: host },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

test("returns a JSON 503 for API host requests", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "api.mapx.example.com",
    path: "/",
  });

  assert.equal(response.statusCode, 503);
  assert.equal(
    response.headers["content-type"],
    "application/json; charset=utf-8",
  );
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(JSON.parse(response.body), {
    error: "MapX is temporarily unavailable for scheduled maintenance.",
    retry: "2099-08-27T18:00:00+02:00",
  });
  assert.ok(Number(response.headers["retry-after"]) > 0);
});

test("returns a JSON 503 for API host requests regardless of path", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "api.mapx.example.com",
    path: "/v1/projects/42",
  });

  assert.equal(response.statusCode, 503);
  assert.equal(
    response.headers["content-type"],
    "application/json; charset=utf-8",
  );
  assert.ok(JSON.parse(response.body).error);
});

test("returns a JSON 503 for non-GET methods on the API host", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "api.mapx.example.com",
    path: "/",
    method: "POST",
  });

  assert.equal(response.statusCode, 503);
  assert.ok(JSON.parse(response.body).error);
});

test("keeps /healthz unconditional on the API host", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "api.mapx.example.com",
    path: "/healthz",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "ok\n");
});

test("does not special-case the service worker path on the API host", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "api.mapx.example.com",
    path: "/service-worker.js",
  });

  assert.equal(response.statusCode, 503);
  assert.equal(
    response.headers["content-type"],
    "application/json; charset=utf-8",
  );
});

test("omits retry when MAINTENANCE_END is unset", async () => {
  delete environment.MAINTENANCE_END;
  await restartServer();
  try {
    const response = await requestWithHost({
      port: server.address().port,
      host: "api.mapx.example.com",
      path: "/",
    });

    assert.equal(JSON.parse(response.body).retry, null);
    assert.equal(response.headers["retry-after"], undefined);
  } finally {
    environment.MAINTENANCE_END = "2099-08-27T18:00:00+02:00";
    await restartServer();
  }
});

test("omits Retry-After when MAINTENANCE_END is in the past", async () => {
  environment.MAINTENANCE_END = "2000-01-01T00:00:00Z";
  await restartServer();
  try {
    const response = await requestWithHost({
      port: server.address().port,
      host: "api.mapx.example.com",
      path: "/",
    });

    assert.equal(JSON.parse(response.body).retry, "2000-01-01T00:00:00Z");
    assert.equal(response.headers["retry-after"], undefined);
  } finally {
    environment.MAINTENANCE_END = "2099-08-27T18:00:00+02:00";
    await restartServer();
  }
});

test("leaves the app host behaviour unchanged", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "app.mapx.example.com",
    path: "/healthz",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "ok\n");
});

test("matches the API host prefix case-insensitively and with a port suffix", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "API.MAPX.EXAMPLE.COM:443",
    path: "/",
  });

  assert.equal(response.statusCode, 503);
});

test("does not treat a host that merely starts with the prefix letters as the API host", async () => {
  const response = await requestWithHost({
    port: server.address().port,
    host: "apx.mapx.example.com",
    path: "/does-not-exist",
  });

  assert.equal(response.statusCode, 404);
});

test("honours a MAINTENANCE_API_HOST_PREFIX override", async () => {
  environment.MAINTENANCE_API_HOST_PREFIX = "backend.";
  await restartServer();
  try {
    const overridden = await requestWithHost({
      port: server.address().port,
      host: "backend.mapx.example.com",
      path: "/",
    });
    assert.equal(overridden.statusCode, 503);

    const noLongerMatched = await requestWithHost({
      port: server.address().port,
      host: "api.mapx.example.com",
      path: "/does-not-exist",
    });
    assert.equal(noLongerMatched.statusCode, 404);
  } finally {
    delete environment.MAINTENANCE_API_HOST_PREFIX;
    await restartServer();
  }
});

async function restartServer() {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  server = createMaintenanceServer({
    configuration: resolveConfiguration(environment),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}
