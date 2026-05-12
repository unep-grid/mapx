import "./style.less";
import wmoTopology from "./WMO_basemap_boundaries.json";
import { el, elAuto, elWait } from "../el_mapx";
import { getViewAuto, viewLink } from "../map_helpers";
import {
  getDictItem,
  getLanguageCurrent,
  getLanguageItem,
  updateLanguageElements,
} from "../language";
import { isLanguageObject, isView, isViewId } from "../is_test_mapx";
import { objectToArray, debounce } from "../mx_helper_misc";
import { moduleLoad } from "../modules_loader_async";
import { settings, theme, ws } from "../mx";
import { MenuBuilder } from "../metadata/menu";
import {
  aggregateCountryMonthRange,
  buildCountryPoints,
  buildMonthKeys,
  fillMonthlyCounts,
  formatMonthLabel,
  limitCountryRows,
  symbolSizeByCount,
} from "./helpers";

const defOpt = {
  add_menu: true,
  stat_n_days: 365 * 5,
  stat_n_months: 60,
};

const MAP_NAME = "mapx-view-stats-wmo";

export class ViewStats {
  constructor(idView, elTarget, opt) {
    this.idView = idView;
    this.elTarget = elTarget;
    this.opt = Object.assign({}, defOpt, opt);
    this.charts = [];
    this.resizeObservers = [];
    this.sliders = [];
    this.tabs = new Map();
    this.panels = new Map();
  }

  async init() {
    this.view = await getViewAuto(this.idView);

    if (!isView(this.view)) {
      this.elTarget.replaceChildren("View not found");
      return this;
    }

    this.idView = this.view.id;
    this.stats = await getViewStats(
      this.idView,
      this.opt.stat_n_days,
      this.opt.stat_n_months,
    );
    await this.render();
    return this;
  }

  async render() {
    this.destroy();
    this.elTarget.replaceChildren(elWait("Please wait..."));

    this.root = el("div", {
      class: "mx-view-stats",
    });

    this.elTarget.replaceChildren(this.root);

    this.renderSummary();
    await this.renderTabs();

    if (this.opt.add_menu) {
      new MenuBuilder(this.root);
    }

    await updateLanguageElements({
      el: this.root,
    });

    await this.renderCharts();
  }

  destroy() {
    for (const ro of this.resizeObservers) {
      ro.disconnect();
    }
    for (const chart of this.charts) {
      chart.dispose();
    }
    for (const slider of this.sliders) {
      slider.destroy();
    }
    this.resizeObservers = [];
    this.charts = [];
    this.sliders = [];
    this.tabs = new Map();
    this.panels = new Map();
  }

  resize() {
    for (const chart of this.charts) {
      chart.resize();
    }
  }

  renderSummary() {
    const tblSummary = this.buildSummaryTable();
    const elSummary = elAuto("array_table", tblSummary, {
      render: "array_table",
      tableHeadersSkip: true,
      tableTitle: "meta_view_table_summary_title",
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true,
      numberStyle: { marginRight: "5px" },
      tableContainerClass: ["panel", "panel-default", "mx-view-stats--summary"],
    });

    this.root.appendChild(elSummary);
  }

  buildSummaryTable() {
    const prefixKey = "meta_view_";
    const keys = [
      "title",
      "id",
      "stat_n_add",
      "stat_n_add_by_guests",
      "stat_n_add_by_users",
      "stat_n_add_by_distinct_users",
    ];

    return objectToArray(this.stats || {}, true)
      .filter((row) => keys.includes(row.key))
      .map((row) => {
        if (row.key === "title") {
          row.value = el(
            "a",
            {
              href: viewLink(this.idView),
              target: "_blank",
            },
            isLanguageObject(row.value)
              ? getLanguageItem(row.value)
              : row.value,
          );
        }

        row.key = `${prefixKey}${row.key}`;
        return row;
      });
  }

  async renderTabs() {
    const tabs = [
      {
        id: "country",
        icon: "fa fa-bar-chart",
        label: await getDictItem("meta_view_stat_n_add_by_country"),
      },
      {
        id: "monthly",
        icon: "fa fa-line-chart",
        label: await getDictItem("meta_view_stat_n_add_by_month"),
      },
      {
        id: "map",
        icon: "fa fa-globe",
        label: await getDictItem("meta_view_stat_n_add_by_country_month"),
      },
    ];

    const elTabs = el("div", {
      class: "mx-tab--tabs",
    });
    const elPanelWrap = el("div", {
      class: "mx-view-stats--panels",
    });

    for (const tab of tabs) {
      const elTab = el(
        "button",
        {
          class: ["mx-tab--tab", tab.id === "country" ? "active" : ""],
          dataset: {
            tab: tab.id,
          },
          on: ["click", () => this.activateTab(tab.id)],
        },
        el("i", { class: tab.icon }),
        el("span", tab.label),
      );
      const elPanel = el("div", {
        class: ["mx-tab--panel", tab.id === "country" ? "active" : ""],
      });

      this.tabs.set(tab.id, elTab);
      this.panels.set(tab.id, elPanel);
      elTabs.appendChild(elTab);
      elPanelWrap.appendChild(elPanel);
    }

    this.root.appendChild(elTabs);
    this.root.appendChild(elPanelWrap);
  }

  activateTab(id) {
    for (const [tabId, elTab] of this.tabs) {
      elTab.classList.toggle("active", tabId === id);
    }
    for (const [panelId, elPanel] of this.panels) {
      elPanel.classList.toggle("active", panelId === id);
    }
    this.resize();
  }

  async renderCharts() {
    await Promise.all([
      this.renderCountryChart(),
      this.renderMonthlyChart(),
      this.renderMapChart(),
    ]);
  }

  async renderCountryChart() {
    const panel = this.panels.get("country");
    const rows = this.stats?.stat_n_add_by_country || [];
    const title = await getDictItem(
      "meta_view_stat_n_add_by_country_last_year",
    );

    if (!rows.length) {
      panel.appendChild(this.emptyPanel(title, await getDictItem("empty")));
      return;
    }

    const elChart = this.chartPanel(panel, "mx-view-stats--chart-country");
    const echarts = await moduleLoad("echarts");
    const chart = this.initChart(echarts, elChart);
    const others = await getDictItem("meta_view_stat_others_countries");
    const displayData = limitCountryRows(rows, 20, others);
    const countryNames = await this.countryNameMap(rows);
    const txtReads = await getDictItem("meta_view_stat_activations");
    const axisTitle = await getDictItem("meta_view_stat_n_add_by_country_axis");
    const seriesName = await getDictItem("meta_view_stat_n_add_by_country");

    elChart.style.height = `${displayData.length * 30 + 120}px`;
    chart.setOption({
      backgroundColor: this.color("mx_ui_background"),
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const countryName = countryNames.get(params.name) || params.name;
          return `${countryName} : ${params.value} ${txtReads}`;
        },
      },
      grid: {
        left: "3%",
        right: "8%",
        bottom: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: axisTitle,
        nameLocation: "middle",
        nameGap: 42,
      },
      yAxis: {
        type: "category",
        data: displayData.map((d) => d.country),
        inverse: true,
      },
      series: [
        {
          name: seriesName,
          type: "bar",
          data: displayData.map((d) => d.count),
          itemStyle: {
            color: this.color("mx_ui_link"),
          },
          label: {
            show: true,
            position: "right",
            formatter: "{c}",
          },
        },
      ],
      toolbox: this.toolbox(),
    });
  }

  async renderMonthlyChart() {
    const panel = this.panels.get("monthly");
    const monthKeys = buildMonthKeys();
    const rows = fillMonthlyCounts(this.stats?.stat_n_add_by_month, monthKeys);
    const title = await getDictItem("meta_view_stat_n_add_by_month");
    const elChart = this.chartPanel(panel, "mx-view-stats--chart");
    const echarts = await moduleLoad("echarts");
    const chart = this.initChart(echarts, elChart);
    const locale = getLanguageCurrent();
    const labels = rows.map((row) => formatMonthLabel(row.month, locale));
    const txtReads = await getDictItem("meta_view_stat_activations");

    chart.setOption({
      backgroundColor: this.color("mx_ui_background"),
      tooltip: {
        trigger: "axis",
        formatter: (items) => {
          const item = items[0];
          return `${item.axisValue} : ${item.value} ${txtReads}`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          rotate: 35,
        },
      },
      yAxis: {
        type: "value",
      },
      series: [
        {
          name: txtReads,
          type: "bar",
          data: rows.map((row) => row.count),
          itemStyle: {
            color: this.color("mx_ui_link"),
          },
        },
        {
          name: txtReads,
          type: "line",
          data: rows.map((row) => row.count),
          symbolSize: 6,
          lineStyle: {
            color: this.color("mx_ui_link"),
          },
          itemStyle: {
            color: this.color("mx_ui_link"),
          },
        },
      ],
      toolbox: this.toolbox(),
    });
  }

  async renderMapChart() {
    const panel = this.panels.get("map");
    const monthKeys = buildMonthKeys();
    const rows = this.stats?.stat_n_add_by_country_month || [];
    const aggregated = aggregateCountryMonthRange(rows, monthKeys);
    const title = await getDictItem("meta_view_stat_n_add_by_country_month");

    if (aggregated.max <= 0) {
      panel.appendChild(this.emptyPanel(title, await getDictItem("empty")));
      return;
    }

    const elSlider = await this.buildMapRangeSlider(panel, monthKeys);
    const elChart = this.chartPanel(panel, "mx-view-stats--chart-map");
    const [echarts, topojson, d3Geo] = await Promise.all([
      moduleLoad("echarts"),
      moduleLoad("topojson"),
      moduleLoad("d3-geo"),
    ]);
    const geojson = this.registerMap(echarts, topojson);
    const centroids = this.countryCentroids(geojson, d3Geo);
    const chart = this.initChart(echarts, elChart);
    const countryNames = await this.countryNameMap(
      this.stats?.stat_n_add_by_country_month || [],
    );
    const txtReads = await getDictItem("meta_view_stat_activations");

    const updateMap = (range) => {
      const dataRange = aggregateCountryMonthRange(rows, monthKeys, range);
      const points = buildCountryPoints(dataRange, centroids);
      const labelRange = this.formatMonthRange(monthKeys, range);

      chart.setOption({
        title: {
          text: labelRange,
          left: "center",
          top: 8,
          textStyle: {
            color: this.color("mx_ui_text"),
            fontSize: 13,
            fontWeight: "normal",
          },
        },
        backgroundColor: this.color("mx_ui_background"),
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const countryName = countryNames.get(params.name) || params.name;
            const value = params.data?.count || params.value?.[2] || 0;
            return `${countryName}<br>${labelRange}<br>${value} ${txtReads}`;
          },
        },
        geo: {
          map: MAP_NAME,
          roam: true,
          silent: true,
          itemStyle: {
            areaColor: this.color("mx_ui_background_faded"),
            borderColor: this.color("mx_ui_border"),
            borderWidth: 0.6,
          },
          emphasis: {
            disabled: true,
          },
        },
        series: [
          {
            name: title,
            type: "scatter",
            coordinateSystem: "geo",
            data: points,
            symbolSize: (value) =>
              symbolSizeByCount(value?.[2], dataRange.max),
            itemStyle: {
              color: this.color("mx_ui_link"),
              opacity: 0.72,
              borderColor: this.color("mx_ui_background"),
              borderWidth: 1,
            },
            emphasis: {
              itemStyle: {
                color: this.color("mx_ui_input_accent"),
                opacity: 0.9,
              },
            },
          },
        ],
        toolbox: this.toolbox(),
      });
    };

    elSlider._updateMap = updateMap;
    updateMap([0, monthKeys.length - 1]);
  }

  async buildMapRangeSlider(panel, monthKeys) {
    const noUiSlider = await moduleLoad("nouislider");
    const locale = getLanguageCurrent();
    const elDynMin = el("span", { class: "mx-slider-dyn-min" });
    const elDynMax = el("span", { class: "mx-slider-dyn-max" });
    const elRangeMin = el(
      "span",
      { class: "mx-slider-range-min" },
      formatMonthLabel(monthKeys[0], locale),
    );
    const elRangeMax = el(
      "span",
      { class: "mx-slider-range-max" },
      formatMonthLabel(monthKeys[monthKeys.length - 1], locale),
    );
    const elSlider = el("div", {
      class: ["mx-slider", "mx-view-stats--range-slider"],
    });

    panel.appendChild(
      el("div", { class: ["mx-slider-container", "mx-view-stats--range"] }, [
        el("div", { class: "mx-slider-header" }, [
          el("div", { class: "mx-slider-dyn" }, [elDynMin, elDynMax]),
        ]),
        elSlider,
        el("div", { class: "mx-slider-range" }, [elRangeMin, elRangeMax]),
      ]),
    );

    const slider = noUiSlider.create(elSlider, {
      range: { min: 0, max: monthKeys.length - 1 },
      step: 1,
      start: [0, monthKeys.length - 1],
      connect: true,
      behaviour: "drag",
      tooltips: false,
      format: {
        to: (value) => Math.round(value),
        from: (value) => Math.round(value),
      },
    });

    slider.on(
      "update",
      debounce((values) => {
        const range = values.map((value) => Number(value));
        elDynMin.innerHTML = formatMonthLabel(monthKeys[range[0]], locale);
        elDynMax.innerHTML = ` – ${formatMonthLabel(
          monthKeys[range[1]],
          locale,
        )}`;
        if (elSlider._updateMap) {
          elSlider._updateMap(range);
        }
      }, 100),
    );

    this.sliders.push(slider);
    return elSlider;
  }

  chartPanel(panel, className) {
    const elChart = el("div", {
      class: ["mx-view-stats--chart", className],
    });
    panel.appendChild(elChart);
    return elChart;
  }

  emptyPanel(title, label) {
    return el("div", { class: "mx-view-stats--empty" }, `${title}: ${label}`);
  }

  initChart(echarts, elChart) {
    const idTheme = theme.isDark() ? "dark" : "westeros";
    const chart = echarts.init(elChart, idTheme, {
      renderer: "svg",
    });

    this.charts.push(chart);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(
        debounce(() => chart.resize(), 100),
      );
      resizeObserver.observe(elChart);
      this.resizeObservers.push(resizeObserver);
    }

    return chart;
  }

  registerMap(echarts, topojson) {
    if (ViewStats._mapRegistered) {
      return ViewStats._mapGeojson;
    }

    const geojson = topojson.feature(
      wmoTopology,
      wmoTopology.objects.WMO_basemap_boundaries,
    );

    for (const feature of geojson.features) {
      feature.properties.name = feature.properties.ISO_2_CODE;
    }

    echarts.registerMap(MAP_NAME, geojson);
    ViewStats._mapRegistered = true;
    ViewStats._mapGeojson = geojson;
    return geojson;
  }

  countryCentroids(geojson, d3Geo) {
    if (ViewStats._countryCentroids) {
      return ViewStats._countryCentroids;
    }

    const centroids = new Map();
    for (const feature of geojson.features || []) {
      const country = feature.properties?.ISO_2_CODE;
      if (country) {
        centroids.set(country, d3Geo.geoCentroid(feature));
      }
    }
    ViewStats._countryCentroids = centroids;
    return centroids;
  }

  formatMonthRange(monthKeys, range) {
    const locale = getLanguageCurrent();
    const start = Math.max(0, Math.min(range[0], range[1]));
    const end = Math.min(monthKeys.length - 1, Math.max(range[0], range[1]));
    const from = formatMonthLabel(monthKeys[start], locale);
    const to = formatMonthLabel(monthKeys[end], locale);
    return start === end ? from : `${from} – ${to}`;
  }

  async countryNameMap(rows) {
    const names = new Map();
    const countries = [
      ...new Set((rows || []).map((row) => row.country || "?")),
    ];

    for (const country of countries) {
      names.set(
        country,
        country === "?" ? "Unknown" : await getDictItem(country),
      );
    }

    return names;
  }

  color(id) {
    return theme.getColorThemeItem(id) || theme.colors()?.[id]?.color || "";
  }

  toolbox() {
    return {
      feature: {
        saveAsImage: {},
        dataView: { readOnly: true },
        restore: {},
      },
    };
  }
}

export async function getViewStats(
  id,
  stat_n_days = 365 * 5,
  stat_n_months = 60,
) {
  if (!isViewId(id)) {
    return console.warn("getViewStats : invalid id");
  }

  return ws.emitAsync(
    "/client/view/get/stats",
    {
      idView: id,
      stat_n_days,
      stat_n_months,
    },
    settings.maxTimeFetch,
  );
}

export async function viewStatsToUi(idView, elTarget, opt) {
  const viewStats = new ViewStats(idView, elTarget, opt);
  await viewStats.init();
  return viewStats;
}
