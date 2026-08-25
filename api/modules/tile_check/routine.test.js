import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkAllTiles: vi.fn(),
}));

vi.mock("./index.js", () => ({
  checkAllTiles: mocks.checkAllTiles,
}));

import {
  TILE_CHECK_ROUTINE_TIMEOUT_MS,
  tileCheckRoutine,
} from "./routine.js";

describe("tileCheckRoutine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a dedicated twenty-minute routine timeout", () => {
    expect(TILE_CHECK_ROUTINE_TIMEOUT_MS).toBe(20 * 60 * 1000);
  });

  it("logs the plan, progress, and a result summary without URLs", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      id_view: `view-${index}`,
      valid: index !== 100,
      tile_detail: index === 100 ? "timeout" : null,
      tile_tested_url: `https://secret.test/${index}?token=private`,
    }));
    mocks.checkAllTiles.mockImplementation(async (opt) => {
      opt.onPlan({ total: rows.length });
      rows.forEach(opt.onDone);
      return rows;
    });
    const log = vi.fn();

    await expect(tileCheckRoutine({ log })).resolves.toBe(rows);

    const messages = log.mock.calls.map(([message]) => message);
    expect(messages).toEqual([
      "Tile check routine started: 101 views",
      "Tile check routine progress: 100/101",
      "Tile check routine progress: 101/101",
      expect.stringMatching(
        /^Tile check routine completed: 101\/101 in \d+s \(valid=100, invalid=1, timeouts=1\)$/,
      ),
    ]);
    expect(messages.join("\n")).not.toContain("secret.test");
  });
});
