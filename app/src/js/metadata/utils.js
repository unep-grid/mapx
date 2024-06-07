import { getGemetConcept, getGemetConceptLink } from "./../gemet_util/index.js";
import { el, elAuto, elPanel, elSpanTranslate, elWait } from "./../el_mapx";
import { getView, getViewAuto, viewLink } from "./../map_helpers";
import { modal } from "./../mx_helper_modal.js";
import { path, objectToArray, parseTemplate } from "./../mx_helper_misc.js";
import { MenuBuilder } from "./menu.js";
import { ws, settings } from "./../mx.js";
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
  isViewSm,
} from "./../is_test_mapx";
import { getArrayDistinct } from "../array_stat/index.js";

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
    "/client/source/get/metadata",
    {
      idSource,
    },
    settings.maxTimeFetchQuick,
  );

  return meta;
}

/**
* Get a dictionnary of alias for attributes
* @param {String} idSource Of the source 
* @param {Object} attributes
* @return {Promise<Object>} dictionnary
*/ 
export async function getAttributesAlias(idSource, attributes) {
  if (!isSourceId(idSource)) {
    throw new Error("getAttributesAlias : invalid id");
  }

  const aliases = await ws.emitAsync(
    "/client/source/get/attributes/alias",
    {
      idSource,
      attributes,
    },
    settings.maxTimeFetchQuick,
  );

  return aliases;
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 * @returns {Promise<Object>} View Metadata
 */
export async function getViewMetadata(id) {
  if (!isViewId(id)) {
    return console.warn("getViewMetadata : invalid id");
  }
  const viewMeta = await ws.emitAsync(
    "/client/view/get/metadata",
    {
      idView: id,
    },
    settings.maxTimeFetch,
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

  if (isViewSm(view)) {
    return [];
  }

  const metadata = await ws.emitAsync(
    "/client/view/source/get/metadata",
    {
      idView: view.id,
    },
    settings.maxTimeFetchQuick,
  );

  return metadata;
}

/**
 * Display metadata in a modal panel
 * @param {String} id Identifier of the view or source
 * @param {String} type Type of the entity ("view" or "source")
 */
export async function entityToMetaModal(id, type) {
  let entity, titleLangKey, fetchMetaToUi;

  switch (type) {
    case "view":
      entity = await getViewAuto(id);
      if (!isView(entity)) {
        return modal({
          content: "View not found",
        });
      }
      id = entity?.id;
      titleLangKey = "meta_view_modal_title";
      fetchMetaToUi = viewMetaToUi;
      break;
    case "source":
      titleLangKey = "meta_source_modal_title";
      fetchMetaToUi = sourceMetaToUi;
      break;
    default:
      throw new Error("Invalid entity type");
  }

  /**
   * UI
   */
  const elWaitItem = elWait("Please wait...");
  const elContent = el("div", elWaitItem);
  const elTitleModal = elSpanTranslate(titleLangKey);

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
   * Fetch meta : view or source
   */
  await fetchMetaToUi(id, elContent);
  elWaitItem.remove();

  /**
   * Add Menu
   */
  new MenuBuilder(elContent);

  /**
   * Update language element
   */
  await updateLanguageElements({
    el: elContent,
  });

  return elModal;
}

/**
 * Display view metadata in a modal panel
 * @param {Object|String} view View or view id
 */
export async function viewToMetaModal(idView) {
  return entityToMetaModal(idView, "view");
}

/**
 * Display source metadata in a modal
 * @param {String} idSource Source id
 */
export async function sourceToMetaModal(idSource) {
  return entityToMetaModal(idSource, "source");
}

export async function getViewMetaToHtml(idView) {
  const elDoc = el("div");
  const elRes = await viewMetaToUi(idView, elDoc);
  const html = elRes.innerHTML;
  const { default: template } = await import("./export_template.html");
  const out = parseTemplate(template, {
    title: "View Metadata",
    body: html,
  });
  return out;
}

/**
 * Append source metadata, formated to a target element
 * @param {String} idItem id of the view or the source
 * @param {Element} elTarget target element
 */
async function sourceMetaToUi(idItem, elTarget) {
  const modeView = isViewId(idItem);
  let meta;
  if (modeView) {
    meta = await getViewSourceMetadata(idItem);
  } else {
    meta = await getSourceMetadata(idItem);
  }

  const isValid = isNotEmpty(meta) && isArray(meta);

  if (!isValid) {
    console.warn(`No metadata for ${idItem}`);
    return;
  }

  const mainMeta = meta.splice(0, 1);
  const joinMeta = meta;

  const elSourceMeta = buildSourceMetaUi(mainMeta[0]);
  if (elSourceMeta) {
    elTarget.appendChild(elSourceMeta);
  }

  if (isNotEmpty(joinMeta)) {
    const elMetaJoin = buildMetaJoinUi(joinMeta);
    if (isNotEmpty(elMetaJoin)) {
      elTarget.appendChild(elMetaJoin);
    }
  }
}

async function viewMetaToUi(idView, elTarget) {
  const view = await getViewAuto(idView);
  idView = view?.id;

  /**
   * View meta section
   */
  const viewMeta = await getViewMetadata(idView);
  const elViewMeta = buildViewMetaUi(viewMeta);
  elTarget.innerHTML = "";
  elTarget.appendChild(elViewMeta);

  /**
   * Raster meta section
   */
  const metaRasterLink = path(view, "data.source.urlMetadata");
  if (metaRasterLink) {
    const elRasterMetaLink = buildViewMetaRasterUi({
      url: metaRasterLink,
    });
    if (elRasterMetaLink) {
      elTarget.appendChild(elRasterMetaLink);
    }
  }

  /**
   * Vector meta section
   */
  await sourceMetaToUi(idView, elTarget);

  return elTarget;
}

export function buildViewMetaRasterUi(rasterMeta) {
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

function buildViewMetaUi(meta) {
  const prefixKey = "meta_view_";
  const keys = [
    "title",
    "id",
    "abstract",
    "date_modified",
    "date_created",
    "project_title",
    "projects_data",
    "readers",
    "editors",
  ];
  const tblSummaryFull = objectToArray(meta, true);

  const tblSummary = tblSummaryFull
    .filter((row) => keys.includes(row.key))
    .sort((a, b) => {
      return keys.indexOf(a.key) - keys.indexOf(b.key);
    })
    .map((row) => {
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
       * Use email instead of id for editors, readers ,
       * Replace 'self' by the current editor id
       */
      if (row.key === "readers" || row.key === "editors") {
        row.value.sort();
        const index = row.value.indexOf("self");
        const editorEmail = getEditorEmailFromMeta(meta, meta.editor);
        if (index !== -1) {
          row.value[index] = editorEmail;
        } else {
          row.value.unshift(editorEmail);
        }

        if (row.key === "editors") {
          for (let i = 0, iL = row.value.length; i < iL; i++) {
            const id = row.value[i] * 1;
            const email = getEditorEmailFromMeta(meta, id);
            row.value[i] = email;
          }
        }
        row.value = getArrayDistinct(row.value);
      }

      /**
       * Match sql table with dict labels
       * e.g. "meta_view_"+ "editors"
       */
      row.key = `${prefixKey}${row.key}`; // to match dict labels
      return row;
    });

  const elMeta = el("div", [
    elAuto("array_table", tblSummary, {
      render: "array_table",
      tableHeadersSkip: true,
      tableTitle: "meta_view_table_summary_title",
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true,
      numberStyle: { marginRight: "5px" },
    }),
    elAuto("array_table", meta.table_changes_editors, {
      booleanValues: ["✓", ""],
      tableHeadersClasses: ["col-sm-6", "col-sm-3", "col-sm-3"],
      tableTitleAsLanguageKey: true,
      tableHeadersLabels: [
        "meta_view_table_editors_id",
        "meta_view_table_editors_email",
        "meta_view_table_editors_changes",
        "meta_view_table_editors_current",
      ],
      tableTitle: "meta_view_table_editors_title",
    }),
  ]);
  return elMeta;
}

/**
 * Get editor email from view meta object
 */
function getEditorEmailFromMeta(meta, id) {
  id = isEmpty(id) ? meta.editor : id;
  const editor = meta.table_editors.find((e) => e.id === meta.editor);
  if (editor?.email) {
    return editor.email;
  }
  const lastEditor = meta.table_changes_editors.find((i) => i.is_current);
  if (lastEditor?.email) {
    return lastEditor.email;
  }
  throw new Error(`getLastEditorEmail : no editor found for id ${id}`);
}

/**
 * Render join metadata
 */
function buildMetaJoinUi(metaJoin) {
  const elOut = el("div", { style: { padding: "20px" } });
  for (const meta of metaJoin) {
    elOut.appendChild(buildSourceMetaUi(meta, meta._prefix));
  }
  return elPanel({
    title: elSpanTranslate("join_meta_title"),
    content: elOut,
  });
}

/**
 * Vector source meta data to UI
 */
function buildSourceMetaUi(meta, prefix) {
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
  const elId = el("span", p("_id_source", null));

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
