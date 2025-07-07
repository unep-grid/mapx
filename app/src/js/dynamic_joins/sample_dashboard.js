/**
 * Widget 'graph'
 */
function handler() {
  const { moduleLoad, el } = mx.helpers;

  const local = {};

  return {
    async onAdd(widget) {
      const echarts = await moduleLoad("echarts");
      const elChart = el("div", { style: { width: "100%", height: "100%" } });

      widget.setContent(elChart);

      local.chart = echarts.init(elChart);
    },

    /**
     * Called when the widget is removed from the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onRemove(widget) {
      if (local?.chart) {
        local?.chart?.dispose();
      }
    },

    /**
     * Called when/if the widget receives new data.
     * @param {Object} widget - The widget instance.
     * @param {Object} data - The new data for the widget.
     * @returns {Promise<void>}
     */
    async onData(widget, data) {
      if (!local?.chart) {
        return;
      }

      // Extract x and y values
      const xAxisData = data.map((item) => "DID " + item.did);
      const yAxisData = data.map((item) => item.value);

      // Chart options
      const option = {
        title: {
          text: "Bar Chart of Values by DID",
        },
        tooltip: {},
        xAxis: {
          type: "category",
          data: xAxisData,
        },
        yAxis: {
          type: "value",
        },
        series: [
          {
            name: "Value",
            type: "bar",
            data: yAxisData,
          },
        ],
      };

      local.chart.setOption(option);
    },
  };
}
/**
 * Widget 'time_series'
 */
function handler() {
  const { moduleLoad, el } = mx.helpers;

  const local = {};

  return {
    async onAdd(widget) {
      const echarts = await moduleLoad("echarts");
      const elChart = el("div", { style: { width: "100%", height: "100%" } });
      widget.setContent(elChart);
      local.chart = echarts.init(elChart);
      console.log("chart added");
    },

    /**
     * Called when the widget is removed from the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onRemove(widget) {
      if (local?.chart) {
        local?.chart?.dispose();
      }
    },

    /**
     * Called when/if the widget receives new data.
     * @param {Object} widget - The widget instance.
     * @param {Object} data - The new data for the widget.
     * @returns {Promise<void>}
     */
    async onData(widget, data) {
      if (!local?.chart) {
        return;
      }

      // Group data by `did`
      const seriesMap = new Map();
      for (const item of data) {
        if (!seriesMap.has(item.did)) {
          seriesMap.set(item.did, []);
        }
        seriesMap.get(item.did).push([item.year, item.value]);
      }

      // Sort data points for each series
      for (const points of seriesMap.values()) {
        points.sort((a, b) => a[0] - b[0]);
      }

      // Create series config
      const series = [];
      for (const [did, points] of seriesMap) {
        series.push({
          name: `ID ${did}`,
          type: "line",
          showSymbol: false,
          smooth: true,
          data: points,
        });
      }

      console.log(series);

      const option = {
        grid: { top: 10, bottom: 30, left: 40, right: 10 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "time",
          axisLabel: {
            fontSize: 10,
            formatter: function (value) {
              return `${value}`;
            },
          },
          data: [...new Set(data.map((d) => d.year))].sort(),
        },
        yAxis: {
          type: "value",
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
          scale: true,
        },
        series,
        legend: {
          show: false, // hide legend for minimal UI
        },
      };

      local.chart.setOption(option, {
        replaceMerge: ["series"],
      });
    },
  };
}
/**
 * Widget 'main'
 */
function handler() {
  /**
   * local object for ref accross handlers
   */
  const local = {
    dj: {},
    widget: null,
  };

  const {
    getViewLegend,
    DynamicJoin,
    getApiUrl,
    asArray,
    isNotEmpty,
    isEqual,
  } = mx.helpers;

  return {
    /**
     * Called when the widget is added to the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onAdd(widget) {
      const view = widget.view;

      const idSourceGeom = "mx_bw2pp_3mmcx_lwbtx_fzsqd_bjm0w";

      const tilesUrlBase = getApiUrl("getTile");

      // URL API escapes {x}/{y}/{z}, use concat
      const tilesUrl = [
        `${tilesUrlBase}?idSource=${idSourceGeom}`,
        `attributes=${"gid"},${"id"}`,
        `timestamp=${Date.now()}`,
      ].join("&");

      const tilesUrls = [tilesUrl, tilesUrl];

      local.widget = widget;
      local.dj = new DynamicJoin(widget.map);
      const data = await local.dj.generateSeries();

      await local.dj.init({
        elSelectContainer: widget.elContent,
        elLegendContainer: getViewLegend(view.id, { clone: false }),

        palette: "OrRd",
        stat: "quantile",
        classes: 5,
        colorNa: "#ccc",
        aggregateFn: "none", // none, first, last, sum, max, min, median, mode

        idSourceGeom: idSourceGeom,

        sourceLayer: idSourceGeom,
        data: data,
        tilesUrl: tilesUrls,

        staticFilters: [
          {
            field: "variable",
            operator: "==",
            value: "temp",
          },
        ],
        field: "value",

        fieldJoinData: "did",
        fieldJoinGeom: "gid",
        dynamicFilters: [
          {
            name: "scenario",
            type: "dropdown",
            default: "b",
          },
          {
            name: "team",
            type: "dropdown",
            default: "x",
          },
          {
            name: "year",
            type: "slider",
            single: true,
            integer: true,
          },
        ],

        onAggregated: function (table) {
          console.log("aggregated", table);
        },

        onTableFiltered: function (table) {
          const w = widget.findWidget("graph");
          w.setData(table);
          updateTimeSeries();
        },

        onTableReady: function (table, dj) {
          updateTimeSeries();
        },

        onMapClick: function (features, dj, event) {
          const gids = features.map((feature) => feature.properties.gid);
          updateTimeSeries(gids);
        },
      });
    },

    /**
     * Called when the widget is removed from the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onRemove(widget) {
      if (local?.dj?.destroy) {
        local.dj.destroy();
      }
    },

    /**
     * Called when/if the widget receives new data.
     * @param {Object} widget - The widget instance.
     * @param {Object} data - The new data for the widget.
     * @returns {Promise<void>}
     */
    async onData(widget, data) {},
  };

  function updateTimeSeries(gids = null) {
    const { dj, widget } = local;
    const data = dj.getTableBase();
    const { scenario, team } = dj.getCurrentFilters();
    let useGids = isNotEmpty(gids);
    const gidsArray = useGids ? asArray(gids) : [];

    const w = widget.findWidget("time_series");
    if (!w) {
      console.warn("no target widget");
      return;
    }
    if (useGids) {
      const reset = isEqual(local.previousGids, gidsArray);
      if (reset) {
        useGids = false;
        delete local.previousGids;
      } else {
        local.previousGids = gidsArray;
      }
    }

    const dataSubset = data.filter(
      (row) =>
        row.scenario === scenario &&
        row.team === team &&
        (useGids ? gidsArray.includes(row.did) : true),
    );
    console.log({ n: dataSubset.length, scenario, team });
    w.setData(dataSubset);
  }
}
