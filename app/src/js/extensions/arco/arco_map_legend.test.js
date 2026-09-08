import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const zartiglMock = vi.hoisted(() => ({
  instances: [],
  Zartigl: class {
    constructor(options) {
      this.options = options;
      this.init = vi.fn(() => Promise.resolve());
      this.update = vi.fn(() => Promise.resolve());
      this.on = vi.fn();
      this.off = vi.fn();
      this.destroy = vi.fn();
      this.suspend = vi.fn();
      this.getTimeMeta = vi.fn(() => ({
        min: 10,
        max: 20,
        size: 2,
        values: [10, 20],
        current: 10,
        granularity: "second",
      }));
      this.getDepthMeta = vi.fn(() => ({
        values: [],
        label: "depth",
        current: undefined,
      }));
      this.getDebugInfo = vi.fn(() => ({ settings: options.settings || {} }));
      zartiglMock.instances.push(this);
    }
  },
}));

vi.mock("@fxi/zartigl", async (importOriginal) => ({
  ...(await importOriginal()),
  Zartigl: zartiglMock.Zartigl,
}));

vi.mock("../../modules_loader_async", () => ({
  moduleLoad: vi.fn(() => Promise.resolve({})),
}));

vi.mock("../../mx", () => ({
  maplibregl: {},
  settings: { layerBefore: null, language: "en" },
}));

import { ArcoMapLegend } from "./arco_map_legend.js";

const palettes = [{ id: "balance", colors: ["#0000ff", "#ffffff", "#ff0000"] }];

function createArco(legend) {
  const elLegend = document.createElement("div");
  const arco = new ArcoMapLegend({ elLegend });
  arco._layer_label = "Surface temperature";
  arco._z = {
    getLegend: vi.fn(() => legend),
    getPalettes: vi.fn(() => palettes),
    update: vi.fn(({ settings }) => {
      if (settings?.colorDomain) {
        [legend.min, legend.max] = settings.colorDomain;
      }
      return Promise.resolve();
    }),
  };
  arco._initialized = true;
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
    update: vi.fn(() => Promise.resolve()),
    getTimeMeta: vi.fn(() => ({ ...arco._time_meta, current: arco._time })),
    getDepthMeta: vi.fn(() => ({ values: [], label: "depth" })),
    suspend: vi.fn(),
    resume: vi.fn(),
  };
  arco._initialized = true;
  arco._updateTimeReadout = vi.fn();
  arco._updateValueReadout = vi.fn();
  return arco;
}

describe("ArcoMapLegend source/backend option", () => {
  it("defaults to auto", () => {
    const arco = new ArcoMapLegend({});
    expect(arco._opt.source).toBe("auto");
  });

  it("accepts the canonical 'source' option", () => {
    const arco = new ArcoMapLegend({ source: "geovideo" });
    expect(arco._opt.source).toBe("geovideo");
  });

  it("falls back to the legacy 'backend' option", () => {
    const arco = new ArcoMapLegend({ backend: "geovideo" });
    expect(arco._opt.source).toBe("geovideo");
  });

  it("prefers 'source' over 'backend' when both are given", () => {
    const arco = new ArcoMapLegend({ source: "geovideo", backend: "zarr" });
    expect(arco._opt.source).toBe("geovideo");
  });
});

describe("ArcoMapLegend zartigl 0.5 lifecycle", () => {
  beforeEach(() => {
    zartiglMock.instances.length = 0;
  });

  it("passes declarative state to Zartigl and initializes it", async () => {
    const arco = new ArcoMapLegend({
      layer: "ocean-current-velocity",
      source: "zarr",
      time: 10,
      depth: 5,
      visible: false,
      timeRange: { trailing: "P1M" },
      settings: { opacity: 0.8 },
      geoVideo: { autoplay: false, loop: false, playbackRate: 2 },
    });
    arco.build = vi.fn();
    arco.renderLegend = vi.fn();

    await arco.init();

    const z = zartiglMock.instances[0];
    expect(z.options.layer).toMatch(/^[0-9a-f-]{36}$/);
    expect(z.options.layer).not.toBe("ocean-current-velocity");
    expect(z.options).toMatchObject({
      source: "zarr",
      time: 10,
      depth: 5,
      visible: false,
      timeRange: { trailing: "P1M" },
      settings: { opacity: 0.8 },
      geoVideo: { autoplay: false, loop: false, playbackRate: 2 },
    });
    expect(z.init).toHaveBeenCalledOnce();
    expect(z.update).not.toHaveBeenCalled();
  });

  it("forwards combined changes through one unified update", async () => {
    const arco = createPlaybackArco({ values: [10, 20] });

    await arco.update({ time: 20, depth: 5 });

    expect(arco._z.update).toHaveBeenCalledOnce();
    expect(arco._z.update).toHaveBeenCalledWith({ time: 20, depth: 5 });
  });

  it("resolves layer aliases and rebuilds after structural changes", async () => {
    const arco = createPlaybackArco({ values: [10, 20] });
    arco._layer_def = { id: "old", kind: "scalar" };
    arco._rebuild = vi.fn();
    arco.stop = vi.fn();

    await arco.update({
      layer: "sea-surface-temperature-anomaly",
      source: "geovideo",
      timeRange: { trailing: "P1M" },
    });

    const forwarded = arco._z.update.mock.calls[0][0];
    expect(forwarded.layer).toMatch(/^[0-9a-f-]{36}$/);
    expect(forwarded.layer).not.toBe("sea-surface-temperature-anomaly");
    expect(forwarded.source).toBe("geovideo");
    expect(arco.stop).toHaveBeenCalledOnce();
    expect(arco._rebuild).toHaveBeenCalledOnce();
  });

  it("does not resynchronize UI after destruction during an update", async () => {
    let resolveUpdate;
    const arco = createPlaybackArco({ values: [10, 20] });
    arco._z.update = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    arco._syncStateFromZartigl = vi.fn();

    const pending = arco.update({ time: 20 });
    arco._destroyed = true;
    resolveUpdate();
    await pending;

    expect(arco._syncStateFromZartigl).not.toHaveBeenCalled();
  });

  it("rejects updates before initialization", async () => {
    const arco = new ArcoMapLegend({});
    await expect(arco.update({ time: 10 })).rejects.toThrow(
      "Call init() before update()",
    );
  });
});

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

  it("updates the legend after a runtime color-domain change", async () => {
    const legend = {
      type: "gradient",
      palette: "balance",
      min: -1,
      max: 1,
      unit: "K",
    };
    const { arco, elLegend } = createArco(legend);
    arco._settings = { colorDomain: null };
    await arco.updateSettings({ colorDomain: [-3, 3] });

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
    [{ phase: "metadata" }, " · fetching metadata"],
    [
      { phase: "fetching", completed: 2, total: 12, time: 0 },
      " · fetching 2/12",
    ],
    [{ phase: "rendering", time: 0 }, " · rendering"],
    [{ phase: "ready", time: 0 }, " · ready"],
    [{ phase: "blocked", time: 0, message: "Not published" }, " · blocked"],
    [{ phase: "error", error: new Error("Failed") }, " · error"],
  ])("renders the current %s status", (status, expected) => {
    arco._on_status(status);

    expect(arco.elStatusText.textContent).toBe(expected);
  });

  it("retains an early status until the header status element exists", () => {
    delete arco.elStatusText;
    arco._on_status({ phase: "rendering", time: 0 });
    arco.elStatusText = document.createElement("span");

    arco._renderStatus();

    expect(arco.elStatusText.textContent).toBe(" · rendering");
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
  it("prefers nested GeoVideo settings over the legacy loop option", () => {
    const arco = new ArcoMapLegend({
      loop: false,
      geoVideo: { loop: true, playbackRate: 5 },
    });

    expect(arco._opt.loop).toBe(true);
    expect(arco._playbackRate).toBe(5);
  });

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
    expect(arco._z.update).toHaveBeenCalledTimes(1);
    expect(arco._z.update).toHaveBeenCalledWith({ time: 50 });
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
    expect(arco._z.update).not.toHaveBeenCalled();
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

  it("resumes native GeoVideo playback instead of the Zarr timer", () => {
    const arco = new ArcoMapLegend({});
    arco._visible = false;
    arco._playing = true;
    arco._z = {
      getSource: vi.fn(() => ({ type: "geovideo" })),
      resume: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
    };
    arco._tick = vi.fn();

    arco._setVisible(true);

    expect(arco._z.resume).toHaveBeenCalledOnce();
    expect(arco._z.play).toHaveBeenCalledOnce();
    expect(arco._tick).not.toHaveBeenCalled();
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
    expect(finite._z.update).toHaveBeenCalledWith({ time: 50 });
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
    expect(
      scalarButtons.querySelector(".arco--playback_rate").textContent,
    ).toBe("1×");

    const vector = new ArcoMapLegend({});
    vector._layer_def = { kind: "vector" };
    const vectorButtons = vector._buildPlayerButtons(!vector.isVector());
    expect(vectorButtons.querySelectorAll("button")).toHaveLength(2);
    expect(vectorButtons.querySelector(".arco--playback_rate")).toBeNull();
  });

  it("uses native GeoVideo playback and forwards rate and loop changes", async () => {
    const arco = new ArcoMapLegend({ loop: true });
    arco._z = {
      getSource: vi.fn(() => ({ type: "geovideo" })),
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      update: vi.fn(() => Promise.resolve()),
    };
    arco._initialized = true;

    arco.play();
    await Promise.resolve();
    expect(arco._z.play).toHaveBeenCalledOnce();

    arco._cyclePlaybackRate();
    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { playbackRate: 2 },
    });

    arco.toggleLoop();
    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { loop: false },
    });

    arco.stop();
    expect(arco._z.pause).toHaveBeenCalledOnce();
  });

  it("preserves native playback state received before controls are built", () => {
    const arco = new ArcoMapLegend({
      geoVideo: { autoplay: true, loop: true, playbackRate: 2 },
    });
    arco._z = { getSource: vi.fn(() => ({ type: "geovideo" })) };

    arco._on_playback_change(true);
    arco._buildPlayerButtons(true);

    expect(arco.elButtonPlay.classList.contains("playing")).toBe(true);
    expect(arco.elButtonLoop.classList.contains("active")).toBe(true);
    expect(arco.elButtonRate.textContent).toBe("2×");
  });

  it("forwards generated GeoVideo playback options through update", async () => {
    const arco = new ArcoMapLegend({
      geoVideo: { autoplay: true, loop: false, playbackRate: 5 },
    });
    arco._z = {
      getSource: vi.fn(() => ({ type: "geovideo" })),
      update: vi.fn(() => Promise.resolve()),
    };
    arco._initialized = true;

    await arco.update({
      geoVideo: { autoplay: true, loop: false, playbackRate: 5 },
    });

    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { autoplay: true, loop: false, playbackRate: 5 },
    });
    expect(arco._opt.loop).toBe(false);
    expect(arco._playbackRate).toBe(5);
  });

  it("clears optimistic playback state when native autoplay is rejected", async () => {
    const error = new Error("autoplay rejected");
    const arco = new ArcoMapLegend({});
    arco._z = {
      getSource: vi.fn(() => ({ type: "geovideo" })),
      play: vi.fn(() => Promise.reject(error)),
    };
    arco._on_error = vi.fn();
    arco._buildPlayerButtons(true);

    arco.play();
    await vi.waitFor(() => expect(arco._playing).toBe(false));

    expect(arco.elButtonPlay.classList.contains("playing")).toBe(false);
    expect(arco._on_error).toHaveBeenCalledWith(error);
  });
});

describe("ArcoMapLegend cadence-aware time input", () => {
  it.each([
    ["year", [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)], "SELECT", null],
    ["month", [Date.UTC(2025, 0, 1), Date.UTC(2025, 1, 1)], "INPUT", "month"],
    ["day", [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 2)], "INPUT", "date"],
    [
      "hour",
      [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 1, 6)],
      "INPUT",
      "datetime-local",
    ],
  ])("renders a native %s control", (granularity, values, tagName, type) => {
    const arco = new ArcoMapLegend({});
    arco._time_meta = {
      min: values[0],
      max: values[values.length - 1],
      size: values.length,
      values,
      step: values[1] - values[0],
      granularity,
    };

    const input = arco._buildDateInput();

    expect(input.tagName).toBe(tagName);
    if (type) {
      expect(input.type).toBe(type);
    }
  });

  it("snaps a native date selection to an available timestamp", () => {
    const values = [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 3)];
    const arco = new ArcoMapLegend({});
    arco._time_meta = {
      min: values[0],
      max: values[1],
      size: 2,
      values,
      step: undefined,
      granularity: "day",
    };
    arco.setTime = vi.fn();
    const input = arco._buildDateInput();

    input.value = "2025-01-02";
    input.dispatchEvent(new Event("change"));

    expect(arco.setTime).toHaveBeenCalledWith(values[0]);
  });

  it("keeps a monthly selection within the selected calendar month", () => {
    const values = [Date.UTC(2025, 0, 28), Date.UTC(2025, 1, 28)];
    const arco = new ArcoMapLegend({});
    arco._time_meta = {
      min: values[0],
      max: values[1],
      size: 2,
      values,
      step: undefined,
      granularity: "month",
    };
    arco.setTime = vi.fn();
    const input = arco._buildDateInput();

    input.value = "2025-02";
    input.dispatchEvent(new Event("change"));

    expect(arco.setTime).toHaveBeenCalledWith(values[1]);
  });

  it("disables date navigation for a single timestamp", () => {
    const time = Date.UTC(2025, 0, 1);
    const arco = new ArcoMapLegend({});
    arco._time_meta = {
      min: time,
      max: time,
      size: 1,
      values: [time],
      granularity: "day",
    };

    expect(arco._buildDateInput().disabled).toBe(true);
    const buttons = arco._buildPlayerButtons(true, {
      navigationEnabled: false,
      transportEnabled: false,
    });
    expect(
      [...buttons.querySelectorAll("button")].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
  });

  it("keeps video transport enabled for a single-frame snapshot loop", () => {
    const time = Date.UTC(2025, 0, 1);
    const arco = new ArcoMapLegend({});
    arco._layer_def = { kind: "scalar" };
    arco._time = time;
    arco._time_meta = {
      min: time,
      max: time,
      size: 1,
      values: [time],
      granularity: "second",
      timelineKind: "snapshot-loop",
    };

    const row = arco._buildTimeRow();
    const byTitle = (title) => row.querySelector(`button[title="${title}"]`);

    expect(byTitle("Previous").disabled).toBe(true);
    expect(byTitle("Next").disabled).toBe(true);
    expect(byTitle("Play").disabled).toBe(false);
    expect(byTitle("Stop").disabled).toBe(false);
    expect(byTitle("Loop").disabled).toBe(false);
    expect(row.querySelector(".arco--playback_rate").disabled).toBe(false);
  });
});
