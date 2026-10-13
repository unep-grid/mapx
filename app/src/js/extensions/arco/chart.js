import { theme } from "../../mx";
import { debounce } from "../../mx_helper_misc";

/**
 * Small echarts wrapper for the ARCO extension :
 * time series / depth profile line chart with a time cursor.
 */
export class ArcoChart {
  constructor(options) {
    const { echarts, elContainer } = options;
    this._echarts = echarts;
    this._el = elContainer;
    this._chart = null;
    this._observer = null;
    this._mode = "time";
    this._cursor = null;
    this._data = null;
  }

  init() {
    const idTheme = theme.isDark() ? "dark" : "westeros";
    this._chart = this._echarts.init(this._el, idTheme, {
      renderer: "svg",
    });
    this._chart.getDom().style.backgroundColor = "transparent";

    if (typeof ResizeObserver !== "undefined") {
      this._observer = new ResizeObserver(
        debounce(() => this._chart?.resize(), 100),
      );
      this._observer.observe(this._el);
    }
    this.showMessage("Use the target button, then click on the map");
  }

  /**
   * @param {Object} opt
   * @param {Array<Array<number>>} opt.data [axisValue, value] pairs
   * @param {String} opt.mode "time" | "depth"
   * @param {String} opt.unit value unit, e.g. "m s-1"
   * @param {String} opt.label series label
   * @param {String} opt.verticalLabel vertical axis label
   */
  setSeries(opt) {
    const { data, mode, unit, label, verticalLabel } = opt;
    if (mode !== this._mode) {
      // a time cursor means nothing on a depth axis, and vice versa
      this._cursor = null;
    }
    this._mode = mode;
    this._data = data;
    const accent = getAccentColor();

    this._chart.clear();
    this._chart.setOption({
      backgroundColor: "transparent",
      grid: {
        top: 30,
        left: 45,
        right: 20,
        bottom: 25,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: getUiColor("--mx_ui_background", "#fff"),
        borderColor: getUiColor("--mx_ui_border", "#ccc"),
        textStyle: {
          color: getUiColor("--mx_ui_text", "#333"),
        },
        valueFormatter: (value) => `${formatValue(value)} ${unit || ""}`,
      },
      xAxis: {
        type: mode === "time" ? "time" : "value",
        name: mode === "time" ? null : verticalLabel || "Depth",
        nameLocation: "middle",
        nameGap: 22,
      },
      yAxis: {
        type: "value",
        name: unit || null,
        nameTextStyle: {
          align: "left",
        },
        scale: true,
      },
      series: [
        {
          name: label,
          type: "line",
          showSymbol: false,
          animation: false,
          color: accent,
          lineStyle: {
            width: 1.5,
          },
          // Axis-triggered tooltip highlights the hovered point and blurs
          // the rest of the line by default, which looks like the line
          // vanishes on hover since no symbol is shown to carry the highlight.
          emphasis: {
            disabled: true,
          },
          data: data,
        },
      ],
    });

    if (this._cursor !== null) {
      this.setCursor(this._cursor);
    }
  }

  /**
   * Value of the drawn line at an axis position, see lineValueAt().
   * @param {Number} x axis position : epoch ms or depth
   * @return {Number} NaN without a line at x
   */
  valueAt(x) {
    return this._data ? lineValueAt(this._data, x) : NaN;
  }

  /**
   * Dashed vertical line at the current time or depth, with a point where it
   * crosses the drawn line.
   * @param {Number} x axis position : epoch ms or depth, as the series mode
   */
  setCursor(x) {
    this._cursor = x;
    if (!this._chart || this.isEmpty()) {
      return;
    }
    const value = this.valueAt(x);
    const accent = getAccentColor();
    // lazyUpdate : coalesce rapid cursor moves (scrub, playback) per frame
    this._chart.setOption(
      {
        series: [
          {
            markPoint: {
              symbol: "circle",
              symbolSize: 7,
              animation: false,
              label: { show: false },
              itemStyle: { color: accent },
              data: Number.isFinite(value)
                ? [{ coord: [x, value], value }]
                : [],
            },
            markLine: {
              symbol: "none",
              animation: false,
              label: { show: false },
              lineStyle: {
                type: "dashed",
                color: accent,
              },
              data: [{ xAxis: x }],
            },
          },
        ],
      },
      { lazyUpdate: true },
    );
  }

  showMessage(text) {
    this._data = null;
    if (!this._chart) {
      return;
    }
    this._chart.clear();
    this._chart.setOption({
      backgroundColor: "transparent",
      title: {
        text: text,
        left: "center",
        top: "middle",
        textStyle: {
          color: getUiColor("--mx_ui_text_faded", "#777"),
          fontSize: 12,
          fontWeight: "normal",
        },
      },
    });
  }

  isEmpty() {
    const option = this._chart?.getOption();
    return !option?.series?.length;
  }

  clear() {
    this._cursor = null;
    this._data = null;
    this._chart?.clear();
  }

  destroy() {
    this._observer?.disconnect();
    this._observer = null;
    this._chart?.dispose();
    this._chart = null;
  }
}

/**
 * Chart value text, shared by the tooltip and the cursor readout.
 * @param {Number} value
 * @return {String}
 */
export function formatValue(value) {
  return Number.isFinite(value) ? value.toPrecision(3) : "-";
}

/**
 * Value of the drawn line at an axis position : linear interpolation between
 * the bracketing samples, like the straight segments of the line series.
 * The series may be decimated, so this is not necessarily a dataset sample.
 * Outside the series, or across a gap, there is no line : NaN.
 * @param {Array<Array<number>>} data [axisValue, value] pairs, monotonic axis
 * @param {Number} x axis position
 * @return {Number}
 */
function lineValueAt(data, x) {
  for (let i = 0; i < data.length; i++) {
    const [x0, y0] = data[i];
    if (x0 === x) {
      return y0;
    }
    const next = data[i + 1];
    if (!next) {
      break;
    }
    const [x1, y1] = next;
    if (Math.min(x0, x1) < x && x < Math.max(x0, x1)) {
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return NaN;
}

function getAccentColor() {
  return getUiColor("--mx_ui_link", "#12b0f8");
}

function getUiColor(property, fallback) {
  const color = getComputedStyle(document.body)
    .getPropertyValue(property)
    .trim();
  return color || fallback;
}
