import { el, elAuto, elPanel, elSpanTranslate, elWait } from "./../el_mapx";
import { getViewAuto, viewLink } from "./../map_helpers";
import { modal } from "./../mx_helper_modal.js";
import { objectToArray, debounce } from "./../mx_helper_misc.js";
import { moduleLoad } from "./../modules_loader_async";
import { MenuBuilder } from "./menu.js";
import { ws, settings } from "./../mx.js";
import {
  getLanguageItem,
  getDictItem,
  updateLanguageElements,
} from "./../language";
import { isLanguageObject, isEmpty, isViewId, isView } from "./../is_test_mapx";
import { theme } from "./../mx.js";

const def_opt = {
  add_menu: true,
  add_views_stats: true,
  stat_n_days: 365,
};

/**
 * Display view stat in a modal panel
 * @param {Object|String} view View or view id
 */
export async function viewToStatsModal(idView) {
  const view = await getViewAuto(idView);

  if (!isView(view)) {
    return modal({
      content: "View not found",
    });
  }

  /**
   * Case when idView is a view, reassign idView
   */
  idView = view?.id;

  /**
   * UI
   */
  const elContent = el("div", elWait("Please wait..."));
  const elTitleModal = el("span", {
    dataset: { lang_key: "meta_view_modal_title" },
  });

  /*
   * Display modal now, append later
   */
  const elModal = modal({
    title: elTitleModal,
    content: elContent,
    addBackground: true,
    style: {
      // to fit the table content without too much wrapping
      width: "700px",
    },
  });

  await viewStatsToUi(idView, elContent);

  return elModal;
}

async function viewStatsToUi(idView, elTarget, opt) {
  opt = Object.assign({}, def_opt, opt);

  const view = await getViewAuto(idView);
  idView = view?.id;
  elTarget.innerHTML = "";

  /**
   * View meta section
   */
  const viewStats = await getViewStats(idView, opt.stat_n_days);
  await buildViewStatsUi(viewStats, elTarget);

  /**
   * Build menu
   */
  if (opt.add_menu) {
    new MenuBuilder(elTarget);
  }
  /**
   * Update language element
   */
  await updateLanguageElements({
    el: elTarget,
  });
  return elTarget;
}

async function buildViewStatsUi(stats, elTarget) {
  const prefixKey = "meta_view_";
  const keys = [
    "title",
    "id",
    "stat_n_add",
    "stat_n_add_by_guests",
    "stat_n_add_by_users",
    "stat_n_add_by_distinct_users",
  ];
  const tblSummaryFull = objectToArray(stats, true);

  const tblSummary = tblSummaryFull
    .filter((row) => keys.includes(row.key))
    .map((row) => {
      /**
       * Add view static link
       */
      if (row.key === "title") {
        row.value = el(
          "a",
          {
            href: viewLink(meta.id),
            target: "_blank",
          },
          isLanguageObject(row.value) //-> titles...
            ? getLanguageItem(row.value)
            : row.value,
        );
      }

      /**
       * Match sql table with dict labels
       * e.g. "meta_view_"+ "stat_n_add_by_users"
       */
      row.key = `${prefixKey}${row.key}`; // to match dict labels
      return row;
    });

  /**
   * highcharts needs the container to be rendered
   * to find the size.. Create the container now,
   * render later :
   */
  const elPlot = el("div", {
    class: ["panel", "panel-default"],
    style: {
      minWidth: "100px",
      minHeight: "40px",
      width: "100%",
      maxWidth: "100%",
      display: "flex",
      justifyContent: "center",
      overflow: "visible",
    },
  });
  const elPlotPanel = elPanel({
    title: elSpanTranslate("meta_view_stat_n_add_by_country"),
    content: elPlot,
  });

  const elStats = el("div", [
    elAuto("array_table", tblSummary, {
      render: "array_table",
      tableHeadersSkip: true,
      tableTitle: "meta_view_table_summary_title",
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true,
      numberStyle: { marginRight: "5px" },
    }),
    elPlotPanel,
  ]);

  elTarget.appendChild(elStats);

  await metaCountByCountryToPlot(stats.stat_n_add_by_country, elPlot);
  return elStats;
}

/**
 * Get view stats
 * @param {String} id  Id of the view
 * @param {Number} stat_n_days Number of days back from now to collect stats. 365 = past year
 * @returns {Promise<Object>} View stats
 */
export async function getViewStats(id, stat_n_days = 365) {
  if (!isViewId(id)) {
    return console.warn("getViewStats : invalid id");
  }
  const viewStats = await ws.emitAsync(
    "/client/view/get/stats",
    {
      idView: id,
      stat_n_days,
    },
    settings.maxTimeFetch,
  );

  return viewStats;
}

/**
 * Build plot using ECharts
 * @param {Array} table Array of values [{country:<2 letter code>, country_name:<string>, count:<integer>}, ...]
 * @param {Element} elPlot Plot element
 * @return {Object} ECharts instance
 */
async function metaCountByCountryToPlot(table, elPlot) {
  try {
    if (isEmpty(table)) {
      return;
    }

    const echarts = await moduleLoad("echarts");
    const isDark = theme.isDark();
    const colors = theme.colors();
    const nCountryMap = new Map();

    // Populate country map
    for (const t of table) {
      const countryCode = t.country || "?";
      const countryName = !t.country
        ? "Unknown"
        : await getDictItem(countryCode);
      nCountryMap.set(countryCode, countryName);
    }

    // Prepare data
    const data = table.map((r) => ({
      name: r.country || "?",
      value: r.count,
    }));

    // Merge data if more than 20 entries
    let displayData = [...data];
    if (displayData.length > 20) {
      const others = displayData.splice(20);
      const othersSum = others.reduce((sum, item) => sum + item.value, 0);
      displayData.push({
        name: await getDictItem("meta_view_stat_others_countries"),
        value: othersSum,
      });
    }

    const txtReads = await getDictItem("meta_view_stat_activations");
    const chartTitle = await getDictItem(
      "meta_view_stat_n_add_by_country_last_year",
    );
    const yAxisTitle = await getDictItem(
      "meta_view_stat_n_add_by_country_axis",
    );
    const seriesName = await getDictItem("meta_view_stat_n_add_by_country");

    const idTheme = isDark ? "dark" : "westeros";

    const chart = echarts.init(elPlot, idTheme, {
      renderer: "svg",
    });

    // Configure chart options
    const option = {
      backgroundColor: colors.mx_ui_background.color,
      title: {
        text: chartTitle,
        left: "center",
        textStyle: {
          fontSize: 14,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const countryName = nCountryMap.get(params.name) || params.name;
          return `${countryName} : ${params.value} ${txtReads}`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: yAxisTitle,
        nameLocation: "middle",
        nameGap: 50,
        axisType: "log",
        logBase: 10,
        axisLabel: {
          formatter: (value) => {
            return value.toLocaleString();
          },
        },
      },
      yAxis: {
        type: "category",
        data: displayData.map((d) => d.name),
        inverse: true,
      },
      series: [
        {
          name: seriesName,
          type: "bar",
          data: displayData.map((d) => d.value),
          itemStyle: {
            color: colors.mx_ui_link.color,
            width: 5,
          },
          label: {
            show: true,
            position: "right",
            formatter: "{c}",
          },
        },
      ],
      toolbox: {
        feature: {
          saveAsImage: {},
          dataView: { readOnly: true },
          restore: {},
        },
      },
    };

    chart.setOption(option);

    /**
     * Handle resize using ResizeObserver
     */
    const resizeObserver = new ResizeObserver(
      debounce(() => {
        chart.resize();
      }, 100),
    );
    resizeObserver.observe(elPlot);

    // Store the observer to element for potential cleanup
    elPlot._ro = resizeObserver;

    // Optional: Adjust chart height based on data length
    const chartHeight = displayData.length * 30 + 100; // Adjust multiplier as needed
    elPlot.style.height = `${chartHeight}px`;

    return chart;
  } catch (e) {
    console.warn(e);
  }
}
