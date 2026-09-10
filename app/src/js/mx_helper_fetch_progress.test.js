// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchJsonProgress } from "./mx_helper_fetch_progress.js";
vi.mock("./settings", () => ({ settings: { maxTimeFetch: 1000 } }));
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it.each([
  [{}, false],
  [{ "content-length": "0" }, false],
  [{ "content-length": "invalid" }, false],
  [{ "content-length": "4", "content-encoding": "gzip" }, false],
  [{ "Mapx-Content-Length": "4", "content-encoding": "gzip" }, true],
])(
  "only reports a measurable ratio for comparable byte counts (%j)",
  async (headers, measurable) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("null", { headers })),
    );
    const onProgress = vi.fn();
    await expect(
      fetchJsonProgress("/views", { onProgress }),
    ).resolves.toBeNull();
    expect(onProgress.mock.calls.at(-1)[0].lengthComputable).toBe(measurable);
    if (measurable) {
      expect(onProgress.mock.calls.at(-1)[0]).toMatchObject({
        loaded: 4,
        total: 4,
      });
    }
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("propagates body read failures and cleans the deadline", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("stream failed"));
            },
          }),
        ),
    ),
  );
  await expect(fetchJsonProgress("/views")).rejects.toThrow("stream failed");
  expect(vi.getTimerCount()).toBe(0);
});
it("aborts a request that never returns headers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    ),
  );
  const result = expect(fetchJsonProgress("/views")).rejects.toThrow("aborted");
  await vi.advanceTimersByTimeAsync(1000);
  await result;
  expect(vi.getTimerCount()).toBe(0);
});
