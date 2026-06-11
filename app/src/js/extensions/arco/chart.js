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
   */
  setSeries(opt) {
    const { data, mode, unit, label } = opt;
    this._mode = mode;
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
        valueFormatter: (value) =>
          `${isFinite(value) ? value.toPrecision(4) : "-"} ${unit || ""}`,
      },
      xAxis: {
        type: mode === "time" ? "time" : "value",
        name: mode === "time" ? null : "depth",
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
          data: data,
        },
      ],
    });

    if (this._cursor !== null) {
      this.setCursor(this._cursor);
    }
  }

  /**
   * Dashed vertical line at the current time. Time mode only.
   * @param {Number} ms epoch ms
   */
  setCursor(ms) {
    this._cursor = ms;
    if (!this._chart || this._mode !== "time" || this.isEmpty()) {
      return;
    }
    this._chart.setOption({
      series: [
        {
          markLine: {
            symbol: "none",
            animation: false,
            label: { show: false },
            lineStyle: {
              type: "dashed",
              color: getAccentColor(),
            },
            data: [{ xAxis: ms }],
          },
        },
      ],
    });
  }

  showMessage(text) {
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
    this._chart?.clear();
  }

  destroy() {
    this._observer?.disconnect();
    this._observer = null;
    this._chart?.dispose();
    this._chart = null;
  }
}

function getAccentColor() {
  const accent = getComputedStyle(document.body)
    .getPropertyValue("--mx_ui_link")
    .trim();
  return accent || "#12b0f8";
}
