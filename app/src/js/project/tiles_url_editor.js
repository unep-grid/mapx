// @ts-check
import { getMapxWindowManager } from "../window/index.js";
import { ws } from "../mx.js";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";

const WINDOW_KEY = "view-tiles-url-editor";
const INPUT_ID = "mx-tiles-url-editor-textarea";

/**
 * Small, purpose-built quick-edit window for a single view's tile URL
 * template: Test (live re-validate, no save) / Save (writes
 * data.source.tiles[0] and re-checks it). Opened from tiles_report.js's
 * action button, entirely bypassing Shiny's general "edit config" modal.
 * The report remains open behind this focused editor so the saved result can
 * be reviewed immediately.
 */
export class TilesUrlEditor {
  constructor() {
    const te = this;
    te.refs = {};
    te.windowManager = getMapxWindowManager();
    te.el = te.windowManager.el;
    bindAll(te);
  }

  /**
   * @param {Object} opt
   * @param {String} opt.idView
   * @param {String} opt.tileUrl
   * @param {(row: Object, savedUrl: String) => void} [opt.onSaved] called
   *   with the fresh mx_views_tiles_check row and the saved URL after a
   *   successful save.
   */
  show({ idView, tileUrl, onSaved }) {
    const te = this;
    const el = te.el;

    te.idView = idView;
    te.onSaved = onSaved;

    te.refs.input = el("textarea", {
      id: INPUT_ID,
      class: "form-control",
      rows: 5,
      autocomplete: "off",
      spellcheck: "false",
    });
    te.refs.input.value = tileUrl || "";

    const formGroup = el("div", { class: "form-group" }, [
      el(
        "label",
        { class: "control-label", for: INPUT_ID },
        tt("project_tiles_url_editor_label"),
      ),
      te.refs.input,
    ]);

    te.refs.result = el("div", {
      class: ["help-block", "tiles-url-editor-result"],
      "aria-live": "polite",
    });

    te.refs.btnTest = el(
      "button",
      {
        class: ["btn", "btn-default"],
        type: "button",
        on: { click: te.handleTest },
      },
      tt("project_tiles_url_editor_btn_test"),
    );

    te.refs.btnSave = el(
      "button",
      {
        class: ["btn", "btn-primary"],
        type: "button",
        on: { click: te.handleSave },
      },
      tt("project_tiles_url_editor_btn_save"),
    );

    const btnCancel = el(
      "button",
      {
        class: ["btn", "btn-default"],
        type: "button",
        on: { click: () => te.window?.close("cancel") },
      },
      tt("btn_close"),
    );

    te.window = te.windowManager.open({
      key: WINDOW_KEY,
      title: tt("project_tiles_url_editor_title"),
      content: el("div", { class: "mx-window-dialog__content" }, [
        formGroup,
        te.refs.result,
      ]),
      footerEnd: [te.refs.btnTest, te.refs.btnSave, btnCancel],
      modal: true,
      closeable: true,
      draggable: true,
      resizable: true,
      geometry: {
        width: "min(680px, calc(100vw - 32px))",
        height: "min(360px, calc(100vh - 64px))",
        minHeight: 260,
      },
    });
  }

  setResult(...children) {
    const te = this;
    te.refs.result.replaceChildren(...children);
  }

  async handleTest() {
    const te = this;
    te.setResult(tt("project_tiles_url_editor_testing"));
    try {
      const data = await ws.emitAsync(
        "/client/view/tiles/test",
        { url: te.refs.input.value },
        15 * 1000,
      );
      if (data.error) {
        throw new Error(data.error);
      }
      const { valid, detail, content_type } = data.result || {};
      te.setResult(
        valid
          ? tt("project_tiles_report_status_valid")
          : tt("project_tiles_report_status_invalid"),
        " — ",
        [content_type, detail].filter(Boolean).join(" — "),
      );
    } catch (e) {
      te.setResult(e.message);
    }
  }

  async handleSave() {
    const te = this;
    te.setResult(tt("project_tiles_url_editor_saving"));
    try {
      const data = await ws.emitAsync(
        "/client/view/tiles/save",
        { idView: te.idView, url: te.refs.input.value },
        15 * 1000,
      );
      if (data.error) {
        throw new Error(data.error);
      }
      te.onSaved?.(data.row, te.refs.input.value);
      te.window?.close("saved");
    } catch (e) {
      te.setResult(tt("project_tiles_url_editor_save_error"), ": ", e.message);
    }
  }
}
