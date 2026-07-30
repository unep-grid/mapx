import { beforeEach, describe, expect, it, vi } from "vitest";

const pickerMock = vi.hoisted(() => ({
  pickSources: vi.fn(),
}));

vi.mock("../picker/index.js", () => ({
  pickSources: pickerMock.pickSources,
}));

vi.mock("../../mx", () => ({
  settings: { language: "fr" },
  ws: { emitAsync: vi.fn() },
  nc: {},
}));

vi.mock("../../language", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getDictItem: vi.fn(async () => "Joined source"),
  };
});

import { SourcesJoinManager } from "./index.js";

describe("join definition source picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects exactly one editable join using the injected root", async () => {
    const root = document.createElement("div");
    pickerMock.pickSources.mockResolvedValue({
      value: "mx_join_a_b_c_d_e",
      items: [],
    });
    const manager = new SourcesJoinManager({ root });

    await expect(manager.promptSelectSourceJoin()).resolves.toBe(
      "mx_join_a_b_c_d_e",
    );
    expect(pickerMock.pickSources).toHaveBeenCalledWith({
      root,
      multiple: false,
      acceptedTypes: ["join"],
      requiredCapabilities: [],
      accessMode: "editable",
      language: "fr",
      label: "Joined source",
    });
  });

  it("returns null when join selection is cancelled", async () => {
    pickerMock.pickSources.mockResolvedValue(null);
    const manager = new SourcesJoinManager({
      root: document.createElement("div"),
    });
    await expect(manager.promptSelectSourceJoin()).resolves.toBeNull();
  });
});
