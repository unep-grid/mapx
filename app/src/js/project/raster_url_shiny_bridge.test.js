import { beforeEach, describe, expect, it, vi } from "vitest";

const { configurators, ws } = vi.hoisted(() => ({
  configurators: [],
  ws: { emitAsync: vi.fn() },
}));

vi.mock("../mx.js", () => ({ ws }));
vi.mock("../el_mapx/index.js", () => ({
  tt: vi.fn((key) => {
    const span = document.createElement("span");
    span.textContent = key;
    return span;
  }),
}));
vi.mock("./raster_url_configurator.js", () => ({
  RasterUrlConfigurator: vi.fn(function RasterUrlConfigurator(options) {
    const instance = { options, show: vi.fn() };
    configurators.push(instance);
    return instance;
  }),
}));

import { installRasterUrlShinyBridge } from "./raster_url_shiny_bridge.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const root = document.createElement("main");
  const host = document.createElement("div");
  host.dataset.rasterUrlView = "MX-AAAAA-BBBBB-CCCCC";
  root.append(host);
  document.body.append(root);
  const handlers = {};
  const shiny = {
    addCustomMessageHandler: vi.fn((name, handler) => { handlers[name] = handler; }),
    setInputValue: vi.fn(),
  };
  installRasterUrlShinyBridge({ root, shiny });
  return { root, host, handlers, shiny };
}

describe("raster URL Shiny bridge", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    configurators.length = 0;
    ws.emitAsync.mockReset();
  });

  it("shows both truncated-value controls with independent health states", async () => {
    const { root, host, handlers, shiny } = setup();
    ws.emitAsync.mockResolvedValueOnce({
      config: {
        tiles: "https://tiles.test/a/very/long/{z}/{x}/{y}.png",
        legend: "",
        health: { checked_at: "now", tile_valid: true, legend_configured: false },
      },
    });

    handlers["mx-raster-url-tools"]({ idView: "MX-AAAAA-BBBBB-CCCCC" });
    await flush();

    const summary = host.querySelector("fieldset.raster-url-summary");
    const summaryTitle = summary.querySelector("legend.raster-url-summary__title.control-label");
    expect(summaryTitle.textContent).toBe("raster_url_summary_title");
    expect(summaryTitle.querySelector("i")).toBeNull();

    const previews = host.querySelectorAll(".raster-url-summary__preview");
    expect(previews).toHaveLength(2);
    expect(previews[0].title).toContain("https://tiles.test");
    expect(previews[1].textContent).toBe("project_tiles_report_status_not_configured");
    expect(host.querySelector('[data-state="valid"]')).not.toBeNull();
    expect(host.querySelector('[data-state="not_configured"]')).not.toBeNull();

    previews[0].click();
    expect(configurators[0].options.root).toBe(root);
    expect(configurators[0].show).toHaveBeenCalledWith(
      expect.objectContaining({ idView: "MX-AAAAA-BBBBB-CCCCC" }),
    );
    const { onSaved } = configurators[0].show.mock.calls[0][0];
    onSaved(
      {
        checked_at: "later",
        tile_valid: false,
        legend_configured: true,
        legend_valid: true,
      },
      { tiles: "https://changed.test/{z}/{x}/{y}.png", legend: "https://changed.test/legend.png" },
    );
    expect(previews[0].title).toContain("changed.test");
    expect(host.querySelectorAll('[data-state="invalid"]')).toHaveLength(1);
    expect(shiny.setInputValue).toHaveBeenCalled();
  });

  it("rechecks both resources and notifies Shiny with the fresh state", async () => {
    const { host, handlers, shiny } = setup();
    ws.emitAsync
      .mockResolvedValueOnce({
        config: {
          tiles: "https://tiles.test/{z}/{x}/{y}.png",
          legend: "https://tiles.test/legend.png",
          health: null,
        },
      })
      .mockResolvedValueOnce({
        row: {
          checked_at: "now",
          valid: false,
          tile_valid: true,
          legend_configured: true,
          legend_valid: false,
        },
      });

    handlers["mx-raster-url-tools"]({ idView: "MX-AAAAA-BBBBB-CCCCC" });
    await flush();
    const check = [...host.querySelectorAll("button")].find((button) =>
      button.textContent.includes("project_tiles_report_btn_check"),
    );
    check.click();
    await flush();

    expect(ws.emitAsync).toHaveBeenLastCalledWith(
      "/client/project/tiles_check/run_one",
      { idView: "MX-AAAAA-BBBBB-CCCCC" },
      30000,
    );
    expect(host.querySelectorAll('[data-state="valid"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-state="invalid"]')).toHaveLength(1);
    expect(shiny.setInputValue).toHaveBeenCalledWith(
      "viewRasterConfigSaved",
      expect.objectContaining({ idView: "MX-AAAAA-BBBBB-CCCCC" }),
      { priority: "event" },
    );
  });
});
