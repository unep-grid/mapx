import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mx", () => ({
  theme: { isDark: () => true },
}));

import { ArcoChart, formatValue } from "./chart.js";

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

describe("ArcoChart line value", () => {
  // decimated series : one sample every 8 steps
  const data = [
    [0, 1],
    [80, 9],
    [160, 1],
  ];
  let chartApi;
  let chart;

  function createChart(series) {
    let option = {};
    chartApi = {
      clear: vi.fn(() => (option = {})),
      dispose: vi.fn(),
      getDom: () => document.createElement("div"),
      getOption: () => option,
      setOption: vi.fn((next) => (option = { ...option, ...next })),
    };
    chart = new ArcoChart({
      echarts: { init: () => chartApi },
      elContainer: document.createElement("div"),
    });
    chart.init();
    chart.setSeries({ data: series, mode: "time", unit: "m", label: "SIT" });
    return chart;
  }

  it("returns samples on the line exactly", () => {
    createChart(data);
    expect(chart.valueAt(0)).toBe(1);
    expect(chart.valueAt(80)).toBe(9);
    expect(chart.valueAt(160)).toBe(1);
  });

  it("follows the drawn segment between decimated samples", () => {
    createChart(data);
    expect(chart.valueAt(10)).toBe(2);
    expect(chart.valueAt(20)).toBe(3);
    expect(chart.valueAt(120)).toBe(5);
  });

  it("handles descending axes such as elevation profiles", () => {
    createChart([
      [0, 10],
      [-50, 20],
    ]);
    expect(chart.valueAt(-25)).toBe(15);
  });

  it("has no value outside the series, across a gap, or without a series", () => {
    createChart(data);
    expect(chart.valueAt(-1)).toBeNaN();
    expect(chart.valueAt(161)).toBeNaN();
    createChart([
      [0, 1],
      [10, NaN],
    ]);
    expect(chart.valueAt(5)).toBeNaN();
    chart.showMessage("Loading…");
    expect(chart.valueAt(0)).toBeNaN();
  });

  it("marks the cursor on the line with the value the tooltip formats", () => {
    createChart(data);
    const tooltip = chartApi.setOption.mock.calls.at(-1)[0].tooltip;

    chart.setCursor(10);

    const { markPoint } = chartApi.setOption.mock.calls.at(-1)[0].series[0];
    expect(markPoint.data).toEqual([{ coord: [10, 2], value: 2 }]);
    expect(tooltip.valueFormatter(chart.valueAt(10))).toBe(
      `${formatValue(2)} m`,
    );
  });

  it("marks a depth profile cursor on the depth axis", () => {
    createChart(data);
    chart.setSeries({ data, mode: "depth", unit: "m", label: "SIT" });

    chart.setCursor(40);

    const { markPoint, markLine } =
      chartApi.setOption.mock.calls.at(-1)[0].series[0];
    expect(markPoint.data).toEqual([{ coord: [40, 5], value: 5 }]);
    expect(markLine.data).toEqual([{ xAxis: 40 }]);
  });

  it("does not carry a time cursor over to a depth profile", () => {
    createChart(data);
    chart.setCursor(10);
    const calls = chartApi.setOption.mock.calls.length;

    chart.setSeries({ data, mode: "depth", unit: "m", label: "SIT" });

    expect(chartApi.setOption.mock.calls).toHaveLength(calls + 1);
  });

  it("drops the cursor point where no line is drawn", () => {
    createChart(data);

    chart.setCursor(200);

    const { markPoint } = chartApi.setOption.mock.calls.at(-1)[0].series[0];
    expect(markPoint.data).toEqual([]);
  });
});

describe("formatValue", () => {
  it("formats finite values and a placeholder otherwise", () => {
    expect(formatValue(1.4684)).toBe("1.47");
    expect(formatValue(NaN)).toBe("-");
    expect(formatValue(undefined)).toBe("-");
  });
});
