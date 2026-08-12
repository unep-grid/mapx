import { afterEach, describe, expect, it, vi } from "vitest";
import { openSourceMetadataEditorForShiny } from "./shiny_bridge.js";

describe("source metadata Shiny bridge", () => {
  afterEach(() => vi.restoreAllMocks());

  it("forwards the authorized source with the legacy event payload", () => {
    const shiny = { setInputValue: vi.fn() };
    vi.spyOn(Date, "now").mockReturnValue(1234);
    expect(
      openSourceMetadataEditorForShiny({
        idSource: "mx_vector_a_b_c_d_e",
        shiny,
      }),
    ).toBe(true);
    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "selectSourceLayerForMeta",
      { idSource: "mx_vector_a_b_c_d_e", update: 1234 },
      { priority: "event" },
    );
  });

  it("does nothing when Shiny is unavailable", () => {
    expect(
      openSourceMetadataEditorForShiny({
        idSource: "mx_vector_a_b_c_d_e",
        shiny: {},
      }),
    ).toBe(false);
  });
});
