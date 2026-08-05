import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mx", () => ({
  theme: { isDark: () => true },
}));

import { ArcoChart } from "./chart.js";

describe("ArcoChart messages", () => {
  let chartApi;
  let echarts;

  beforeEach(() => {
    document.body.style.removeProperty("--mx_ui_text_faded");
    chartApi = {
      clear: vi.fn(),
      dispose: vi.fn(),
      getDom: () => document.createElement("div"),
      getOption: () => ({}),
      setOption: vi.fn(),
    };
    echarts = { init: vi.fn(() => chartApi) };
  });

  it("uses the MapX faded-text token instead of the ECharts title color", () => {
    document.body.style.setProperty("--mx_ui_text_faded", "#aabbcc");
    const chart = new ArcoChart({
      echarts,
      elContainer: document.createElement("div"),
    });

    chart.init();

    const option = chartApi.setOption.mock.calls.at(-1)[0];
    expect(option.title.textStyle.color).toBe("#aabbcc");
  });

  it("uses a readable fallback when the MapX token is unavailable", () => {
    const chart = new ArcoChart({
      echarts,
      elContainer: document.createElement("div"),
    });

    chart.init();

    const option = chartApi.setOption.mock.calls.at(-1)[0];
    expect(option.title.textStyle.color).toBe("#777");
  });
});
