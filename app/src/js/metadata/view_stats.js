import { el, elAuto, elPanel, elSpanTranslate, elWait } from "./../el_mapx";
import { theme } from "./../mx";
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

  /**
   * View meta section
   */
  const viewStats = await getViewStats(idView, opt.stat_n_days);
  const elViewStats = await buildViewStatsUi(viewStats);

  elTarget.innerHTML = "";
  elTarget.appendChild(elViewStats);

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

async function buildViewStatsUi(stats, opt) {
  opt = Object.assign({}, def_opt, opt);

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
 * Build plot
 * @param {Array} table Array of value [{country:<2 leter code>,contry_name:<string>,count:<integer>},<...>]
 * @param {Element} elPlot Plot element
 * @param {Boolean} useRandom Use rando data ( for dev)
 * @return {Object} Highcharts instance
 */
async function metaCountByCountryToPlot(table, elPlot) {
  try {
    if (isEmpty(table)) {
      return;
    }

    const highcharts = await moduleLoad("highcharts");
    const nCountryMap = new Map();

    for (let i = 0, iL = table.length; i < iL; i++) {
      const t = table[i];
      if (!t.country) {
        t.country = "?";
      }
      nCountryMap.set(t.country, t.country_name || t.country || "Unknown");
    }

    const data = table.map((r) => {
      return {
        name: r.country,
        y: r.count,
      };
    });
    if (data.length > 20) {
      const merged = data.splice(20, data.length);
      const sum = merged.reduce((a, d) => a + d.y, 0);
      data.push({
        name: await getDictItem("meta_view_stat_others_countries"),
        y: sum,
      });
    }

    const txtReads = await getDictItem("meta_view_stat_activations");
    const colors = theme.colors();

    const chart = highcharts.chart(elPlot, {
      chart: {
        type: "column",
        height: chartHeight(),
        inverted: true,
        styledMode: false,
        backgroundColor: colors.mx_ui_background,
        plotBackgroundColor: colors.mx_ui_background.color,
        plotBorderWidth: 0,
        plotShadow: false,
      },
      title: {
        text: await getDictItem("meta_view_stat_n_add_by_country_last_year"),
      },
      xAxis: {
        categories: data.map((d) => d.name),
        title: {
          text: null,
        },
      },
      yAxis: {
        type: "logarithmic",
        title: {
          text: await getDictItem("meta_view_stat_n_add_by_country_axis"),
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        formatter: function () {
          return ` ${nCountryMap.get(this.x)} : ${this.y} ${txtReads}`;
        },
      },
      series: [
        {
          name: await getDictItem("meta_view_stat_n_add_by_country"),
          data: data,
        },
      ],
      credits: {
        enabled: false,
      },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: [
              "printChart",
              "separator",
              "downloadPNG",
              "downloadJPEG",
              "downloadSVG",
              "separator",
              "downloadCSV",
              "downloadXLS",
            ],
          },
        },
      },
    });
    /**
     * Small height = panel from file menu hidden.
     * -> overflow visible to fix that
     */
    chart.container.style.overflow = "visible";

    /**
     * Handle resize
     */
    elPlot._ro = new ResizeObserver(debounce(updateChart, 100));
    elPlot._ro.observe(elPlot);

    function updateChart() {
      const w = elPlot.getBoundingClientRect().width;
      chart.setSize(w);
    }

    function chartHeight() {
      return data.length * 20 + 100;
    }
  } catch (e) {
    console.warn(e);
  }
}
