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
      acceptedTypes: ["vector", "tabular", "join", "external"],
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

  it("applies server-side picker updates and forwards the new value", async () => {
    root = document.createElement("div");
    const picker = new MxSourcePickerElement();
    picker.dataset.shinyInput = "viewExternalMetadataId";
    picker.config = {
      acceptedTypes: ["external"],
      requiredCapabilities: [],
    };
    root.append(picker);
    document.body.append(root);
    await new Promise((resolve) => queueMicrotask(resolve));
    vi.spyOn(picker, "hydrateSelectedItems").mockResolvedValue();
    const handlers = new Map();
    const shiny = {
      setInputValue: vi.fn(),
      addCustomMessageHandler: vi.fn((name, handler) =>
        handlers.set(name, handler),
      ),
    };
    installSourcePickerShinyBridge({ root, shiny });

    handlers.get("mx-source-picker-update")({
      inputId: "viewExternalMetadataId",
      value: "mx_extern_a_b_c_d_e",
    });

    expect(picker.value).toBe("mx_extern_a_b_c_d_e");
    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "viewExternalMetadataId",
      "mx_extern_a_b_c_d_e",
      { priority: "event" },
    );
  });

  it("rehydrates only pickers displaying a revised source", async () => {
    root = document.createElement("div");
    const matching = new MxSourcePickerElement();
    matching.dataset.shinyInput = "viewExternalMetadataId";
    matching.config = {
      value: ["mx_extern_a_b_c_d_e"],
      acceptedTypes: ["external"],
      requiredCapabilities: [],
    };
    const other = new MxSourcePickerElement();
    other.dataset.shinyInput = "otherSourceId";
    other.config = {
      value: ["mx_extern_f_g_h_i_j"],
      acceptedTypes: ["external"],
      requiredCapabilities: [],
    };
    root.append(matching, other);
    document.body.append(root);
    await new Promise((resolve) => queueMicrotask(resolve));
    const matchingHydration = vi
      .spyOn(matching, "hydrateSelectedItems")
      .mockResolvedValue();
    const otherHydration = vi
      .spyOn(other, "hydrateSelectedItems")
      .mockResolvedValue();
    const handlers = new Map();
    const shiny = {
      setInputValue: vi.fn(),
      addCustomMessageHandler: vi.fn((name, handler) =>
        handlers.set(name, handler),
      ),
    };
    installSourcePickerShinyBridge({ root, shiny });

    handlers.get("mx-source-picker-refresh")({
      idSource: "mx_extern_a_b_c_d_e",
    });

    expect(matchingHydration).toHaveBeenCalledOnce();
    expect(otherHydration).not.toHaveBeenCalled();
    expect(shiny.setInputValue).not.toHaveBeenCalled();
  });

  it("forwards generic picker actions to their legacy Shiny input", async () => {
    root = document.createElement("div");
    const picker = new MxSourcePickerElement();
    picker.dataset.shinyInput = "viewExternalMetadataId";
    picker.config = {
      acceptedTypes: ["external"],
      requiredCapabilities: [],
      actions: [{ id: "btnAddExternalMetadata", label: "Create" }],
    };
    root.append(picker);
    document.body.append(root);
    await new Promise((resolve) => queueMicrotask(resolve));
    const shiny = { setInputValue: vi.fn() };
    vi.spyOn(Date, "now").mockReturnValue(4321);
    installSourcePickerShinyBridge({ root, shiny });

    picker.querySelector("[data-action-id='btnAddExternalMetadata']").click();

    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "btnAddExternalMetadata",
      { value: null, update: 4321 },
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
