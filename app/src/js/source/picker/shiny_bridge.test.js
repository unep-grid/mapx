import { afterEach, describe, expect, it, vi } from "vitest";

const windowMock = vi.hoisted(() => ({
  open: vi.fn(),
}));

vi.mock("../../mx.js", () => ({
  ws: { emitAsync: vi.fn() },
}));

vi.mock("../../window/index.js", () => ({
  getMapxWindowManager: () => ({ open: windowMock.open }),
}));

import { MxSourcePickerElement } from "./index.js";
import {
  installSourcePickerShinyBridge,
  pickSourceForShiny,
} from "./shiny_bridge.js";

describe("source picker Shiny bridge", () => {
  let root;

  afterEach(() => {
    root?.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

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

  it("forwards an explicitly confirmed editable source with the legacy payload", async () => {
    root = document.createElement("div");
    document.body.append(root);
    const browserWindow = document.createElement("mx-window");
    browserWindow.close = vi.fn();
    windowMock.open.mockReturnValue(browserWindow);
    const shiny = { setInputValue: vi.fn() };
    vi.spyOn(Date, "now").mockReturnValue(1234);

    const pending = pickSourceForShiny({
      request: { id: "selectSourceLayerForManage" },
      root,
      shiny,
      language: "fr",
    });
    await new Promise((resolve) => queueMicrotask(resolve));
    const picker = root.querySelector("mx-source-picker");
    expect(picker.config).toMatchObject({
      acceptedTypes: ["vector", "tabular", "join"],
      requiredCapabilities: [],
      accessMode: "editable",
      language: "fr",
    });
    picker.selectedItems = new Map([
      [
        "mx_vector_a_b_c_d_e",
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Road network",
          type: "vector",
        },
      ],
    ]);
    browserWindow.dispatchEvent(
      new CustomEvent("mx-window-close", {
        detail: { reason: "selected" },
      }),
    );
    await pending;

    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "selectSourceLayerForManage",
      { idSource: "mx_vector_a_b_c_d_e", update: 1234 },
      { priority: "event" },
    );
  });

  it("does not send a legacy input when selection is cancelled", async () => {
    root = document.createElement("div");
    document.body.append(root);
    const browserWindow = document.createElement("mx-window");
    browserWindow.close = vi.fn();
    windowMock.open.mockReturnValue(browserWindow);
    const shiny = { setInputValue: vi.fn() };
    const pending = pickSourceForShiny({
      request: { id: "selectSourceLayerForMeta" },
      root,
      shiny,
    });
    await new Promise((resolve) => queueMicrotask(resolve));
    browserWindow.dispatchEvent(
      new CustomEvent("mx-window-close", {
        detail: { reason: "escape" },
      }),
    );
    await pending;
    expect(shiny.setInputValue).not.toHaveBeenCalled();
  });
});
