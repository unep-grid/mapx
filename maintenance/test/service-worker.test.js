import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const script = await readFile(
  new URL("../service-worker.js", import.meta.url),
  "utf8",
);
for (const failure of [null, "keys", "delete", "navigate", "claim"]) {
  test(`worker unregisters after lifecycle with ${
    failure || "no"
  } failure`, async () => {
    const events = {};
    const calls = [];
    const action = async (name) => {
      calls.push(name);
      if (name === failure) throw new Error(name);
    };
    runInNewContext(script, {
      self: {
        addEventListener: (name, handler) => {
          events[name] = handler;
        },
        skipWaiting: () => action("skip"),
        clients: {
          claim: () => action("claim"),
          matchAll: async () => [
            { url: "/", navigate: () => action("navigate") },
          ],
        },
        registration: { unregister: () => action("unregister") },
      },
      caches: {
        keys: async () => {
          await action("keys");
          return ["cache"];
        },
        delete: () => action("delete"),
      },
    });
    let work;
    const event = {
      waitUntil: (promise) => {
        work = promise;
      },
    };
    events.install(event);
    await work;
    events.activate(event);
    if (failure === "claim") await assert.rejects(work, /claim/);
    else await work;
    assert.equal(calls[0], "skip");
    assert.equal(calls.at(-1), "unregister");
    if (failure !== "claim") assert.ok(calls.includes("navigate"));
    if (!failure)
      assert.deepEqual(calls, [
        "skip",
        "claim",
        "keys",
        "delete",
        "navigate",
        "unregister",
      ]);
  });
}
