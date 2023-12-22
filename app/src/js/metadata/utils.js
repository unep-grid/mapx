import { getGemetConcept, getGemetConceptLink } from "./../gemet_util/index.js";
import { el, elAuto, elPanel, elSpanTranslate } from "./../el_mapx";
import { getApiRoute } from "./../api_routes";
import { theme } from "./../mx";
import { getView, getViewRemote } from "./../map_helpers";
import { modal } from "./../mx_helper_modal.js";
import { path, objectToArray } from "./../mx_helper_misc.js";
import { moduleLoad } from "./../modules_loader_async";
import { MenuBuilder } from "./menu.js";
import { ws } from "./../mx.js";
import {
  getLanguageItem,
  getDictItem,
  getLabelFromObjectPath,
  updateLanguageElements,
} from "./../language";
import {
  isLanguageObject,
  isUrl,
  isEmpty,
  isSourceId,
  isViewId,
  isArray,
  isView,
  isNotEmpty,
} from "./../is_test_mapx";

/**
 * Get source metadata
 * @note sdk only
 * @param {String} id Name/Id of the source layer
 */
export async function getSourceMetadata(idSource) {
  if (!isSourceId(idSource)) {
    throw new Error("getSourceMetadata : invalid id");
  }

  const meta = await ws.emitAsync(
    getApiRoute("sourceGetMetadata"),
    {
      idSource,
    },
    1e3,
  );

  return meta;
}

export async function getAttributesAlias(idSource, attributes) {
  if (!isSourceId(idSource)) {
    throw new Error("getSourceMetadata : invalid id");
  }

  const aliases = await ws.emitAsync(
    getApiRoute("sourceGetAttributesAlias"),
    {
      idSource,
      attributes,
    },
    1e3,
  );

  return aliases;
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 */
export async function getViewMetadata(id) {
  if (!isViewId(id)) {
    return console.warn("getViewMetadata : invalid id");
  }
  const viewMeta = await ws.emitAsync(
    getApiRoute("viewMetadata"),
    {
      idView: id,
    },
    10e3,
  );
  return viewMeta;
}

/**
 * Get view's source metadata (all type + join)
 * @param {String|Object} view or idView
 * @returns {Promise<Array>} an array of metadata object, with internal properties
 */
export async function getViewSourceMetadata(view) {
  view = getView(view);
  if (!isView(view)) {
    return [];
  }
  const metadata = await ws.emitAsync(
    getApiRoute("viewSourceMetadata"),
    {
      idView: view.id,
    },
    1e3,
  );

  return metadata;
}

/**
 * Display view metadata in a modal panel
 * @param {Object|String} view View or view id
 */
export async function viewToMetaModal(view) {
  view = getView(view);

  if (!isView(view)) {
    view = await getViewRemote(view);
  }

  if (!isView(view)) {
    return modal({
      content: "View not found",
    });
  }

  const idView = view?.id;
  /**
   * UI
   */
  const elContent = el("div");
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

  /**
   * View meta section
   */
  const viewMeta = await getViewMetadata(idView);

  const elViewMeta = await metaViewToUi(viewMeta, elModal);

  if (elViewMeta) {
    elContent.appendChild(elViewMeta);
  }

  /**
   * Raster meta section
   */
  const metaRasterLink = path(view, "data.source.urlMetadata");
  if (metaRasterLink) {
    const elRasterMetaLink = metaSourceRasterToUi({
      url: metaRasterLink,
    });
    if (elRasterMetaLink) {
      elContent.appendChild(elRasterMetaLink);
    }
  }

  /**
   * Vector meta section
   */
  const meta = await getViewSourceMetadata(view);
  if (isNotEmpty(meta) && isArray(meta)) {
    const mainMeta = meta.splice(0, 1);
    const joinMeta = meta;

    const elSourceMeta = metaSourceToUi(mainMeta[0]);
    if (elSourceMeta) {
      elContent.appendChild(elSourceMeta);
    }

    if (isNotEmpty(joinMeta)) {
      const elMetaJoin = metaJoinSourceToUi(joinMeta);
      if (isNotEmpty(elMetaJoin)) {
        elContent.appendChild(elMetaJoin);
      }
    }
  }

  /**
   * Update language element
   */

  updateLanguageElements({
    el: elModal,
  });

  /**
   * Build menu
   */
  new MenuBuilder(elContent);
}

export function metaSourceRasterToUi(rasterMeta) {
  rasterMeta = rasterMeta || {};

  if (!isUrl(rasterMeta.url)) {
    return el("div");
  }

  rasterMeta = objectToArray(
    {
      meta_view_raster_meta: rasterMeta.url,
    },
    true,
  );

  return elAuto("array_table", rasterMeta, {
    render: "array_table",
    tableHeadersSkip: true,
    tableTitle: "meta_view_raster_meta",
    tableTitleAsLanguageKey: true,
    stringAsLanguageKey: true,
    urlDefaultLabel: "Link",
  });
}

async function metaViewToUi(meta, elModal) {
  const prefixKey = "meta_view_";
  const keys = [
    "title",
    "id",
    "abstract",
    "date_modified",
    "date_created",
    "project_title",
    "projects_data",
    "collections",
    "readers",
    "editors",
    "stat_n_add",
    "stat_n_add_by_guests",
    "stat_n_add_by_users",
  ];
  const txtDistinct = await getDictItem(
    "meta_view_stat_n_add_by_users_distinct",
  );
  const tblSummaryFull = objectToArray(meta, true);

  const tblSummary = tblSummaryFull
    .filter((row) => keys.includes(row.key))
    .sort((a, b) => {
      return keys.indexOf(a.key) - keys.indexOf(b.key);
    })
    .map((row) => {
      /**
       * Add distinct user in by_user
       */
      if (row.key === "stat_n_add_by_users") {
        const rowDistinct = tblSummaryFull.find(
          (row) => row.key === "stat_n_add_by_distinct_users",
        );
        const valueDistinct = rowDistinct.value;
        row.value = `${row.value} ( ${valueDistinct} ${txtDistinct} )`;
      }

      /**
       * Add project link
       */
      if (row.key === "project_title") {
        const linkProj = new URL(window.location.origin);
        const sp = linkProj.searchParams;
        sp.set("project", meta.project);
        sp.set("viewsOpen", meta.id);
        sp.set("viewsListFilterActivated", true);
        row.value = el(
          "a",
          {
            href: linkProj,
            target: "_blank",
          },
          getLanguageItem(row.value),
        );
      }

      /**
       * Add view static link
       */
      if (row.key === "title") {
        const linkView = new URL(window.location.origin);
        linkView.pathname = "/static.html";
        linkView.searchParams.set("views", meta.id);
        linkView.searchParams.set("zoomToViews", true);

        row.value = el(
          "a",
          {
            href: linkView,
            target: "_blank",
          },
          isLanguageObject(row.value) //-> titles...
            ? getLanguageItem(row.value)
            : row.value,
        );
      }

      /**
       * Add projects list link
       */
      if (row.key === "projects_data") {
        const elProjects = [];
        for (const projectData of row.value) {
          const isPublic = !!projectData.public;
          const linkProj = new URL(window.location.origin);
          const sp = linkProj.searchParams;
          const title = getLanguageItem(projectData.title);
          sp.set("project", projectData.id);
          sp.set("viewsOpen", meta.id);
          sp.set("viewsListFilterActivated", true);
          const elLink = el(
            "a",
            {
              href: linkProj,
              target: "_blank",
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
            },
            el("span", title),
            isPublic ? null : el("i", { class: ["fa", "fa-lock"] }),
          );
          elProjects.push(elLink);
        }
        row.value = elProjects;
      }

      /**
       * Match sql table with dict labels
       * e.g. "meta_view_"+ "stat_n_add_by_users"
       */
      row.key = prefixKey + row.key; // to match dict labels
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
  setTimeout(() => {
    metaCountByCountryToPlot(meta.stat_n_add_by_country, elPlot, elModal);
  }, 100);

  return el(
    "div",
    elAuto("array_table", tblSummary, {
      render: "array_table",
      tableHeadersSkip: true,
      tableTitle: "meta_view_table_summary_title",
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true,
      numberStyle: { marginRight: "5px" },
    }),
    elPlotPanel,
    elAuto("array_table", meta.table_editors, {
      booleanValues: ["✓", ""],
      tableHeadersClasses: ["col-sm-6", "col-sm-3", "col-sm-3"],
      tableTitleAsLanguageKey: true,
      tableHeadersLabels: [
        "meta_view_table_editors_email",
        "meta_view_table_editors_changes",
        "meta_view_table_editors_current",
      ],
      tableTitle: "meta_view_table_editors_title",
    }),
  );
}

function randomTable(n) {
  const ctries = ["CHE", "COD", "USA", "FRE", "ITA", "GER", "COL", "AFG"];
  const s = [];
  for (let i = 0; i < n; i++) {
    s.push(ctries[Math.floor(Math.random() * ctries.length)]);
  }

  const data = s.map((c, i) => {
    return {
      country: c,
      country_name: c,
      count: Math.floor(Math.random() * 100 * (1 / (i + 1))),
    };
  });
  data.sort((a, b) => b.count - a.count);
  return data;
}

/**
 * Build plot
 * @param {Array} table Array of value [{country:<2 leter code>,contry_name:<string>,count:<integer>},<...>]
 * @param {Element} elPlot Target element
 * @param {Element} elModal Modal element
 * @param {Boolean} useRandom Use rando data ( for dev)
 * @return {Object} Highcharts instance
 */
async function metaCountByCountryToPlot(table, elPlot, elModal, useRandom) {
  try {
    if (isEmpty(table)) {
      return;
    }

    const highcharts = await moduleLoad("highcharts");
    /**
     * Reads per country, first 20
     */
    if (useRandom) {
      table = randomTable(100);
    }

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
     * Handle mutation from modal here
     */
    if (elModal) {
      elModal.addMutationObserver(updateChart);
    }

    let idT = 0;
    function updateChart() {
      clearTimeout(idT);
      idT = setTimeout(() => {
        const w = elPlot.getBoundingClientRect().width;
        chart.setSize(w);
      }, 50);
    }

    function chartHeight() {
      return data.length * 20 + 100;
    }
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Render join metadata
 */
function metaJoinSourceToUi(metaJoin) {
  const elOut = el("div", { style: { padding: "20px" } });
  for (const meta of metaJoin) {
    elOut.appendChild(metaSourceToUi(meta, meta._prefix));
  }
  return elPanel({
    title: elSpanTranslate("join_meta_title"),
    content: elOut,
  });
}

/**
 * Vector source meta data to UI
 */
export function metaSourceToUi(meta, prefix) {
  const glfo = getLabelFromObjectPath;
  const oToA = objectToArray;

  /**
   * Path to meta object
   */
  const p = function (p, d) {
    return path(meta, p, d);
  };
  /**
   * Label from object path
   */
  const lfo = function (o, d, p) {
    return glfo({
      obj: o,
      path: p,
      default: d,
    });
  };
  const l = function (p, d) {
    return lfo(meta, d, p);
  };

  /**
   * Attributes table
   */
  const tblAttributesRaw = oToA(p("text.attributes", {}), true);
  const attrAlias = p("text.attributes_alias", {});
  const tblAttributes = tblAttributesRaw.map((r) => {
    r.key = el(
      "div",
      {
        style: { display: "flex", flexDirection: "column" },
      },
      el("label", lfo(attrAlias[r.key], r.key)),
      el("span", { class: ["text-muted"] }, `${prefix || ""}${r.key}`),
    );
    r.value = lfo(r.value);
    return r;
  });
  const elTblAttributes = elAuto("array_table", tblAttributes, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: "attributes_desc_title",
  });

  const urlHomepage = p("origin.homepage.url", "");
  const urlLabel = p("origin.homepage.label", "");
  const urlObjSources = p("origin.source.urls", []);
  const urlObjAnnexes = p("annex.references", []);
  const hasHomepage = isUrl(urlHomepage);

  const elHomepage = hasHomepage
    ? el(
        "a",
        {
          target: "_blank",
          href: urlHomepage,
        },
        urlLabel ? urlLabel : new URL(urlHomepage).hostname,
      )
    : el("span");

  const elSourceUrl = el(
    "ul",
    urlObjSources.map((src) => {
      if (!isUrl(src.url)) {
        return;
      }
      const hostname = new URL(src.url).hostname;
      return el(
        "li",
        el(
          "a",
          {
            target: "_blank",
            href: src.url,
          },
          src.label ? src.label : hostname,
        ),
      );
    }),
  );
  const elAnnexesUrl = el(
    "ul",
    urlObjAnnexes.map((src) => {
      if (!isUrl(src.url)) {
        return;
      }
      const hostname = new URL(src.url).hostname;
      return el(
        "li",
        el(
          "a",
          {
            target: "_blank",
            href: src.url,
          },
          src.label ? src.label : hostname,
        ),
      );
    }),
  );

  const elTitle = el("span", { class: "panel-title" }, l("text.title"));
  const elAbstract = el("p", l("text.abstract", "-"));
  const elNotes = el("p", l("text.notes", "-"));
  const elKeywords = elAuto("array_string", p("text.keywords.keys", ["-"]));
  const elLicenses = el(
    "ul",
    p("license.licenses", []).map((lic) =>
      el("li", [el("i", lic.name), el("p", lic.text)]),
    ),
  );

  const elKeywordsM49 = el(
    "ul",
    p("text.keywords.keys_m49", []).map((k) => el("li", getDictItem(k))),
  );

  const elKeywordsGemet = el("ul");

  gemetLiUpdate(p("text.keywords.keys_gemet", []), elKeywordsGemet);

  const elLanguages = elAuto(
    "array_string",
    p("text.language.codes", []).map((l) => l.code),
    {
      stringAsLanguageKey: true,
    },
  );

  const elContacts = el(
    "ul",
    p("contact.contacts", []).map((c) => {
      return el(
        "li",
        el(
          "a",
          {
            href: "mailto:" + c.email,
          },
          el(
            "span",
            (c.name || c.email) +
              (c.function ? " ( " + c.function + " ) " : ""),
          ),
        ),
        el("br"),
        el(
          "span",
          {
            class: "text-muted",
          },
          c.address,
        ),
      );
    }),
  );
  const elPeriodicity = elAuto("string", p("temporal.issuance.periodicity"), {
    stringAsLanguageKey: true,
  });
  const elReleasedAt = elAuto("date", p("temporal.issuance.released_at", null));
  const elModifiedAt = elAuto("date", p("temporal.issuance.modified_at", null));
  const elIsTimeless = elAuto(
    "boolean",
    p("temporal.range.is_timeless", null),
    {
      booleanValues: ["yes", "no"],
      stringAsLanguageKey: true,
    },
  );
  const elStartAt = elAuto("date", p("temporal.range.start_at", null));

  const elEndAt = elAuto("date", p("temporal.range.end_at", null));

  const elId = el("span", p("_id_source"));
  /**
   * Summary table
   */
  const tblSummary = oToA(
    {
      title: elTitle,
      id: elId,
      abstract: elAbstract,
      notes: elNotes,
      keywords: elKeywords,
      keywords_m49: elKeywordsM49,
      keywords_gemet: elKeywordsGemet,
      languages: elLanguages,
      contacts: elContacts,
      licenses: elLicenses,
      homepage: elHomepage,
      url_download: elSourceUrl,
      url_annexes: elAnnexesUrl,
      periodicity: elPeriodicity,
      released_at: elReleasedAt,
      modified_at: elModifiedAt,
      is_timeless: elIsTimeless,
      start_at: elStartAt,
      end_at: elEndAt,
    },
    // make an array of object
    true,
  );

  const elTblSummary = elAuto("array_table", tblSummary, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: "table_summary_title", // will be prefixed
    langKeyPrefix: "meta_source_",
    tableTitleAdd: elTitle.cloneNode(),
    stringAsLanguageKey: true,
  });

  const elMeta = el("div", elTblSummary, elTblAttributes);

  return elMeta;
}

/**
 * Given a list of gemet concept id, produce an array of '<li>', with a link to the
 * gemet oncept
 * @param {Array} ids Array of concept id
 * @return {Promise<DocumentFragment>} Array of '<li>'
 */
async function gemetLiUpdate(ids, elTarget) {
  const elFragmentTarget = document.createDocumentFragment();
  try {
    if (ids.length === 0) {
      return elFragmentTarget;
    }

    const concepts = await getGemetConcept(ids);

    for (const k of concepts) {
      const elKey = el(
        "li",
        el(
          "a",
          {
            target: "_blank",
            href: getGemetConceptLink(k.concept),
          },
          k.label,
        ),
      );
      elFragmentTarget.appendChild(elKey);
    }

    elTarget.appendChild(elFragmentTarget);
    return elFragmentTarget;
  } catch (e) {
    console.error("List gemet keyword builder", e);
  }
}
