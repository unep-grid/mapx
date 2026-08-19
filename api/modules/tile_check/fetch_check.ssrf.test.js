import { describe, expect, it } from "vitest";
import { checkUrl } from "./fetch_check.js";

/**
 * Unlike fetch_check.test.js, node-fetch is NOT mocked here: SSRF blocking
 * now happens inside request-filtering-agent's Agent#createConnection
 * override, so it can only be exercised through the real fetch/agent
 * wiring. Blocked targets never reach the network (the agent rejects the
 * connection attempt itself), so these stay fast and offline-safe.
 */
describe("checkUrl — SSRF blocking (real agent, no mocks)", () => {
  it("blocks the cloud metadata endpoint (literal IP)", async () => {
    const result = await checkUrl("http://169.254.169.254/latest/meta-data/");
    expect(result.valid).toBe(false);
    expect(result.detail).toBe("blocked_private_address");
  });

  it("blocks loopback (literal IP)", async () => {
    const result = await checkUrl("http://127.0.0.1/tiles/1/1/1.png");
    expect(result.valid).toBe(false);
    expect(result.detail).toBe("blocked_private_address");
  });

  it("blocks an RFC1918 private address", async () => {
    const result = await checkUrl("http://10.0.0.5/tiles/1/1/1.png");
    expect(result.valid).toBe(false);
    expect(result.detail).toBe("blocked_private_address");
  });

  it("blocks alternate IPv4 encodings (decimal) resolved by the URL parser", async () => {
    // new URL("http://2130706433/") canonicalizes to 127.0.0.1 before the
    // agent ever sees it.
    const result = await checkUrl("http://2130706433/x");
    expect(result.valid).toBe(false);
    expect(result.detail).toBe("blocked_private_address");
  });

  it("blocks IPv6 loopback", async () => {
    const result = await checkUrl("http://[::1]/x");
    expect(result.valid).toBe(false);
    expect(result.detail).toBe("blocked_private_address");
  });
});
