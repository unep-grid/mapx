import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mx", () => ({
  maplibregl: {},
  settings: { layerBefore: null },
}));

import { ArcoMapLegend } from "./arco_map_legend.js";

const palettes = [
  { id: "balance", colors: ["#0000ff", "#ffffff", "#ff0000"] },
];

function createArco(legend) {
  const elLegend = document.createElement("div");
  const arco = new ArcoMapLegend({ elLegend });
  arco._layer_def = { label: "Surface temperature" };
  arco._z = {
    getLegend: vi.fn(() => legend),
    getPalettes: vi.fn(() => palettes),
  };
  return { arco, elLegend };
}

describe("ArcoMapLegend legend rendering", () => {
  it("renders a scalar Zarr gradient with a fixed color domain", () => {
    const { arco, elLegend } = createArco({
      type: "gradient",
      palette: "balance",
      min: -3,
      max: 3,
      unit: "K",
    });

    arco.renderLegend();

    expect(elLegend.querySelector(".arco--legend_bar")).not.toBeNull();
    expect(
      [...elLegend.querySelectorAll(".arco--legend_meta span")].map(
        (element) => element.innerText,
      ),
    ).toEqual(["-3.00", "K", "3.00"]);
  });

  it("updates automatic frame bounds after metadata loads", () => {
    const legend = {
      type: "gradient",
      palette: "balance",
      min: undefined,
      max: undefined,
      unit: "K",
    };
    const { arco, elLegend } = createArco(legend);
    arco.renderLegend();

    legend.min = -1.25;
    legend.max = 2.5;
    arco._on_loaded({ min: legend.min, max: legend.max });

    expect(
      [...elLegend.querySelectorAll(".arco--legend_meta span")].map(
        (element) => element.innerText,
      ),
    ).toEqual(["-1.25", "K", "2.50"]);
  });

  it("updates the legend after a runtime color-domain change", () => {
    const legend = {
      type: "gradient",
      palette: "balance",
      min: -1,
      max: 1,
      unit: "K",
    };
    const { arco, elLegend } = createArco(legend);
    arco._settings = { colorDomain: null };
    arco._z.updateSettings = vi.fn(({ colorDomain }) => {
      [legend.min, legend.max] = colorDomain;
    });

    arco.updateSettings({ colorDomain: [-3, 3] });

    expect(
      [...elLegend.querySelectorAll(".arco--legend_meta span")].map(
        (element) => element.innerText,
      ),
    ).toEqual(["-3.00", "K", "3.00"]);
  });

  it("keeps the previous legend for a transient incomplete payload", () => {
    const legend = {
      type: "gradient",
      palette: "balance",
      min: -3,
      max: 3,
      unit: "K",
    };
    const { arco, elLegend } = createArco(legend);
    arco.renderLegend();
    const previous = elLegend.firstElementChild;

    arco._z.getLegend.mockReturnValue({ type: "empty" });
    arco.renderLegend();

    expect(elLegend.firstElementChild).toBe(previous);
  });

  it("renders a WMTS image legend", () => {
    const { arco, elLegend } = createArco({
      type: "image",
      url: "https://example.test/legend.svg",
    });

    arco.renderLegend();

    const image = elLegend.querySelector("img");
    expect(image.src).toBe("https://example.test/legend.svg");
    expect(image.alt).toBe("Surface temperature");
  });
});

describe("ArcoMapLegend status text", () => {
  let arco;

  beforeEach(() => {
    arco = new ArcoMapLegend({});
    arco.elStatusText = document.createElement("span");
  });

  it.each([
    [{ phase: "metadata" }, " -- fetching metadata"],
    [
      { phase: "fetching", completed: 2, total: 12, time: 0 },
      " -- fetching 2/12",
    ],
    [{ phase: "rendering", time: 0 }, " -- rendering"],
    [{ phase: "ready", time: 0 }, " -- ready"],
    [{ phase: "blocked", time: 0, message: "Not published" }, " -- blocked"],
    [{ phase: "error", error: new Error("Failed") }, " -- error"],
  ])("renders the current %s status", (status, expected) => {
    arco._on_status(status);

    expect(arco.elStatusText.textContent).toBe(expected);
  });

  it("retains an early status until the header status element exists", () => {
    delete arco.elStatusText;
    arco._on_status({ phase: "rendering", time: 0 });
    arco.elStatusText = document.createElement("span");

    arco._renderStatus();

    expect(arco.elStatusText.textContent).toBe(" -- rendering");
  });

  it("uses the title only for blocked and error details", () => {
    arco._on_status({ phase: "blocked", time: 0, message: "Not published" });
    expect(arco.elStatusText.title).toBe("Not published");

    arco._on_status({ phase: "ready", time: 0 });
    expect(arco.elStatusText.hasAttribute("title")).toBe(false);
  });

  it("removes the status listener when destroyed", () => {
    const off = vi.fn();
    arco._z = { off, destroy: vi.fn() };
    arco.destroy();

    expect(off).toHaveBeenCalledWith("status", arco._on_status);
  });
});
