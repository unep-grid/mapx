import { afterEach, describe, expect, it, vi } from "vitest";

const { decrypt } = vi.hoisted(() => ({ decrypt: vi.fn() }));

vi.mock("#mapx/db", () => ({ pgWrite: { query: vi.fn() } }));
vi.mock("#mapx/template", () => ({ templates: {} }));
vi.mock("#mapx/db_utils", () => ({ decrypt }));
vi.mock("#root/settings", () => ({ settings: {} }));

import { validateToken } from "./helpers.js";

describe("validateToken", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("compares the expiry in seconds with the current time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    const now = Date.now() / 1000;

    decrypt.mockResolvedValueOnce({ key: "k", valid_until: now - 60 });
    expect((await validateToken("expired")).isValid).toBe(false);

    decrypt.mockResolvedValueOnce({ key: "k", valid_until: now + 60 });
    expect((await validateToken("valid")).isValid).toBe(true);
  });
});
