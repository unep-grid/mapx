import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../el_mapx", () => ({
  el: () => document.createElement("div"),
}));

vi.mock("../../map_helpers", () => ({
  layersOrderAuto: vi.fn(),
}));

vi.mock("../../settings", () => ({
  settings: { layerBefore: null },
}));

vi.mock("../../mx_helper_misc", () => ({
  makeId: () => "test-id",
}));

import { BaseTimeMapLegend } from "./base_time_map_legend.js";

describe("BaseTimeMapLegend visibility-aware playback", () => {
  afterEach(() => vi.useRealTimers());

  it("removes raster sources while hidden and resumes playback once visible", async () => {
    vi.useFakeTimers();
    const map = { getContainer: () => document.createElement("div") };
    const legend = new BaseTimeMapLegend({ map, transitionDuration: 100 });
    legend._initialized = true;
    legend.clearAll = vi.fn();
    legend.updateMapSource = vi.fn();
    legend.next = vi.fn();
    legend.onRender = vi.fn();

    legend.start();
    expect(legend.next).toHaveBeenCalledOnce();
    legend._setVisible(false);
    expect(legend.clearAll).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(500);
    expect(legend.next).toHaveBeenCalledOnce();

    legend._setVisible(true);
    expect(legend.updateMapSource).toHaveBeenCalledWith(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(legend.next).toHaveBeenCalledTimes(2);
    legend.destroy();
  });

  it("honors an explicit stop while suspended", async () => {
    vi.useFakeTimers();
    const legend = new BaseTimeMapLegend({ transitionDuration: 100 });
    legend._initialized = true;
    legend.clearAll = vi.fn();
    legend.updateMapSource = vi.fn();
    legend.next = vi.fn();
    legend.onRender = vi.fn();

    legend.start();
    legend._setVisible(false);
    legend.stop();
    legend._setVisible(true);
    await vi.advanceTimersByTimeAsync(100);

    expect(legend.next).toHaveBeenCalledOnce();
    legend.destroy();
  });
});
