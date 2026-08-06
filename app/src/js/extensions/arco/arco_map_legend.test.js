import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function createPlaybackArco({ values, loop = true }) {
  const arco = new ArcoMapLegend({ loop, playbackInterval: 800 });
  arco._time_meta = {
    min: values[0],
    max: values.at(-1),
    step: 0,
    values,
  };
  arco._time = values[0];
  arco._z = {
    setTime: vi.fn(),
    suspend: vi.fn(),
    resume: vi.fn(),
  };
  arco._updateTimeReadout = vi.fn();
  arco._updateValueReadout = vi.fn();
  return arco;
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

describe("ArcoMapLegend playback controls", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cycles through the compact playback rates", () => {
    const arco = createPlaybackArco({ values: [10, 20] });
    arco.elButtonRate = document.createElement("button");

    expect(arco._playbackRate).toBe(1);
    for (const expected of [2, 5, 10, 1]) {
      arco._cyclePlaybackRate();
      expect(arco._playbackRate).toBe(expected);
      expect(arco.elButtonRate.textContent).toBe(`${expected}×`);
    }
  });

  it("skips real timestamps on irregular time axes", () => {
    const arco = createPlaybackArco({ values: [10, 20, 50, 100, 200] });
    arco._time = 20;

    expect(arco._timeAtOffset(2, { wrap: false })).toBe(100);
    expect(arco._timeAtOffset(5, { wrap: false })).toBeNull();
    expect(arco._timeAtOffset(5, { wrap: true })).toBe(20);
  });

  it("advances by the selected rate without changing timer cadence", async () => {
    vi.useFakeTimers();
    const arco = createPlaybackArco({ values: [10, 20, 50, 100] });
    arco._playbackRate = 2;
    arco._playing = true;

    arco._tick();
    await vi.advanceTimersByTimeAsync(799);
    expect(arco.getTime()).toBe(10);
    await vi.advanceTimersByTimeAsync(1);
    expect(arco.getTime()).toBe(50);
    expect(arco._z.setTime).toHaveBeenCalledTimes(1);
    arco.stop();
  });

  it("retains loading backpressure at higher rates", async () => {
    vi.useFakeTimers();
    const arco = createPlaybackArco({ values: [10, 20, 50, 100] });
    arco._playbackRate = 10;
    arco._playing = true;
    arco._loading = true;

    arco._tick();
    await vi.advanceTimersByTimeAsync(800);

    expect(arco.getTime()).toBe(10);
    expect(arco._z.setTime).not.toHaveBeenCalled();
    arco.stop();
  });

  it("suspends playback while hidden and resumes without catching up", async () => {
    vi.useFakeTimers();
    const arco = createPlaybackArco({ values: [10, 20, 50] });

    arco.play();
    arco._setVisible(false);
    await vi.advanceTimersByTimeAsync(2400);
    expect(arco.getTime()).toBe(10);
    expect(arco._z.suspend).toHaveBeenCalledOnce();

    arco._setVisible(true);
    expect(arco._z.resume).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(800);
    expect(arco.getTime()).toBe(20);
    arco.stop();
  });

  it("does not resume after an explicit stop while hidden", async () => {
    vi.useFakeTimers();
    const arco = createPlaybackArco({ values: [10, 20, 50] });

    arco.play();
    arco._setVisible(false);
    arco.stop();
    arco._setVisible(true);
    await vi.advanceTimersByTimeAsync(800);

    expect(arco.getTime()).toBe(10);
  });

  it("wraps skipped playback when looping and stops otherwise", async () => {
    vi.useFakeTimers();
    const looping = createPlaybackArco({ values: [10, 20, 50] });
    looping._time = 50;
    looping._playbackRate = 2;
    looping._playing = true;
    looping._tick();
    await vi.advanceTimersByTimeAsync(800);
    expect(looping.getTime()).toBe(20);
    looping.stop();

    const finite = createPlaybackArco({ values: [10, 20, 50], loop: false });
    finite._time = 20;
    finite._playbackRate = 2;
    finite._playing = true;
    finite._tick();
    await vi.advanceTimersByTimeAsync(800);
    expect(finite.getTime()).toBe(50);
    expect(finite._playing).toBe(false);
    expect(finite._z.setTime).toHaveBeenCalledWith(50);
  });

  it("keeps manual navigation at one frame with wrapping", () => {
    const arco = createPlaybackArco({ values: [10, 20, 50] });
    arco._playbackRate = 10;

    arco.stepNext(false);
    expect(arco.getTime()).toBe(20);
    arco.stepPrevious(false);
    expect(arco.getTime()).toBe(10);
    arco.stepPrevious(false);
    expect(arco.getTime()).toBe(50);
  });

  it("shows rate controls only for scalar playback", () => {
    const scalar = new ArcoMapLegend({});
    scalar._layer_def = { kind: "scalar" };
    const scalarButtons = scalar._buildPlayerButtons(!scalar.isVector());
    expect(scalarButtons.querySelectorAll("button")).toHaveLength(6);
    expect(scalarButtons.querySelector(".arco--playback_rate").textContent).toBe(
      "1×",
    );

    const vector = new ArcoMapLegend({});
    vector._layer_def = { kind: "vector" };
    const vectorButtons = vector._buildPlayerButtons(!vector.isVector());
    expect(vectorButtons.querySelectorAll("button")).toHaveLength(2);
    expect(vectorButtons.querySelector(".arco--playback_rate")).toBeNull();
  });
});
