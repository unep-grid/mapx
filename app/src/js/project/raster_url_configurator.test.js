import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  moduleLoad,
  tomSelectInstances,
  windowManager,
  ws,
  wmsGetLayers,
  urlTile,
  urlLegend,
} = vi.hoisted(() => {
  const append = (node, value) => {
    if (Array.isArray(value)) return value.forEach((item) => append(node, item));
    if (value instanceof Node) return node.appendChild(value);
    if (value !== null && value !== undefined) {
      node.appendChild(document.createTextNode(String(value)));
    }
  };
  const el = (tag, ...args) => {
    const node = document.createElement(tag);
    for (const arg of args) {
      if (Array.isArray(arg) || arg instanceof Node || typeof arg !== "object") {
        append(node, arg);
        continue;
      }
      if (!arg) continue;
      for (const [key, value] of Object.entries(arg)) {
        if (value === undefined) continue;
        if (key === "class") node.className = Array.isArray(value) ? value.join(" ") : value;
        else if (key === "on") {
          for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
        } else if (key === "dataset") Object.assign(node.dataset, value);
        else if (key === "checked") node.checked = Boolean(value);
        else if (key === "disabled") node.disabled = Boolean(value);
        else node.setAttribute(key, String(value));
      }
    }
    return node;
  };
  const tomSelectInstances = [];
  function TomSelect(input, settings) {
    this.input = input;
    this.settings = settings;
    this.value = "";
    this.destroy = vi.fn();
    this.getValue = vi.fn(() => this.value);
    this.setValue = vi.fn((value) => {
      this.value = value;
      input.value = value;
      settings.onChange?.(value);
    });
    tomSelectInstances.push(this);
  }
  return {
    moduleLoad: vi.fn(async () => TomSelect),
    tomSelectInstances,
    windowManager: { el, open: vi.fn(), root: null },
    ws: { emitAsync: vi.fn() },
    wmsGetLayers: vi.fn(),
    urlTile: vi.fn(() => "generated-tile-url"),
    urlLegend: vi.fn(() => "generated-legend-url"),
  };
});

vi.mock("../window/index.js", () => ({
  getMapxWindowManager: vi.fn(() => windowManager),
}));
vi.mock("../mx.js", () => ({ ws }));
vi.mock("../modules_loader_async", () => ({ moduleLoad }));
vi.mock("../language", () => ({
  getDictItem: vi.fn(async (key) => key),
}));
vi.mock("../settings", () => ({
  settings: { wms: [{ label: "Datacore", value: "https://example.test/wms" }] },
}));
vi.mock("../el_mapx", () => ({
  tt: vi.fn((key) => {
    const span = document.createElement("span");
    span.textContent = key;
    return span;
  }),
}));
vi.mock("../wms/index.js", () => ({ wmsGetLayers, urlTile, urlLegend }));

import { RasterUrlConfigurator } from "./raster_url_configurator.js";

const config = {
  tiles: "https://tiles.test/{z}/{x}/{y}.png",
  legend: "https://tiles.test/legend.png",
  tileSize: 256,
  useMirror: true,
  health: {
    checked_at: "2026-08-20T10:00:00Z",
    valid: true,
    tile_valid: true,
    legend_configured: true,
    legend_valid: true,
  },
};

describe("RasterUrlConfigurator", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    windowManager.root = document.body;
    windowManager.open.mockReset();
    windowManager.open.mockImplementation((options) => {
      document.body.append(options.content);
      for (const item of [options.footerStart, ...(options.footerEnd || [])]) {
        if (item) document.body.append(item);
      }
      return { close: vi.fn() };
    });
    ws.emitAsync.mockReset();
    wmsGetLayers.mockReset();
    moduleLoad.mockClear();
    tomSelectInstances.length = 0;
    urlTile.mockClear();
    urlLegend.mockClear();
  });

  it("renders current values and marks edited URLs as unchecked", async () => {
    const editor = new RasterUrlConfigurator({ root: document.body });
    await editor.show({ idView: "MX-AAAAA-BBBBB-CCCCC", config });

    expect(editor.refs.tiles.value).toBe(config.tiles);
    expect(editor.refs.legend.value).toBe(config.legend);
    expect(editor.refs.tileSize.value).toBe("256");
    expect(editor.refs.useMirror.checked).toBe(true);
    expect(editor.refs.tilesStatus.dataset.state).toBe("valid");

    editor.refs.tiles.value = "https://changed.test/{z}/{x}/{y}.png";
    editor.refs.tiles.dispatchEvent(new Event("input"));

    expect(editor.refs.tilesStatus.dataset.state).toBe("unchecked");
    expect(editor.refs.legendStatus.dataset.state).toBe("valid");
  });

  it("loads WMS layers and generates unsaved URL values", async () => {
    wmsGetLayers.mockResolvedValue([
      {
        Name: "workspace:layer",
        Title: "Example layer",
        Abstract: "A detailed layer description",
      },
    ]);
    const editor = new RasterUrlConfigurator({ root: document.body });
    await editor.show({ idView: "MX-AAAAA-BBBBB-CCCCC", config });

    await editor.getLayers();
    expect(wmsGetLayers).toHaveBeenCalledWith(
      "https://example.test/wms",
      expect.objectContaining({
        optGetCapabilities: expect.objectContaining({ useMirror: true }),
      }),
    );
    expect(editor.refs.feedback.textContent).toBe(
      "raster_url_wms_layers_loaded: 1",
    );
    expect(editor.refs.feedback.textContent).not.toContain("[object HTMLSpanElement]");
    expect(moduleLoad).toHaveBeenCalledWith("tom-select");
    expect(editor.layerSelect.settings.searchField).toEqual([
      "name",
      "title",
      "abstract",
    ]);
    expect(editor.layerSelect.settings.maxOptions).toBe(100);
    expect(editor.layerSelect.settings.dataAttr).toBe("data");
    const optionData = JSON.parse(editor.refs.layer.options[1].dataset.data);
    expect(optionData).toMatchObject({
      name: "workspace:layer",
      title: "Example layer",
      abstract: "A detailed layer description",
    });
    const selectedItem = editor.layerSelect.settings.render.item(optionData);
    const dropdownOption = editor.layerSelect.settings.render.option(optionData);
    expect(selectedItem.textContent).toContain("Example layer");
    expect(selectedItem.textContent).toContain("workspace:layer");
    expect(dropdownOption.textContent).toContain("A detailed layer description");
    editor.layerSelect.setValue("workspace:layer");
    expect(editor.refs.btnGenerate.disabled).toBe(false);

    editor.generateUrls();
    expect(editor.refs.tiles.value).toBe("generated-tile-url");
    expect(editor.refs.legend.value).toBe("generated-legend-url");
    expect(editor.refs.tilesStatus.dataset.state).toBe("unchecked");
    expect(editor.refs.feedback.classList.contains("alert-success")).toBe(true);

    windowManager.open.mock.calls.at(-1)[0].onClose();
    expect(tomSelectInstances[0].destroy).toHaveBeenCalled();
  });

  it("keeps the WMS reload action icon-only and accessibly labelled", async () => {
    const editor = new RasterUrlConfigurator({ root: document.body });
    await editor.show({ idView: "MX-AAAAA-BBBBB-CCCCC", config });
    await Promise.resolve();

    expect(editor.refs.btnLoad.querySelector(".fa-refresh")).not.toBeNull();
    expect(editor.refs.btnLoad.querySelector(".sr-only")).not.toBeNull();
    expect(editor.refs.btnLoad.getAttribute("aria-label")).toBe(
      "raster_url_wms_load_layers",
    );
    expect(editor.refs.btnLoad.title).toBe("raster_url_wms_load_layers");
  });

  it("tests without saving, then saves through the existing API contract", async () => {
    const onSaved = vi.fn();
    const editor = new RasterUrlConfigurator({ root: document.body });
    await editor.show({ idView: "MX-AAAAA-BBBBB-CCCCC", config, onSaved });
    ws.emitAsync.mockResolvedValueOnce({
      result: {
        valid: false,
        tile_valid: false,
        legend_configured: true,
        legend_valid: true,
      },
    });

    await editor.handleTest();
    expect(ws.emitAsync).toHaveBeenLastCalledWith(
      "/client/view/raster/config/test",
      expect.objectContaining({ idView: "MX-AAAAA-BBBBB-CCCCC" }),
      30000,
    );
    expect(editor.refs.tilesStatus.dataset.state).toBe("invalid");
    expect(editor.refs.legendStatus.dataset.state).toBe("valid");
    expect(editor.refs.feedback.textContent).not.toContain("[object HTMLSpanElement]");

    const row = { id_view: "MX-AAAAA-BBBBB-CCCCC", valid: true };
    ws.emitAsync.mockResolvedValueOnce({ row });
    await editor.handleSave();
    expect(ws.emitAsync).toHaveBeenLastCalledWith(
      "/client/view/raster/config/save",
      expect.objectContaining({
        idView: "MX-AAAAA-BBBBB-CCCCC",
        config: expect.objectContaining({ tileSize: 256, useMirror: true }),
      }),
      30000,
    );
    expect(onSaved).toHaveBeenCalledWith(row, expect.objectContaining({ tiles: config.tiles }));
    expect(editor.window.close).toHaveBeenCalledWith("saved");
  });
});
