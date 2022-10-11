import { getArrayDistinct } from "./../array_stat/index.js";
import { modalMarkdown } from "./../modal_markdown/index.js";
import { getDictItem, getLanguageCurrent } from "./../language";
import { elSpanTranslate } from "./../el_mapx";
import { getApiUrl } from "./../api_routes";
import { settings } from "./../settings";
import { modalDialog } from "./../mx_helper_modal.js";

import { ws_tools } from "./../mx.js";

import {
  getHandsonLanguageCode,
  typeConvert,
} from "./../handsontable/utils.js";
import { path, debounce, progressScreen } from "./../mx_helper_misc.js";
import { objToParams } from "./../url_utils";
import { fetchJsonProgress } from "./../mx_helper_fetch_progress";
import { el } from "./../el/src/index.js";
import { getViewSourceSummary } from "./../mx_helper_source_summary.js";
import { fetchSourceMetadata } from "./../mx_helper_map_view_metadata.js";
import { moduleLoad } from "./../modules_loader_async";
import { getView, resetViewStyle } from "./../map_helpers";
import { isView, isArray, isFunction } from "./../is_test";

export function fetchSourceTableAttribute(opt) {
  opt = Object.assign({}, opt);
  const host = getApiUrl("getSourceTableAttribute");
  const params = objToParams({
    id: opt.idSource,
    attributes: opt.attributes,
  });
  const url = `${host}?${params}`;

  return fetchJsonProgress(url, {
    onProgress: onProgressData,
    onError: onProgressError,
    onComplete: onProgressDataComplete,
  });
}

export async function showSourceTableAttributeModal(opt) {
  opt = Object.assign({}, opt);
  if (!opt.idSource) {
    return Promise.resolve(false);
  }
  const h = mx.helpers;
  const config = {
    idSource: opt.idSource,
    attributes: opt.attributes,
    view: opt.view,
    labels: opt.labels,
  };
  let destroyed = false;
  let hot;
  let resizeObserver;
  let labels = opt.labels || null;

  const summary = await getViewSourceSummary(opt.view.id, {
    stats: ["base", "attributes", "roles"],
  });

  /**
   * Check roles for edit button
   */
  const idUser = settings?.user?.id;
  const groups = settings?.user?.roles?.groups || [];
  const editor = summary?.roles?.editor;
  const editors = summary?.roles?.editors;
  const addEdit =
    editor === idUser ||
    editors.some((role) => groups.includes(role) || role === idUser);

  /**
   * Start progress
   */
  onProgressStart();

  const handsontable = await moduleLoad("handsontable");
  const meta = await fetchSourceMetadata(config.idSource);
  const data = await fetchSourceTableAttribute(config);

  const services = meta._services || [];
  const hasData = isArray(data) && data.length > 0;
  const license = "non-commercial-and-evaluation";
  const elTable = el("div", {
    class: "mx_handsontable",
    style: {
      width: "100%",
      height: "350",
      minHeight: "350px",
      minWidth: "100px",
      overflow: "hidden",
      backgroundColor: "var(--mx_ui_shadow)",
    },
  });
  const allowDownload = services.indexOf("mx_download") > -1;
  const elButtonDownload = el(
    "button",
    {
      class: "btn btn-default",
      on: {
        click: handleDownload,
      },
    },
    elSpanTranslate("btn_edit_table_modal_export_csv")
  );
  if (!allowDownload) {
    elButtonDownload.setAttribute("disabled", true);
  }

  const elButtonHelp = el(
    "button",
    {
      class: "btn btn-default",
      on: {
        click: handleHelp,
      },
      title: "Help",
    },
    elSpanTranslate("btn_help")
  );

  const elButtonClearFilter = el(
    "button",
    {
      class: "btn btn-default",
      disabled: true,
      on: {
        click: handleClearFilter,
      },
    },
    elSpanTranslate("btn_edit_table_modal_clear_filter")
  );

  const elButtonEdit = el(
    "button",
    {
      class: "btn btn-default",
      disabled: !addEdit,
      on: {
        click: handleEdit,
      },
    },
    elSpanTranslate("btn_edit_table_modal_edit")
  );

  let elViewTitle;
  const elTitle = el(
    "div",
    elSpanTranslate("edit_table_modal_attributes_title"),
    (elViewTitle = el("span", {
      style: {
        marginLeft: "10px",
        fontStyle: "italic",
      },
    }))
  );

  const buttons = [
    elButtonHelp,
    elButtonClearFilter,
    elButtonDownload,
    elButtonEdit,
  ];

  if (!hasData) {
    elTable.innerText = "no data";
    buttons.length = 0;
  }

  const elModal = h.modal({
    title: elTitle,
    content: elTable,
    onClose: destroy,
    buttons: buttons,
    addSelectize: false,
    noShinyBinding: true,
  });

  if (!hasData) {
    onProgressEnd();
    return;
  }

  /*
   * Set columns type
   */
  const columns = opt.attributes.map((a) => {
    let type = summary.attributes_types.reduce(
      (v, t) => (v ? v : t.id === a ? t.value : v),
      null
    );
    return {
      type: typeConvert(type, "json", "input"),
      data: a,
      readOnly: true,
    };
  });

  hot = new handsontable(elTable, {
    columns: columns,
    data: data,
    rowHeaders: true,
    columnSorting: true,
    colHeaders: labels,
    licenseKey: license,
    dropdownMenu: [
      "filter_by_condition",
      "filter_operators",
      "filter_by_condition2",
      "filter_action_bar",
    ],
    filters: true,
    language: getHandsonLanguageCode(),
    afterFilter: handleViewFilter,
    renderAllRows: false,
    height: function () {
      const r = elTable.getBoundingClientRect();
      return r.height - 30;
    },
    disableVisualSelection: !allowDownload,
  });

  addTitle();
  onProgressEnd();

  /**
   * If everything is fine, add a mutation observer to render the table
   */
  resizeObserver = new ResizeObserver(tableRender);
  resizeObserver.observe(elModal);

  /**
   * Helpers
   */
  async function handleEdit() {
    try {
      if (!addEdit) {
        return;
      }
      const editTable = ws_tools.create("edit_table");

      const res = await editTable({
        id_table: config.idSource,
        on_destroy: restart,
      });

      if (res instanceof Error) {
        await modalDialog({
          content: res.message,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function restart() {
    try {
      await destroy();
      await showSourceTableAttributeModal({
        idSource: opt.idSource,
        view: opt.view,
        attributes: opt.attributes,
        labels: opt.labels,
      });
      await resetViewStyle({ idView: opt.view });
    } catch (e) {
      console.error(e);
    }
  }

  function handleDownload() {
    if (!allowDownload) {
      return;
    }
    let exportPlugin = hot.getPlugin("exportFile");

    exportPlugin.downloadFile("csv", {
      bom: false,
      columnDelimiter: ",",
      columnHeaders: true,
      exportHiddenColumns: false,
      exportHiddenRows: false,
      fileExtension: "csv",
      filename: "mx_attribute_table",
      mimeType: "text/csv",
      rowDelimiter: "\r\n",
      rowHeaders: false,
    });
  }

  function handleClearFilter() {
    let filterPlugin = hot.getPlugin("filters");
    filterPlugin.clearConditions();
    filterPlugin.filter();
    hot.render();
    elButtonClearFilter.setAttribute("disabled", true);
  }

  function addTitle() {
    let view = config.view;
    if (!isView(view)) {
      return;
    }
    elViewTitle.innerText = h.getViewTitle(view);
  }

  let _to_render_table = 0;
  function tableRender() {
    clearTimeout(_to_render_table);
    _to_render_table = setTimeout(() => {
      if (hot && hot.render) {
        const elTableParent = elTable.parentElement;
        // compute padding ..
        let pStyle = getComputedStyle(elTableParent);
        let pad =
          parseFloat(pStyle.paddingTop) + parseFloat(pStyle.paddingBottom);
        // and actual size
        let height = elTableParent.getBoundingClientRect().height;
        if (height > 350) {
          elTable.style.height = height - pad + "px";
          hot.render();
        }
      }
    }, 200);
  }

  async function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (hot) {
      hot.destroy();
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    let view = config.view;
    if (!isView(view)) {
      return;
    }
    view._setFilter({
      type: "attribute_table",
      filter: [],
    });
    elModal.close();
  }

  function handleViewFilter() {
    const view = config.view;
    if (!isView(view)) {
      return;
    }
    const data = hot.getData();
    const attr = config.attributes;
    const posGid = attr.indexOf("gid");
    if (posGid > -1) {
      const ids = data.map((d) => d[posGid]);
      elButtonClearFilter.removeAttribute("disabled");
      view._setFilter({
        type: "attribute_table",
        filter: ["in", ["get", "gid"], ["literal", ids]],
      });
    }
  }
}

export function viewToTableAttributeModal(idView) {
  let view = getView(idView);
  let opt = getTableAttributeConfigFromView(view);
  return showSourceTableAttributeModal(opt);
}

export function getTableAttributeConfigFromView(view) {
  let language = getLanguageCurrent();

  if (view.type !== "vt" || !view._meta) {
    console.warn("Only vt view with ._meta are supported");
    return null;
  }
  let idSource = path(view, "data.source.layerInfo.name");
  let attributes = path(view, "data.attribute.names") || [];
  let attribute = path(view, "data.attribute.name");
  attributes = isArray(attributes) ? attributes : [attributes];
  attributes = attributes.concat(attribute);
  attributes = attributes.concat(["gid"]);
  attributes = getArrayDistinct(attributes);
  let labelsDict = path(view, "_meta.text.attributes_alias") || {};
  let labels = attributes.map((a) => {
    return labelsDict[a] ? labelsDict[a][language] || labelsDict[a].en || a : a;
  });

  return {
    view: view,
    idSource: idSource,
    labels: labels,
    attributes: attributes,
  };
}

function handleHelp() {
  return modalMarkdown({
    title: getDictItem("btn_help"),
    wiki: "Attribute-table",
  });
}

function listenMutationAttribute(el, cb) {
  cb = isFunction(cb) ? debounce(cb, 100) : console.log;
  const observer = new MutationObserver((m) => {
    cb(m);
  });

  observer.observe(el, {
    attributes: true,
  });
  return observer;
}
function onProgressStart() {
  progressScreen({
    percent: 1,
    id: "fetch_data",
    text: getDictItem("edit_table_modal_data_init"),
    enable: true,
  });
}
function onProgressData(data) {
  progressScreen({
    percent: (data.loaded / data.total) * 100 - 1,
    id: "fetch_data",
    text: getDictItem("edit_table_modal_data_fetch"),
    enable: true,
  });
}
function onProgressDataComplete() {
  progressScreen({
    text: getDictItem("edit_table_modal_data_ok_build"),
    enable: true,
    percent: 99,
    id: "fetch_data",
  });
}
function onProgressEnd() {
  progressScreen({
    enable: false,
    percent: 100,
    id: "fetch_data",
  });
}
function onProgressError(data) {
  onProgressEnd();
  alert(data.message);
}
