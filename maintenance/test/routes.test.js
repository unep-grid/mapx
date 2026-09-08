import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { createMaintenanceServer } from "../server.js";
import { createDevelopmentServer } from "../dev.js";
import { resolveConfiguration } from "../configuration.js";

async function listen(server, t) {
  await new Promise((resolve, reject) => {
    server.once("error", (error) => {
      server.close();
      reject(error);
    });
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return (path, method = "GET", host = "app.localhost") =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path,
          method,
          headers: { Host: host },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () =>
            resolve({
              status: response.statusCode,
              headers: response.headers,
              body,
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
}

for (const development of [false, true]) {
  test(`${
    development ? "development" : "production"
  } runtime contract`, async (t) => {
    const environment = {
      MAPTILER_TOKEN: "",
      MAINTENANCE_END: "",
      MAINTENANCE_API_HOST_PREFIX: "   ",
    };
    const server = development
      ? await createDevelopmentServer({ environment })
      : createMaintenanceServer({
          configuration: resolveConfiguration(environment),
        });
    const get = await listen(server, t);
    const config = await get("/config.json");
    assert.deepEqual(JSON.parse(config.body), {
      maintenanceEnd: "",
      mapTilerToken: "",
    });
    assert.equal(config.headers["cache-control"], "no-store");
    assert.equal((await get("/")).status, 200);
    assert.equal((await get("/missing-file")).status, 404);
    for (const path of [
      "/",
      "/config.json",
      "/service-worker.js",
      "/map-x-logo-full.svg",
    ]) {
      const result = await get(path, "HEAD");
      assert.equal(result.status, 200);
      assert.equal(result.body, "");
    }
    const rejected = await get("/", "POST");
    assert.equal(rejected.status, 405);
    assert.equal(rejected.headers.allow, "GET, HEAD");
    for (const method of [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ]) {
      const result = await get("/anything", method, "API.EXAMPLE.COM:443");
      assert.equal(result.status, 503);
      if (method !== "HEAD") {
        assert.equal(JSON.parse(result.body).retry, null);
      }
    }
    assert.equal(
      (await get("/healthz", "POST", "api.example.com")).status,
      200,
    );
    assert.equal(
      (await get("/service-worker.js")).headers["service-worker-allowed"],
      "/",
    );
  });
}

for (const date of [
  "",
  "not-a-date",
  "2000-01-01T00:00:00Z",
  "2099-01-01T00:00:00Z",
]) {
  test(`retry semantics for ${date || "missing date"}`, async (t) => {
    const get = await listen(
      createMaintenanceServer({
        configuration: resolveConfiguration({ MAINTENANCE_END: date }),
      }),
      t,
    );
    const response = await get("/", "GET", "api.example.com");
    assert.equal(JSON.parse(response.body).retry, date || null);
    assert.equal(
      Number(response.headers["retry-after"]) > 0,
      date.startsWith("2099"),
    );
  });
}

test("frontend errors are handled without exposing details", async (t) => {
  const get = await listen(
    createMaintenanceServer({
      frontend: (_req, _res, next) => next(new Error("private detail")),
    }),
    t,
  );
  const response = await get("/");
  assert.equal(response.status, 500);
  assert.equal(response.body, "Internal server error");
  assert.equal((await get("/healthz")).status, 200);
});

test("malformed static paths do not crash the server", async (t) => {
  const get = await listen(createMaintenanceServer(), t);
  assert.equal((await get("/%ZZ")).status, 400);
  assert.equal((await get("/healthz")).status, 200);
});
