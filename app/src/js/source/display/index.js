import { getArrayDistinct } from "./../../array_stat/index.js";
import { modalMarkdown } from "./../../modal_markdown/index.js";
import { getDictItem, getLabelFromObjectPath } from "./../../language";
import { elSpanTranslate } from "./../../el_mapx";
import { getApiUrl } from "./../../api_routes";
import { settings } from "./../../settings";
import { modal } from "./../../mx_helper_modal";
import { ws_tools } from "./../../mx.js";

import {
  TableResizer,
  getHandsonLanguageCode,
  typeConvert,
} from "./../../handsontable/utils.js";
import { path, progressScreen } from "./../../mx_helper_misc.js";
import { objToParams } from "./../../url_utils";
import { fetchJsonProgress } from "./../../mx_helper_fetch_progress";
import { el } from "./../../el/src/index.js";
import { getViewSourceSummary } from "./../../mx_helper_source_summary.js";
import { getAttributesAlias } from "./../../metadata/utils.js";
import { moduleLoad } from "./../../modules_loader_async";
import {
  getView,
  getViewTitle,
  isSourceDownloadable,
} from "./../../map_helpers";
import { isSourceId, isView, isArray, makeSafeName } from "./../../is_test";
import { downloadCSV } from "../../download/index.js";

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

async function showSourceTableAttributeModal(opt) {
  const config = Object.assign({}, { labels: null }, opt);
  let destroyed = false;
  let hot;
  let tableObserver;
  let labels = config.labels || null;
  let elViewTitle;
  let elTable;
  let elModal;
  let addEdit;
  let allowDownload = false;
  const validSource = isSourceId(config.idSource);
  const filename = `${makeSafeName(config.title || config.view.id)}.csv`;

  if (!validSource) {
    return false;
  }

  try {
    const summary = await getViewSourceSummary(config.view.id, {
      stats: ["base", "attributes", "roles"],
      useCache: false,
    });

    /**
     * Check roles for edit button
     */
    const idUser = settings?.user?.id;
    const groups = settings?.user?.roles?.groups || [];
    const editor = summary?.roles?.editor;
    const editors = summary?.roles?.editors;
    const isEditable = ["vector", "tabular"].includes(summary?.type);
    const isProject = config?.view?.project === settings?.project?.id;
    const isEditor = editor === idUser;
    const isAllowed = editors.some(
      (role) => groups.includes(role) || role === idUser,
    );

    addEdit = isProject && (isEditor || isAllowed) && isEditable;
    /**
     * Start progress
     */
    onProgressStart();

    const handsontable = await moduleLoad("handsontable");
    const table = await fetchSourceTableAttribute(config);
    const data = table.data;

    const hasData = isArray(data) && data.length > 0;
    allowDownload = await isSourceDownloadable(opt.idSource);

    elTable = el("div", {
      class: "mx_handsontable",
      style: {
        width: "100%",
        minHeight: "350px",
        minWidth: "100px",
        overflow: "hidden",
        backgroundColor: "var(--mx_ui_shadow)",
      },
    });
    const elButtonDownload = el(
      "button",
      {
        class: "btn btn-default",
        on: {
          click: handleDownload,
        },
      },
      elSpanTranslate("btn_edit_table_modal_export_csv"),
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
      elSpanTranslate("btn_help"),
    );

    /**
     * Filter no more supported since the downgrade to v < 7.*
     *   const elButtonClearFilter = el(
     *      "button",
     *      {
     *        class: "btn btn-default",
     *        disabled: true,
     *        on: {
     *          click: handleClearFilter,
     *        },
     *      },
     *      elSpanTranslate("btn_edit_table_modal_clear_filter")
     *    );
     */
    const elButtonEdit = el(
      "button",
      {
        class: "btn btn-default",
        disabled: !addEdit,
        on: {
          click: handleEdit,
        },
      },
      elSpanTranslate("btn_edit_table_modal_edit"),
    );
    if (!addEdit) {
      elButtonEdit.setAttribute("disabled", true);
    }

    const elTitle = el(
      "div",
      elSpanTranslate("edit_table_modal_attributes_title"),
      (elViewTitle = el("span", {
        style: {
          marginLeft: "10px",
          fontStyle: "italic",
        },
      })),
    );

    const buttons = [elButtonHelp, elButtonDownload, elButtonEdit];

    if (!hasData) {
      elTable.innerText = "no data";
      buttons.length = 0;
    }

    elModal = modal({
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
    const columns = config.attributes.map((name, i) => {
      const out = { type: null };
      for (const type of summary.attributes_types) {
        if (out.type) {
          continue;
        }
        if (type.column_name == name) {
          out.type = type.column_type;
        }
      }
      return {
        type: typeConvert(out.type || "text", "handsontable"),
        data: name,
        readOnly: true,
        _label: labels[i],
      };
    });

    /**
     * Set columns order
     */
    const order = table.columnsOrder;
    for (const column of columns) {
      if (isArray(order) && order.includes(column.data)) {
        column._pos = order.indexOf(column.data);
      }
    }
    columns.sort((a, b) => a._pos - b._pos);
    const labelsOrdered = columns.map((c) => c._label);

    /**
     * Init handsontable
     */
    hot = new handsontable(elTable, {
      columns: columns,
      data: data,
      rowHeaders: true,
      columnSorting: true,
      colHeaders: labelsOrdered,
      licenseKey: "non-commercial-and-evaluation",
      dropdownMenu: [
        "filter_by_condition",
        "filter_operators",
        "filter_by_condition2",
        "filter_action_bar",
      ],
      filters: false,
      language: getHandsonLanguageCode(),
      afterFilter: handleViewFilter,
      renderAllRows: false,
      disableVisualSelection: !allowDownload,
    });

    addTitle();
    onProgressEnd();

    /**
     * If everything is fine, add a mutation observer to render the table
     */
    tableObserver = new TableResizer(hot, elTable, elModal);
  } catch (e) {
    console.error(e);
    progressScreen({
      percent: 0,
      id: "fetch_data",
      enable: false,
    });
  }
  /**
   * Helpers
   */
  async function handleEdit() {
    try {
      if (!addEdit) {
        return;
      }
      await ws_tools.start("edit_table", {
        id_table: config.idSource,
        on_destroy: restart,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function restart() {
    try {
      destroy();
      await viewToTableAttributeModal(config.view);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDownload() {
    try {
      if (!allowDownload) {
        return;
      }
      const data = hot.getData();
      const headers = hot.getColHeader();
      await downloadCSV(data, filename || "mx_attributes.csv", headers);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Filter no more supported since the downgrade to v < 7.*
   *  function handleClearFilter() {
   *   let filterPlugin = hot.getPlugin("filters");
   *   filterPlugin.clearConditions();
   *   filterPlugin.filter();
   *   hot.render();
   *   elButtonClearFilter.setAttribute("disabled", true);
   * }
   */

  function addTitle() {
    let view = config.view;
    if (!isView(view)) {
      return;
    }
    elViewTitle.innerText = getViewTitle(view);
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (hot) {
      hot.destroy();
    }
    if (tableObserver) {
      tableObserver.disconnect();
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

export async function viewToTableAttributeModal(idView) {
  let view = getView(idView);
  let opt = await getTableAttributeConfigFromView(view);
  return showSourceTableAttributeModal(opt);
}

export async function getTableAttributeConfigFromView(view) {
  if (view.type !== "vt") {
    console.warn("Only vt view are supported");
    return null;
  }

  const title = getViewTitle(view);
  const idSource = path(view, "data.source.layerInfo.name");
  const attribute = path(view, "data.attribute.name");
  let attributes = path(view, "data.attribute.names") || [];
  attributes = isArray(attributes) ? attributes : [attributes];
  attributes = attributes.concat(attribute);
  attributes = attributes.concat(["gid"]);
  attributes = getArrayDistinct(attributes);

  const alias = await getAttributesAlias(idSource, attributes);

  const labels = attributes.map((attr) => {
    return getLabelFromObjectPath({
      obj: alias,
      path: attr,
      defaultValue: attr,
    });
  });

  return {
    title: title,
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
