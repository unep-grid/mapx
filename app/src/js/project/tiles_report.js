// @ts-check
import { getMapxWindowManager } from "../window/index.js";
import { ws } from "../mx.js";
import { settings } from "../settings";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";
import { isEmpty } from "../is_test/index.js";
import { TilesCheckChannel } from "./tiles_check_channel.js";
import { TilesUrlEditor } from "./tiles_url_editor.js";

const WINDOW_KEY = "project-tiles-report";

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
      el("th", tt("project_tiles_report_col_title")),
      el("th", tt("project_tiles_report_col_editor")),
      el(
        "th",
        { class: "text-center" },
        tt("project_tiles_report_col_status"),
      ),
      el("th", tt("project_tiles_report_col_checked_at")),
      el("th", tt("project_tiles_report_col_detail")),
      el("th", {
        class: ["text-center", "tiles-report-tools"],
        scope: "col",
        "aria-label": tt("project_tiles_url_editor_title"),
      }),
    ]);

    const elRows = tr.rows.map((row) => {
      const statusCell = el("td", { class: "text-center" });
      const checkedCell = el("td");
      const detailCell = el("td");
      tr.rowRefs.set(row.id_view, { statusCell, checkedCell, detailCell });

      tr.setRowStatus(row.id_view, tr.statusLabel(row));
      checkedCell.replaceChildren(
        row.checked_at
          ? new Date(row.checked_at).toLocaleString()
          : tt("project_tiles_report_never"),
      );
      detailCell.textContent = row.detail || "";

      const editButton = el(
        "button",
        {
          class: ["btn-circle", "btn-circle-small", "tiles-report-edit"],
          type: "button",
          title: tt("project_tiles_url_editor_title"),
          "aria-label": tt("project_tiles_url_editor_title"),
          on: { click: () => tr.handleEdit(row) },
        },
        el("i", { class: ["fa", "fa-pencil"], "aria-hidden": "true" }),
      );

      return el("tr", { dataset: { idView: row.id_view } }, [
        el("td", row.title || row.id_view),
        el("td", row.editor_email || ""),
        statusCell,
        checkedCell,
        detailCell,
        el("td", { class: ["text-center", "tiles-report-tools"] }, editButton),
      ]);
    });

    return el(
      "div",
      { class: "tiles-report-container" },
      el("table", { class: ["table", "table-striped"] }, [
        el("thead", elHeaderRow),
        el("tbody", elRows),
      ]),
    );
  }

  statusLabel(row) {
    if (isEmpty(row.checked_at)) {
      return {
        label: tt("project_tiles_report_status_unchecked"),
        className: "default",
      };
    }
    if (row.valid) {
      return {
        label: tt("project_tiles_report_status_valid"),
        className: "success",
      };
    }
    return {
      label: tt("project_tiles_report_status_invalid"),
      className: "danger",
    };
  }

  setRowStatus(idView, { label, className }) {
    const tr = this;
    const refs = tr.rowRefs.get(idView);
    if (!refs) {
      return;
    }
    refs.statusCell.replaceChildren(
      tr.el("span", { class: `label label-${className}` }, label),
    );
  }

  setRowChecking(idView) {
    const tr = this;
    tr.setRowStatus(idView, {
      label: tt("project_tiles_report_status_checking"),
      className: "default",
    });
  }

  setRowDone(idView, message) {
    const tr = this;
    const refs = tr.rowRefs.get(idView);
    if (!refs) {
      return;
    }
    tr.setRowStatus(
      idView,
      tr.statusLabel({ checked_at: Date.now(), valid: message.valid }),
    );
    refs.checkedCell.textContent = new Date().toLocaleString();
    refs.detailCell.textContent = message.detail || "";
  }

  resetRowsPending() {
    const tr = this;
    const pending = tr.statusLabel({ checked_at: null });
    for (const idView of tr.rowRefs.keys()) {
      tr.setRowStatus(idView, pending);
    }
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
        tr.finishRun();
      },
    });

    try {
      const { total } = await tr.channel.start(settings.project.id);
      tr.setProgress(0, total || tr.rows.length);
    } catch (e) {
      console.error("Tiles report run error:", e);
      tr.setStatus(e.message);
      tr.finishRun();
    }
  }

  handleEdit(row) {
    const tr = this;
    if (!tr._urlEditor) {
      tr._urlEditor = new TilesUrlEditor();
    }
    tr._urlEditor.show({
      idView: row.id_view,
      tileUrl: row.tile_url,
      onSaved: (freshRow, savedUrl) => {
        if (!freshRow) {
          return;
        }
        row.tile_url = savedUrl;
        tr.setRowDone(freshRow.id_view, freshRow);
      },
    });
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
