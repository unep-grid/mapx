import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mx.js", () => ({
  ws: { emitAsync: vi.fn() },
}));

vi.mock("../../window/index.js", () => ({
  getMapxWindowManager: vi.fn(),
}));

import { MxSourcePickerElement } from "./index.js";
import { installSourcePickerShinyBridge } from "./shiny_bridge.js";

describe("source picker Shiny bridge", () => {
  let root;

  afterEach(() => root?.remove());

  it("clears and forwards a dependent selection that becomes excluded", async () => {
    root = document.createElement("div");
    const main = new MxSourcePickerElement();
    main.dataset.shinyInput = "selectSourceLayerMain";
    main.config = { label: "Main source" };
    const mask = new MxSourcePickerElement();
    mask.dataset.shinyInput = "selectSourceLayerMask";
    mask.dataset.excludeSourceInput = "selectSourceLayerMain";
    mask.config = {
      label: "Mask source",
      value: ["mx_vector_a_b_c_d_e"],
    };
    root.append(main, mask);
    document.body.append(root);
    await new Promise((resolve) => queueMicrotask(resolve));

    const shiny = { setInputValue: vi.fn() };
    installSourcePickerShinyBridge({ root, shiny });
    main.selectedItems = new Map([
      [
        "mx_vector_a_b_c_d_e",
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Road network",
          type: "vector",
        },
      ],
    ]);
    main.commit();

    expect(mask.value).toBeNull();
    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "selectSourceLayerMain",
      "mx_vector_a_b_c_d_e",
      { priority: "event" },
    );
    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "selectSourceLayerMask",
      null,
      { priority: "event" },
    );
  });
});
