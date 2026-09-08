import assert from "node:assert/strict";
import test from "node:test";
import { resolveConfiguration } from "../configuration.js";
import { initializeMaintenance } from "../src/configuration.js";

test("configuration defaults and whitespace do not mutate environments", () => {
  const environment = Object.freeze({ MAINTENANCE_API_HOST_PREFIX: "  " });
  assert.deepEqual(resolveConfiguration(environment), {
    maintenanceEnd: "",
    mapTilerToken: "",
    apiHostPrefix: "api.",
  });
  assert.deepEqual(environment, { MAINTENANCE_API_HOST_PREFIX: "  " });
  assert.equal(resolveConfiguration({}).mapTilerToken, "");
});

test("shell settings including empty values override files", () => {
  const file = Object.freeze({
    MAPTILER_TOKEN: "file",
    MAINTENANCE_END: " date ",
  });
  assert.deepEqual(
    resolveConfiguration(
      { MAPTILER_TOKEN: "", MAINTENANCE_API_HOST_PREFIX: " Backend. " },
      file,
    ),
    {
      maintenanceEnd: "date",
      mapTilerToken: "",
      apiHostPrefix: "backend.",
    },
  );
  assert.equal(
    resolveConfiguration({ MAPTILER_TOKEN: " shell " }, file).mapTilerToken,
    "shell",
  );
  assert.equal(resolveConfiguration({}, file).mapTilerToken, "file");
});

test("fallback renders before configuration resolves", async () => {
  const events = [];
  let complete;
  const pending = initializeMaintenance({
    renderMessages: (date) => events.push(["render", date]),
    startGlobe: (token) => events.push(["globe", token]),
    fetchConfiguration: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  assert.deepEqual(events, [["render", undefined]]);
  complete({
    ok: true,
    json: async () => ({ maintenanceEnd: " date ", mapTilerToken: " token " }),
  });
  await pending;
  assert.deepEqual(events, [
    ["render", undefined],
    ["render", "date"],
    ["globe", "token"],
  ]);
});

for (const value of [
  null,
  [],
  "bad",
  { mapTilerToken: 42 },
  { mapTilerToken: " " },
]) {
  test(`malformed or missing configuration cannot enable the globe: ${JSON.stringify(
    value,
  )}`, async () => {
    await initializeMaintenance({
      renderMessages: (date) => assert.equal(date, undefined),
      startGlobe: (token) => assert.ok(!token),
      fetchConfiguration: async () => ({ ok: true, json: async () => value }),
    });
  });
}

for (const failure of ["http", "json", "network", "timeout"]) {
  test(`configuration ${failure} failure preserves fallback`, async () => {
    await initializeMaintenance({
      timeoutMs: 5,
      renderMessages: (date) => assert.equal(date, undefined),
      startGlobe: (token) => assert.ok(!token),
      fetchConfiguration: async (_url, { signal }) => {
        if (failure === "timeout") {
          return new Promise((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason)),
          );
        }
        if (failure === "network") {
          throw new Error("offline");
        }
        return {
          ok: failure !== "http",
          json: async () => {
            throw new Error("invalid JSON");
          },
        };
      },
    });
  });
}
