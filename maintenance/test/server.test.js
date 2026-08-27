import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { after, before, test } from "node:test";

import { createMaintenanceServer } from "../server.js";

let server;
let baseUrl;

before(async () => {
  process.env.MAINTENANCE_END = "2026-08-27T18:00:00+02:00";
  process.env.MAPTILER_TOKEN = "test-token";
  server = createMaintenanceServer();
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  delete process.env.MAINTENANCE_END;
  delete process.env.MAPTILER_TOKEN;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
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
    maintenanceEnd: "2026-08-27T18:00:00+02:00",
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
  assert.ok(assetPath, "the built index should reference a fingerprinted asset");

  const assetResponse = await fetch(`${baseUrl}${assetPath}`);
  assert.equal(
    assetResponse.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
});
