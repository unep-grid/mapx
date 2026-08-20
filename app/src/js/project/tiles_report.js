// @ts-check
import { getMapxWindowManager } from "../window/index.js";
import { ws } from "../mx.js";
import { settings } from "../settings";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";
import { isEmpty } from "../is_test/index.js";
import { getDictItem } from "../language/index.js";
import { TilesCheckChannel } from "./tiles_check_channel.js";
import { RasterUrlConfigurator } from "./raster_url_configurator.js";
import { rasterStatusConfig, rasterStatusLabel } from "./raster_url_health.js";

const WINDOW_KEY = "project-tiles-report";
const DETAIL_TRANSLATION_KEYS = new Map([
  ["no_tile_template", "project_tiles_report_detail_no_tile_template"],
  ["not_configured", "project_tiles_report_status_not_configured"],
  ["invalid_url", "project_tiles_report_detail_invalid_url"],
  ["http_error", "project_tiles_report_detail_http_error"],
  ["response_too_large", "project_tiles_report_detail_response_too_large"],
  ["service_exception", "project_tiles_report_detail_service_exception"],
  [
    "invalid_image_signature",
    "project_tiles_report_detail_invalid_image_signature",
  ],
  ["timeout", "project_tiles_report_detail_timeout"],
  [
    "blocked_private_address",
    "project_tiles_report_detail_blocked_private_address",
  ],
  ["fetch_error", "project_tiles_report_detail_fetch_error"],
  ["invalid", "project_tiles_report_detail_invalid"],
]);

const DETAIL_RESOURCE_KEYS = {
  tiles: "project_tiles_report_col_tiles",
  legend: "project_tiles_report_col_legend",
};

/**
 * Project tile-link health report
 * Shows the stored mx_views_tiles_check results for the current project's
 * 'rt' views, with a manual "run now" trigger that streams live per-row
 * progress (see tiles_check_channel.js). Built on the <mx-window> system
 * (window/), not the legacy modalSimple.
 *
 * The window DOM is built once per open (buildWindow); progress updates
 * afterward mutate specific row/status nodes directly instead of calling
 * windowManager.open() again, which is both cheaper and avoids repeatedly
 * exercising configure()'s title handling for a window that stays open.
 */
export class TilesReport {
  constructor(projectManager) {
    const tr = this;
    tr.pm = projectManager;
    tr.rows = [];
    tr.running = false;
    tr.channel = null;
    tr.refs = {};
    tr.rowRefs = new Map();
    tr.rowStates = new Map();
    tr.windowManager = getMapxWindowManager();
    tr.el = tr.windowManager.el;
    bindAll(tr);
  }

  async show() {
    const tr = this;
    try {
      await tr.fetchData();
      tr.buildWindow();
    } catch (e) {
      console.error("Tiles report error:", e);
    }
  }

  async fetchData() {
    const tr = this;
    const data = await ws.emitAsync(
      "/client/project/tiles_check/get",
      {},
      30 * 1000,
    );
    if (data.error) {
      throw new Error(data.error);
    }
    tr.rows = data.rows || [];
  }

  buildWindow() {
    const tr = this;
    const el = tr.el;

    tr.refs = {};
    tr.rowRefs = new Map();
    tr.rowStates = new Map();

    tr.refs.progressLabel = el("span", { class: "tiles-report-progress" });
    const titleContent = [
      tt("project_tiles_report_title"),
      " ",
      tr.refs.progressLabel,
    ];

    tr.refs.btnRun = el(
      "button",
      {
        class: ["btn", "btn-default"],
        type: "button",
        on: { click: tr.handleRun },
      },
      tt("project_tiles_report_btn_run"),
    );

    const btnClose = el(
      "button",
      {
        class: ["btn", "btn-primary"],
        type: "button",
        on: { click: () => tr.window?.close("close") },
      },
      tt("btn_close"),
    );

    tr.refs.statusArea = el("span", { class: "tiles-report-status" });

    tr.window = tr.windowManager.open({
      key: WINDOW_KEY,
      title: titleContent,
      content: tr.buildTable(),
      footerEnd: [tr.refs.btnRun, btnClose],
      status: tr.refs.statusArea,
      modal: true,
      closeable: true,
      draggable: true,
      resizable: true,
      collapsible: true,
      snappable: true,
      geometry: {
        width: "min(900px, calc(100vw - 32px))",
        height: "min(600px, calc(100vh - 64px))",
      },
      onClose: () => tr.channel?.destroy(),
    });
    tr.window.classList.add("tiles-report-window");

    if (tr.running) {
      tr.refs.btnRun.disabled = true;
      tr.refs.btnRun.replaceChildren(tt("project_tiles_report_running"));
    }
  }

  buildTable() {
    const tr = this;
    const el = tr.el;

    if (isEmpty(tr.rows)) {
      return el(
        "div",
        { class: "alert alert-info" },
        tt("project_tiles_report_no_views"),
      );
    }

    const elHeaderRow = el("tr", [
      el(
        "th",
        {
          class: ["text-center", "tiles-report-tools"],
          scope: "col",
        },
        tt("project_tiles_report_col_actions"),
      ),
      el(
        "th",
        { class: "tiles-report-title", scope: "col" },
        tt("project_tiles_report_col_title"),
      ),
      el(
        "th",
        { class: "tiles-report-editor", scope: "col" },
        tt("project_tiles_report_col_editor"),
      ),
      el(
        "th",
        { class: "text-center", scope: "col" },
        tt("project_tiles_report_col_tiles"),
      ),
      el(
        "th",
        { class: "text-center", scope: "col" },
        tt("project_tiles_report_col_legend"),
      ),
      el(
        "th",
        { class: "text-center", scope: "col" },
        tt("project_tiles_report_col_status"),
      ),
      el(
        "th",
        { class: "tiles-report-checked", scope: "col" },
        tt("project_tiles_report_col_checked_at"),
      ),
      el(
        "th",
        { class: "tiles-report-detail", scope: "col" },
        tt("project_tiles_report_col_detail"),
      ),
    ]);

    const elRows = tr.rows.map((row) => {
      const tileStatusCell = el("td", { class: "text-center" });
      const legendStatusCell = el("td", { class: "text-center" });
      legendStatusCell.dataset.configured = row.legend_url ? "true" : "false";
      const statusCell = el("td", { class: "text-center" });
      const checkedCell = el("td", { class: "tiles-report-checked" });
      const detailCell = el("td", { class: "tiles-report-detail" });
      tr.rowRefs.set(row.id_view, {
        tileStatusCell,
        legendStatusCell,
        statusCell,
        checkedCell,
        detailCell,
      });

      tr.setRowStatus(row.id_view, tr.statusLabel(row, "tile"), "tile");
      tr.setRowStatus(row.id_view, tr.statusLabel(row, "legend"), "legend");
      tr.setRowStatus(row.id_view, tr.statusLabel(row, "overall"), "overall");
      checkedCell.replaceChildren(
        row.checked_at
          ? new Date(row.checked_at).toLocaleString()
          : tt("project_tiles_report_never"),
      );
      detailCell.replaceChildren(...tr.detailNodes(row));

      const editButton = el(
        "button",
        {
          class: [
            "btn-circle",
            "btn-circle-small",
            "hint--right",
            "tiles-report-edit",
          ],
          type: "button",
          dataset: {
            lang_key: "project_tiles_url_editor_title",
            lang_type: "tooltip",
          },
          on: { click: () => tr.handleEdit(row) },
        },
        el("i", { class: ["fa", "fa-pencil"], "aria-hidden": "true" }),
      );
      const checkButton = el(
        "button",
        {
          class: [
            "btn-circle",
            "btn-circle-small",
            "hint--right",
            "tiles-report-check",
          ],
          type: "button",
          dataset: {
            lang_key: "project_tiles_report_btn_check",
            lang_type: "tooltip",
          },
          on: { click: () => tr.handleCheck(row) },
        },
        el("i", { class: ["fa", "fa-heartbeat"], "aria-hidden": "true" }),
      );
      getDictItem("project_tiles_url_editor_title")
        .then((label) => editButton.setAttribute("aria-label", label))
        .catch(console.error);
      getDictItem("project_tiles_report_btn_check")
        .then((label) => checkButton.setAttribute("aria-label", label))
        .catch(console.error);

      return el("tr", { dataset: { idView: row.id_view } }, [
        el(
          "td",
          { class: ["text-center", "tiles-report-tools"] },
          el("span", { class: "tiles-report-actions" }, [
            editButton,
            checkButton,
          ]),
        ),
        el(
          "th",
          { class: "tiles-report-title", scope: "row" },
          row.title || row.id_view,
        ),
        el("td", { class: "tiles-report-editor" }, row.editor_email || ""),
        tileStatusCell,
        legendStatusCell,
        statusCell,
        checkedCell,
        detailCell,
      ]);
    });

    return el(
      "div",
      { class: "tiles-report-container" },
      el("table", { class: ["table", "tiles-report-table"] }, [
        el("thead", elHeaderRow),
        el("tbody", elRows),
      ]),
    );
  }

  statusLabel(row, resource = "overall") {
    if (resource === "legend" && !row.legend_url && row.legend_configured !== true) {
      return rasterStatusConfig("not_configured");
    }
    if (isEmpty(row.checked_at)) return rasterStatusConfig("unchecked");
    return rasterStatusLabel(row, resource, {
      configured: resource !== "legend" || Boolean(row.legend_url || row.legend_configured),
    });
  }

  statusConfig(state) {
    return rasterStatusConfig(state);
  }

  setRowStatus(idView, status, resource = "overall") {
    const tr = this;
    const refs = tr.rowRefs.get(idView);
    if (!refs) {
      return;
    }
    const state = tr.rowStates.get(idView) || {};
    state[resource] = status.state;
    tr.rowStates.set(idView, state);
    const cell = resource === "tile"
      ? refs.tileStatusCell
      : resource === "legend"
        ? refs.legendStatusCell
        : refs.statusCell;
    cell.replaceChildren(
      tr.el(
        "span",
        {
          class: [
            "label",
            `label-${status.className}`,
            "tiles-report-status-label",
          ],
        },
        [
          tr.el("i", { class: status.icon, "aria-hidden": "true" }),
          " ",
          tt(status.translationKey),
        ],
      ),
    );
  }

  setRowChecking(idView) {
    const tr = this;
    const refs = tr.rowRefs.get(idView);
    if (!refs) return;
    tr.setRowStatus(idView, tr.statusConfig("checking"), "tile");
    tr.setRowStatus(idView, tr.statusConfig("checking"), "overall");
    if (refs.legendStatusCell.dataset.configured !== "false") {
      tr.setRowStatus(idView, tr.statusConfig("checking"), "legend");
    }
  }

  setRowDone(idView, message) {
    const tr = this;
    const refs = tr.rowRefs.get(idView);
    if (!refs) {
      return;
    }
    const row = { ...message, checked_at: Date.now() };
    tr.setRowStatus(idView, tr.statusLabel(row, "tile"), "tile");
    tr.setRowStatus(idView, tr.statusLabel(row, "legend"), "legend");
    tr.setRowStatus(idView, tr.statusLabel(row, "overall"), "overall");
    refs.checkedCell.textContent = new Date().toLocaleString();
    refs.detailCell.replaceChildren(...tr.detailNodes(message));
  }

  resetRowsPending() {
    const tr = this;
    for (const [idView, refs] of tr.rowRefs) {
      tr.setRowStatus(idView, tr.statusConfig("pending"), "tile");
      tr.setRowStatus(idView, tr.statusConfig("pending"), "overall");
      if (refs.legendStatusCell.dataset.configured !== "false") {
        tr.setRowStatus(idView, tr.statusConfig("pending"), "legend");
      }
    }
  }

  setRowsIncomplete() {
    const tr = this;
    const incomplete = tr.statusConfig("incomplete");
    for (const [idView, states] of tr.rowStates) {
      for (const resource of ["tile", "legend", "overall"]) {
        if (states[resource] === "pending" || states[resource] === "checking") {
          tr.setRowStatus(idView, incomplete, resource);
        }
      }
    }
  }

  detailItems(row) {
    const details = [
      row.tile_detail && {
        resource: "tiles",
        code: row.tile_detail,
        httpStatus: row.tile_http_status,
      },
      row.legend_configured && row.legend_detail && {
        resource: "legend",
        code: row.legend_detail,
        httpStatus: row.legend_http_status,
      },
    ].filter(Boolean);

    if (details.length || !row.detail) {
      return details;
    }

    return String(row.detail)
      .split(/\s*,\s*/)
      .filter(Boolean)
      .map((detail) => {
        const match = detail.match(/^(tiles|legend):(.+)$/);
        return match
          ? { resource: match[1], code: match[2].trim() }
          : { resource: null, code: detail.trim() };
      });
  }

  detailNodes(row) {
    const tr = this;
    const nodes = [];
    for (const [index, detail] of tr.detailItems(row).entries()) {
      if (index > 0) nodes.push(", ");
      if (detail.resource) {
        nodes.push(tt(DETAIL_RESOURCE_KEYS[detail.resource]), ": ");
      }

      const translationKey = DETAIL_TRANSLATION_KEYS.get(detail.code);
      if (!translationKey) {
        nodes.push(
          tr.el("code", { class: "tiles-report-detail-code" }, detail.code),
        );
        continue;
      }

      if (detail.code === "http_error" && detail.httpStatus) {
        nodes.push(
          tt("project_tiles_report_detail_http_error_status", {
            data: { status: detail.httpStatus },
          }),
        );
      } else {
        nodes.push(tt(translationKey));
      }
    }
    return nodes;
  }

  setProgress(done, total) {
    const tr = this;
    if (!tr.refs.progressLabel) {
      return;
    }
    tr.refs.progressLabel.textContent = total ? `(${done}/${total})` : "";
  }

  setStatus(message) {
    const tr = this;
    if (!tr.refs.statusArea) {
      return;
    }
    if (!message) {
      tr.refs.statusArea.replaceChildren();
      return;
    }
    tr.refs.statusArea.replaceChildren(
      tt("project_tiles_report_run_error"),
      ": ",
      message,
    );
  }

  async handleRun() {
    const tr = this;
    if (tr.running) {
      return;
    }
    tr.running = true;
    tr.refs.btnRun.disabled = true;
    tr.refs.btnRun.replaceChildren(tt("project_tiles_report_running"));
    tr.setStatus(null);
    tr.resetRowsPending();
    tr.setProgress(0, tr.rows.length);

    let done = 0;

    tr.channel = new TilesCheckChannel({
      onProgress: (message) => {
        if (message.state === "checking") {
          tr.setRowChecking(message.id_view);
          return;
        }
        if (message.state === "done") {
          done += 1;
          tr.setRowDone(message.id_view, message);
          tr.setProgress(done, tr.rows.length);
        }
      },
      onDone: () => {
        tr.finishRun();
      },
      onError: (message) => {
        tr.setStatus(message?.message);
        tr.setRowsIncomplete();
        tr.finishRun();
      },
    });

    try {
      const { total } = await tr.channel.start(settings.project.id);
      tr.setProgress(0, total || tr.rows.length);
    } catch (e) {
      console.error("Tiles report run error:", e);
      tr.setStatus(e.message);
      tr.setRowsIncomplete();
      tr.finishRun();
    }
  }

  handleEdit(row) {
    const tr = this;
    if (!tr._urlEditor) {
      tr._urlEditor = new RasterUrlConfigurator({ root: tr.windowManager.root });
    }
    tr._urlEditor.show({
      idView: row.id_view,
      onSaved: (freshRow, config) => {
        if (!freshRow) {
          return;
        }
        Object.assign(row, freshRow, {
          tile_url: config.tiles,
          legend_url: config.legend,
        });
        tr.rowRefs.get(row.id_view).legendStatusCell.dataset.configured =
          config.legend ? "true" : "false";
        tr.setRowDone(freshRow.id_view, freshRow);
      },
    });
  }

  async handleCheck(row) {
    const tr = this;
    if (tr.rowStates.get(row.id_view)?.overall === "checking") return;
    tr.setRowStatus(row.id_view, tr.statusConfig("pending"), "tile");
    tr.setRowStatus(row.id_view, tr.statusConfig("pending"), "overall");
    if (row.legend_url) {
      tr.setRowStatus(row.id_view, tr.statusConfig("pending"), "legend");
    }
    tr.setRowChecking(row.id_view);
    try {
      const data = await ws.emitAsync(
        "/client/project/tiles_check/run_one",
        { idView: row.id_view },
        30 * 1000,
      );
      if (data.error) throw new Error(data.error);
      Object.assign(row, data.row);
      tr.setRowDone(row.id_view, data.row);
    } catch (error) {
      tr.setRowsIncomplete();
      tr.setStatus(error.message || String(error));
    }
  }

  finishRun() {
    const tr = this;
    tr.running = false;
    tr.channel = null;
    if (tr.refs.btnRun) {
      tr.refs.btnRun.disabled = false;
      tr.refs.btnRun.replaceChildren(tt("project_tiles_report_btn_run"));
    }
  }
}
