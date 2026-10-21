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
  theme: { isDark: () => false },
  settings: { layerBefore: null, language: "en" },
}));

import { ArcoMapLegend } from "./arco_map_legend.js";
import { ArcoChart, formatValue } from "./chart.js";

const palettes = [{ id: "balance", colors: ["#0000ff", "#ffffff", "#ff0000"] }];

function createArco(legend) {
  const elLegend = document.createElement("div");
  const arco = new ArcoMapLegend({ elLegend });
  arco._layer_label = "Surface temperature";
  arco._z = {
    getLegend: vi.fn(() => legend),
    getPalettes: vi.fn(() => palettes),
    update: vi.fn(({ style }) => {
      const domain = style?.raster?.colorDomain;
      if (domain) {
        [legend.min, legend.max] = domain;
      }
      return Promise.resolve();
    }),
  };
  arco._initialized = true;
  return { arco, elLegend };
}

/**
 * ArcoMapLegend over a zartigl double: the time axis `values`, GeoVideo
 * playback when `available`, and steps that start from the last requested
 * time, as zartigl does.
 */
function createPlaybackArco({ values, loop = true, available = true }) {
  const arco = new ArcoMapLegend({ loop });
  arco._time_meta = {
    min: values[0],
    max: values.at(-1),
    step: 0,
    values,
  };
  arco._time = values[0];
  let requested = values[0];
  const z = {
    available,
    source: { id: "video", type: available ? "geovideo" : "zarr" },
    speeds: [0.25, 0.5, 1, 2, 4, 8, 16, 32],
    update: vi.fn((change) => {
      if (change.time != null) {
        requested = change.time;
      }
      return Promise.resolve();
    }),
    getTimeMeta: vi.fn(() => ({ ...arco._time_meta, current: arco._time })),
    getDepthMeta: vi.fn(() => ({ values: [], label: "depth" })),
    getSource: vi.fn(() => z.source),
    getPlaybackState: vi.fn(() => ({
      available: z.available,
      playing: arco._playing,
      loop: arco._opt.loop,
      stepsPerSecond: arco._playbackSpeed,
      speeds: z.speeds,
    })),
    getSteppedTime: vi.fn(
      (offset) => values[values.indexOf(requested) + offset],
    ),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    suspend: vi.fn(),
    resume: vi.fn(),
  };
  arco._z = z;
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
      style: { raster: { opacity: 0.8 } },
      settings: { particleState: "rgba8" },
      geoVideo: { autoplay: false, loop: false, stepsPerSecond: 2 },
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
      style: { raster: { opacity: 0.8 } },
      settings: { particleState: "rgba8" },
      geoVideo: { autoplay: false, loop: false, stepsPerSecond: 2 },
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
    await arco.updateStyle({ raster: { colorDomain: [-3, 3] } });

    expect(
      [...elLegend.querySelectorAll(".arco--legend_meta span")].map(
        (element) => element.innerText,
      ),
    ).toEqual(["-3.00", "K", "3.00"]);
  });

  it("moves deprecated flat settings to the style, warning once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { arco } = createArco({ type: "gradient", min: 0, max: 1 });
    arco._opt.style = { palette: "balance" };

    await arco.updateSettings({ colorDomain: [-3, 3] });
    await arco.update({ settings: { colorDomain: [-2, 2] } });

    expect(arco._z.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        style: { palette: "balance", raster: { colorDomain: [-2, 2] } },
        settings: undefined,
      }),
    );
    expect(
      warn.mock.calls.filter(([message]) =>
        String(message).includes("settings.colorDomain is deprecated"),
      ),
    ).toHaveLength(1);
    warn.mockRestore();
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

describe("ArcoMapLegend settings panel", () => {
  it("starts from the layer style as zartigl resolves it", () => {
    const { arco } = createArco({});
    arco._z.supportsDynamicStyle = () => false;
    arco._opt.style = {
      particles: { fade: 0.4 },
      raster: { colorDomain: null },
    };
    arco._layer_def = {
      kind: "vector",
      defaults: {
        particles: { speed: 2, grade: "vibrant" },
        raster: { colorDomain: [0, 1] },
      },
    };

    arco._buildSettings();

    expect(arco._style).toMatchObject({
      renderMode: "particles",
      particles: { density: 0.05, speed: 2, fade: 0.4, grade: "vibrant" },
      raster: { opacity: 1, colorDomain: null },
    });
  });

  it("patches the style override from a control", async () => {
    const { arco } = createArco({});
    arco._layer_def = { kind: "vector", defaults: {} };
    arco._opt.style = { particles: { fade: 0.4 } };

    await arco.updateStyle({ particles: { density: 0.1 } });

    expect(arco._z.update).toHaveBeenCalledWith(
      expect.objectContaining({
        style: { particles: { fade: 0.4, density: 0.1 } },
      }),
    );
    expect(arco._style.particles).toMatchObject({ fade: 0.4, density: 0.1 });
  });

  it("sends the whole particle backdrop from one control", async () => {
    const { arco } = createArco({});
    arco._z.supportsDynamicStyle = () => false;
    arco._layer_def = {
      kind: "vector",
      defaults: { particles: { backdrop: { color: "#fff", opacity: 0.3 } } },
    };

    const elSettings = arco._buildSettings();
    // A color input only takes #rrggbb.
    expect(elSettings.querySelector('input[type="color"]').value).toBe(
      "#ffffff",
    );

    await arco._updateBackdrop({ enabled: false });

    expect(arco._z.update).toHaveBeenCalledWith(
      expect.objectContaining({
        style: {
          particles: {
            backdrop: { enabled: false, color: "#fff", opacity: 0.3 },
          },
        },
      }),
    );
    expect(arco._style.particles.backdrop.enabled).toBe(false);
  });
});

describe("ArcoMapLegend scalar settings panel", () => {
  it("draws scalar layers as a raster, as zartigl does", () => {
    const { arco } = createArco({});
    arco._z.supportsDynamicStyle = () => false;
    arco._layer_def = { kind: "scalar", defaults: {} };

    arco._buildSettings();

    expect(arco._style.renderMode).toBe("raster");
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
  afterEach(() => {
    vi.useRealTimers();
  });

  function buttons(arco) {
    arco._buildPlayerButtons();
    return {
      previous: arco.elButtonPrevious,
      next: arco.elButtonNext,
      play: arco.elButtonPlay,
      stop: arco.elButtonStop,
      loop: arco.elButtonLoop,
      rate: arco.elButtonRate,
    };
  }

  it("prefers nested GeoVideo settings over the legacy loop option", () => {
    const arco = new ArcoMapLegend({
      loop: false,
      geoVideo: { loop: true, stepsPerSecond: 5 },
    });

    expect(arco._opt.loop).toBe(true);
    expect(arco._playbackSpeed).toBe(5);
  });

  it("cycles through the speeds zartigl offers", () => {
    const arco = createPlaybackArco({ values: [10, 20] });
    arco.elButtonRate = document.createElement("button");

    for (const expected of [4, 8, 16, 32, 0.25, 0.5, 1, 2]) {
      arco._cyclePlaybackSpeed();
      expect(arco._playbackSpeed).toBe(expected);
      expect(arco.elButtonRate.textContent).toBe(`${expected}/s`);
    }
    expect(arco._z.update).toHaveBeenLastCalledWith({
      geoVideo: { stepsPerSecond: 2 },
    });

    arco._z.speeds = [0.25, 0.5, 1, 2];
    arco._cyclePlaybackSpeed();
    expect(arco._playbackSpeed).toBe(0.25);
  });

  it("keeps playback controls visible but inactive where zartigl cannot play", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30], available: false });
    const els = buttons(arco);

    for (const name of ["play", "stop", "loop", "rate"]) {
      expect(els[name].disabled).toBe(true);
    }
    expect(els.previous.disabled).toBe(true);
    expect(els.next.disabled).toBe(false);

    arco.play();
    arco.toggleLoop();
    arco._cyclePlaybackSpeed();
    expect(arco._z.play).not.toHaveBeenCalled();
    expect(arco._z.update).not.toHaveBeenCalled();
    expect(arco._playing).toBe(false);

    arco.stepNext();
    expect(arco._z.update).toHaveBeenCalledWith({ time: 20 });
  });

  it("enables playback on vector GeoVideo too", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    arco._layer_def = { kind: "vector" };
    const els = buttons(arco);

    expect(
      arco.elButtonPlay.parentElement.querySelectorAll("button"),
    ).toHaveLength(6);
    for (const name of ["play", "stop", "loop", "rate"]) {
      expect(els[name].disabled).toBe(false);
    }
    arco.play();
    expect(arco._z.play).toHaveBeenCalledOnce();
  });

  it("steps one time step through zartigl and stays at the bounds", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    const els = buttons(arco);

    arco.stepPrevious();
    expect(arco._z.update).not.toHaveBeenCalled();

    arco.stepNext();
    arco.stepNext();
    expect(arco._z.update.mock.calls).toEqual([[{ time: 20 }], [{ time: 30 }]]);
    expect(arco.getTime()).toBe(30);
    expect(els.next.disabled).toBe(true);
    expect(els.previous.disabled).toBe(false);

    arco.stepNext();
    expect(arco._z.update).toHaveBeenCalledTimes(2);
  });

  it("stops playback on a manual step", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    buttons(arco);
    arco.play();

    arco.stepNext();

    expect(arco._z.pause).toHaveBeenCalledOnce();
    expect(arco._playing).toBe(false);
    expect(arco.elButtonPlay.classList.contains("playing")).toBe(false);
  });

  it("follows a pause made by zartigl, such as a depth change", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    buttons(arco);
    arco.play();

    arco._on_playback_change(false);

    expect(arco._playing).toBe(false);
  });

  it("rebuilds the controls when an update moves to another source", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    arco._rebuild = vi.fn();
    arco._z.update = vi.fn(() => {
      arco._z.source = { id: "zarr", type: "zarr" };
      arco._z.available = false;
      return Promise.resolve();
    });

    await arco.update({ depth: 20 });
    expect(arco._rebuild).toHaveBeenCalledOnce();

    await arco.update({ depth: 30 });
    expect(arco._rebuild).toHaveBeenCalledOnce();
  });

  it("rebuilds on a source change made by zartigl itself", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    arco._elContainer = document.createElement("div");
    arco._rebuild = vi.fn();
    let resolveUpdate;
    arco._z.update = vi.fn(
      () => new Promise((resolve) => (resolveUpdate = resolve)),
    );

    // Resynchronized by the update that caused it.
    const pending = arco.update({ settings: { opacity: 0.5 } });
    arco._on_source_change();
    expect(arco._rebuild).not.toHaveBeenCalled();
    resolveUpdate();
    await pending;

    arco._on_source_change();
    expect(arco._rebuild).toHaveBeenCalledOnce();
  });

  it("rebuilds after a slider scrub that moved to another source", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    arco._rebuild = vi.fn();
    buttons(arco);
    arco.play();

    arco._scrub.begin();
    arco._z.available = false;
    arco._refreshAfterSourceChange();
    expect(arco._rebuild).not.toHaveBeenCalled();
    expect(arco.elButtonPlay.disabled).toBe(true);

    arco._scrub.end();
    await Promise.resolve();
    expect(arco._rebuild).toHaveBeenCalledOnce();
    // Playback cannot resume where the scrub landed.
    expect(arco._playing).toBe(false);
    expect(arco._z.play).toHaveBeenCalledOnce();
  });

  it("resumes after the released seek applies, even across artifacts", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    buttons(arco);
    let applySeek;
    arco._z.update = vi.fn(
      () => new Promise((resolve) => (applySeek = resolve)),
    );
    arco.play();

    arco._scrub.begin();
    arco._scrub.request(30);
    arco._scrub.end();
    expect(arco._z.play).toHaveBeenCalledOnce();

    // The seek loads another artifact, whose new layer starts paused.
    arco._on_playback_change(false);
    applySeek();
    await vi.waitFor(() => expect(arco._z.play).toHaveBeenCalledTimes(2));
    expect(arco._playing).toBe(true);
  });

  it("cancels the resume when stopped while the released seek applies", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    let applySeek;
    arco._z.update = vi.fn(
      () => new Promise((resolve) => (applySeek = resolve)),
    );
    arco.play();

    arco._scrub.begin();
    arco._scrub.request(30);
    arco._scrub.end();
    arco.stop();
    applySeek();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(arco._z.play).toHaveBeenCalledOnce();
    expect(arco._playing).toBe(false);
  });

  it("suspends while hidden and resumes GeoVideo playback", () => {
    const arco = createPlaybackArco({ values: [10, 20, 50] });

    arco.play();
    arco._setVisible(false);
    expect(arco._z.suspend).toHaveBeenCalledOnce();

    arco._setVisible(true);
    expect(arco._z.resume).toHaveBeenCalledOnce();
    expect(arco._z.play).toHaveBeenCalledTimes(2);
  });

  it("does not resume after an explicit stop while hidden", () => {
    const arco = createPlaybackArco({ values: [10, 20, 50] });

    arco.play();
    arco._setVisible(false);
    arco.stop();
    arco._setVisible(true);

    expect(arco._z.play).toHaveBeenCalledOnce();
  });

  it("forwards rate and loop changes", () => {
    const arco = createPlaybackArco({ values: [10, 20] });

    arco._cyclePlaybackSpeed();
    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { stepsPerSecond: 4 },
    });

    arco.toggleLoop();
    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { loop: false },
    });

    arco.play();
    arco.stop();
    expect(arco._z.pause).toHaveBeenCalledOnce();
  });

  it("preserves playback state received before controls are built", () => {
    const arco = createPlaybackArco({ values: [10, 20] });
    arco._playbackSpeed = 4;

    arco._on_playback_change(true);
    buttons(arco);

    expect(arco.elButtonPlay.classList.contains("playing")).toBe(true);
    expect(arco.elButtonLoop.classList.contains("active")).toBe(true);
    expect(arco.elButtonRate.textContent).toBe("4/s");
  });

  it("forwards generated GeoVideo playback options through update", async () => {
    const arco = createPlaybackArco({ values: [10, 20] });

    await arco.update({
      geoVideo: { autoplay: true, loop: false, stepsPerSecond: 5 },
    });

    expect(arco._z.update).toHaveBeenCalledWith({
      geoVideo: { autoplay: true, loop: false, stepsPerSecond: 5 },
    });
    expect(arco._opt.loop).toBe(false);
    expect(arco._playbackSpeed).toBe(5);
  });

  it("keeps GeoVideo playing through a slider scrub", async () => {
    vi.useFakeTimers();
    const arco = createPlaybackArco({ values: [10, 20, 30, 40] });
    arco._z.pause = vi.fn(() => arco._on_playback_change(false));
    buttons(arco);
    arco.play();

    arco._scrub.begin();
    arco._scrub.request(30);
    vi.advanceTimersToNextFrame();
    arco._on_time_change(20);
    arco._scrub.request(40);
    arco._scrub.end();
    await vi.advanceTimersByTimeAsync(0);

    expect(arco._z.pause).toHaveBeenCalledOnce();
    expect(arco._playing).toBe(true);
    expect(arco.elButtonPlay.classList.contains("playing")).toBe(true);
    expect(arco._z.update.mock.calls).toEqual([[{ time: 30 }], [{ time: 40 }]]);
    expect(arco.getTime()).toBe(40);
    expect(arco._z.play).toHaveBeenCalledTimes(2);
  });

  it("keeps a stepped GeoVideo date while a paused frame reports another", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30, 40] });

    arco.stepNext();
    arco._on_time_change(10);

    expect(arco.getTime()).toBe(20);
  });

  it("keeps the latest step when an older step resolves late", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30, 40] });
    arco.elTimeSlider = { noUiSlider: { set: vi.fn() } };
    const seeks = [];
    const update = arco._z.update;
    arco._z.update = vi.fn((change) => {
      update(change);
      return new Promise((resolve) => seeks.push(resolve));
    });
    // zartigl has applied only the first step
    arco._z.getTimeMeta = vi.fn(() => ({ ...arco._time_meta, current: 20 }));

    arco.stepNext();
    arco.stepNext();
    arco.elTimeSlider.noUiSlider.set.mockClear();
    seeks[0]();
    await Promise.resolve();
    await Promise.resolve();

    expect(arco.getTime()).toBe(30);
    expect(arco.elTimeSlider.noUiSlider.set).not.toHaveBeenCalled();
  });

  it("shows the last played GeoVideo date when playback stops", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30, 40] });
    arco._z.getTimeMeta = vi.fn(() => ({ ...arco._time_meta, current: 40 }));
    arco.play();

    arco._on_playback_change(false);

    expect(arco.getTime()).toBe(40);
    expect(arco._playing).toBe(false);
  });

  it("keeps the scrubbed time when an older seek resolves", async () => {
    const arco = createPlaybackArco({ values: [10, 20, 30, 40] });
    arco._z.getDebugInfo = vi.fn(() => ({ settings: {} }));
    arco.elTimeSlider = { noUiSlider: { set: vi.fn() } };
    // zartigl applied the first seek, the handle has moved on
    arco._time_meta.current = 20;
    arco._z.getTimeMeta = vi.fn(() => ({ ...arco._time_meta }));

    arco._scrub.begin();
    arco._scrub.request(20);
    const seek = arco.update({ time: 20 });
    arco._scrub.request(40);
    await seek;

    expect(arco.getTime()).toBe(40);
    expect(arco.elTimeSlider.noUiSlider.set).not.toHaveBeenCalled();
    expect(arco._z.getDebugInfo).not.toHaveBeenCalled();
    arco._scrub.cancel();
  });

  it("seeks once on release where playback is unavailable", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30], available: false });

    arco._scrub.begin();
    arco._scrub.request(20);
    arco._scrub.request(30);
    expect(arco._z.update).not.toHaveBeenCalled();
    expect(arco.getTime()).toBe(30);

    arco._scrub.end();
    expect(arco._z.update).toHaveBeenCalledOnce();
    expect(arco._z.update).toHaveBeenCalledWith({ time: 30 });
    expect(arco._playing).toBe(false);
  });

  it("does not resume after an explicit stop during a scrub", () => {
    const arco = createPlaybackArco({ values: [10, 20, 30] });
    arco.play();

    arco._scrub.begin();
    arco._scrub.request(20);
    arco.stop();
    arco._scrub.end();

    expect(arco._playing).toBe(false);
    expect(arco.getTime()).toBe(20);
    expect(arco._z.update).not.toHaveBeenCalled();
    expect(arco._z.play).toHaveBeenCalledOnce();
  });

  it("clears optimistic playback state when GeoVideo autoplay is rejected", async () => {
    const error = new Error("autoplay rejected");
    const arco = createPlaybackArco({ values: [10, 20] });
    arco._z.play = vi.fn(() => Promise.reject(error));
    arco._on_error = vi.fn();
    buttons(arco);

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
    // zartigl plays a looping snapshot, which has no step to move to.
    arco._z = {
      getPlaybackState: () => ({
        available: true,
        playing: false,
        loop: true,
        stepsPerSecond: 2,
        speeds: [2],
      }),
      getSteppedTime: () => undefined,
    };
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

describe("ArcoMapLegend value readout", () => {
  const times = Array.from({ length: 17 }, (_, index) => index * 10);
  const depths = [0, 10, 20];

  function createReadoutArco({ mode, data }) {
    const arco = createPlaybackArco({ values: times });
    delete arco._updateValueReadout;
    arco._depths = depths;
    arco._depth = depths[0];
    arco._z.getDepthMeta = vi.fn(() => ({
      values: depths,
      label: "depth",
      current: arco._depth,
    }));
    arco._point = { longitude: 1, latitude: 2 };
    arco._chart_mode = mode;
    arco._update_chart_debounced = vi.fn();
    arco.elValue = document.createElement("span");
    const markers = [];
    arco._chart = new ArcoChart({
      echarts: {
        init: () => ({
          clear: vi.fn(),
          getDom: () => document.createElement("div"),
          getOption: () => ({ series: [{}] }),
          setOption: vi.fn((option) => {
            const markPoint = option.series?.[0]?.markPoint;
            if (markPoint) {
              markers.push(markPoint.data[0]?.coord);
            }
          }),
        }),
      },
      elContainer: document.createElement("div"),
    });
    arco._chart.init();
    arco._chart.setSeries({ data, mode });
    return { arco, markers };
  }

  it("follows the drawn line at every step, between decimated samples", () => {
    // decimated chart series : one sample every 8 steps
    const { arco, markers } = createReadoutArco({
      mode: "time",
      data: [
        [0, 1],
        [80, 9],
        [160, 1],
      ],
    });

    const readouts = [];
    for (let step = 0; step < 3; step++) {
      arco.stepNext(true);
      readouts.push(arco.elValue.innerText);
    }

    expect(readouts).toEqual(["2.00", "3.00", "4.00"]);
    // the cursor point on the chart carries the same value as the readout
    expect(markers.slice(-3)).toEqual([
      [10, 2],
      [20, 3],
      [30, 4],
    ]);
  });

  it("moves the depth profile cursor without querying the profile again", async () => {
    const { arco, markers } = createReadoutArco({
      mode: "depth",
      data: [
        [0, 1],
        [10, 3],
        [20, 5],
      ],
    });

    await arco.setDepth(10);

    expect(arco.elValue.innerText).toBe("3.00");
    expect(markers.at(-1)).toEqual([10, 3]);
    expect(arco._update_chart_debounced).not.toHaveBeenCalled();
  });

  it("queries the time series again when the depth changes", async () => {
    const { arco, markers } = createReadoutArco({
      mode: "time",
      data: [
        [0, 1],
        [160, 1],
      ],
    });
    const count = markers.length;

    await arco.setDepth(10);

    expect(arco._update_chart_debounced).toHaveBeenCalled();
    expect(markers).toHaveLength(count);
  });
});
