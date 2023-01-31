import { WsToolsBase } from "../ws_tools/base.js";
import {
  modal,
  modalPrompt,
  modalConfirm,
  modalDialog,
} from "./../mx_helper_modal.js";
import { modalSelectSource } from "../select_auto";
import { el, elButtonFa, elCheckbox, tt } from "../el_mapx";
import { moduleLoad } from "./../modules_loader_async";
import { getDictTemplate, getDictItem } from "./../language";
import { getArrayDistinct } from "./../array_stat";
import { prefGet, prefSet } from "./../user_pref";
import { modalMarkdown } from "./../modal_markdown/index.js";
import { makeId, buttonEnable } from "../mx_helper_misc.js";
import { RadialProgress } from "../radial_progress";
import { theme } from "../mx.js";
import { Popup } from "../popup";
import {
  isPgType,
  isPgTypeDate,
  typeConvert,
  getPgTypes,
  getHandsonLanguageCode,
} from "./../handsontable/utils.js";
import {
  isSourceId,
  isNotEmpty,
  isFunction,
  isEmpty,
  isNumeric,
  isString,
  isStringRange,
  isSafeName,
  makeSafeName,
} from "./../is_test/index.js";

import "./edit_table.types.js";
import "./edit_table.less";
import { onNextFrame, waitFrameAsync } from "../animation_frame";

/* import { jpeg2000 } from "modernizr";*/
const defaults = {
  debug: false,
  log_perf: false, //def from ws_tools
  id_table: null,
  ht_license: "non-commercial-and-evaluation",
  id_column_main: "gid",
  id_column_valid: "_mx_valid",
  id_columns_reserved: ["gid", "_mx_valid", "geom"],
  id_columns_style: [],
  max_changes: 1e5, //max one column at max rows
  min_columns: 3,
  max_rows: 1e5, // should match server
  max_changes_large: 1e3,
  max_columns: 1e3, // should match server
  timeout_emit: 1e3 * 10, // 10s round trip
  timeout_sanizing: 1e3 * 60,
  timeout_geom_valid: 1e3 * 120,
  routes: {
    /**
     * server to here
     */
    server_joined: "/server/source/edit/table/joined",
    server_error: "/server/source/edit/table/error",
    server_new_member: "/server/source/edit/table/new_member",
    server_member_exit: "/server/source/edit/table/member_exit",
    server_table_data: "/server/source/edit/table/data",
    server_dispatch: "/server/source/edit/table/dispatch",
    server_progress: "/server/source/edit/table/progress",
    server_geom_validate_result: "/server/source/edit/table/geom/result",
    /**
     * here to server
     */
    client_edit_start: "/client/source/edit/table",
    client_edit_updates: "/client/source/edit/table/update",
    client_exit: "/client/source/edit/table/exit",
    client_geom_validate: "/client/source/edit/table/geom/validate",
    client_value_validate: "/client/source/edit/table/value/validate",
    client_changes_sanitize: "/client/source/edit/table/changes/sanitize",
  },
  id_source_dialog: "from_dialog",
  id_source_dispatch: "from_dispatch",
  id_source_geom: "from_geom",
  id_source_sanitize_ok: "from_sanitize_ok",
  id_source_sanitize_error: "from_sanitize_error",
};

export class EditTableSessionClient extends WsToolsBase {
  constructor(socket, config) {
    super(socket);
    const et = this;
    et._config = Object.assign(et._config, et._config, defaults, config);
    /**
     * cb bind
     */
    //et._validate_text_date = et._validate_text_date.bind(et);
  }

  /**
   * Get generic state
   */
  get state() {
    const et = this;

    const state = {
      id: et.id,
      disabled: !!et._disabled,
      initialized: !!et._initialized,
      destroyed: !!et._destroyed,
      built: !!et._built,
      locked: !!et._locked,
      validation_geom: et._valdiation_geom,
    };
    return state;
  }

  /**
   * Async initialisation
   */
  async init() {
    const et = this;
    try {
      const r = et._config.routes;
      if (et._initialized) {
        return;
      }
      et._updates = new Map();
      et._validation_cache = new Map();
      et._dispatch_queue = new Set();
      et._batch_cells = [];
      et._members = [];
      et._columns = [];
      et._popups = [];
      et._locked = false;
      et._disabled = false;
      et._in_progress = false;
      et._select_auto = [];
      et._lock_table_concurrent = false;
      et._lock_table_by_user_id = null;
      et._initialized = true;
      et._id_table = et._config?.id_table;
      et._has_geom = false;
      et._validation_geom = {};
      et._table_ready = false;
      et._init_data = [];
      /**
       * If empty id, display a dialog to select
       */
      if (isEmpty(et._id_table)) {
        et._id_table = await et.dialogSelectTable();
        if (!isSourceId(et._id_table)) {
          et.destroy("invalid id table");
          return;
        }
      }

      const valid = isSourceId(et._id_table);
      if (!valid) {
        throw new Error("Invalid table id");
      }

      /**
       * ⚠️  If multiple instances, they WILL LISTEN TO ALL instances actions
       *    to propagate changes between instances : table id as distinctive
       *    value to route changes
       *    e.g.
       *       table a, user a -> updates
       *       table a, user a -> handle update ( same tab )
       *       table a, user a -> handle update ( other tab )
       *       table a, user b -> handle updates
       *
       *  -> test in callback and discard unmatched. e.g.
       *     <msg>.id_table != this._id_table
       *  Alternative :
       *   - use name space
       *   - distinct socket
       *   - sync event ID between server and client
       */
      et._socket.on(r.server_joined, et.onJoined);
      et._socket.on(r.server_error, et.onServerError);
      et._socket.on(r.server_new_member, et.onNewMember);
      et._socket.on(r.server_member_exit, et.onMemberExit);
      et._socket.on(r.server_table_data, et.initTable);
      et._socket.on(r.server_dispatch, et.onDispatch);
      et._socket.on(r.server_progress, et.onProgress);
      //et._socket.on(r.server_geom_validate_result, et.onGeomValidateResult);

      et._socket.on("disconnect", et.onDisconnect);
      await et.dialogWarning();
      /**
       * Build UI
       */
      await et.build();

      /**
       * Request data from server
       * -> detached ! Build UI in the meantime
       */
      await et.start();

      /**
       * If a on_destroy callback is set in option, add it
       * to others destroy callback
       */
      if (isFunction(et._config.on_destroy)) {
        et.addDestroyCb(et._config.on_destroy);
      }

      await et.once("table_ready", null);

      /**
       * Register cb
       */
      et.on("after_change_done", () => {
        et.updateButtons(50);
      });

      return true;
    } catch (e) {
      et.destroy("init issue");
      throw new Error(e);
    }
  }

  /**
   * Display a warning : editing will alter your data
   */
  async dialogWarning() {
    const et = this;
    if (et._config.test_mode) {
      return;
    }
    const showWarning = await prefGet("pref_show_edit_table_warning_2");
    if (showWarning === null || showWarning === true) {
      const keepShowing = await modalConfirm({
        title: getDictItem("edit_table_modal_warning_title"),
        content: getDictItem("edit_table_modal_warning_text"),
        cancel: getDictItem("edit_table_modal_warning_ok_no_more"),
        confirm: getDictItem("edit_table_modal_warning_ok"),
      });
      await prefSet("pref_show_edit_table_warning_2", keepShowing);
    }
  }

  /**
   * Start edtion or restart during init or reconnection
   * @param {Object} opt Options
   * @param {Boolean} opt.send_table Resend full table
   */
  async start(opt) {
    const et = this;
    const r = et._config.routes;
    const def = { send_table: true };
    opt = Object.assign({}, def, opt);
    await et.emit(r.client_edit_start, opt);
  }

  /**
   * Destroy handler
   * Quit  process :
   * - If unsaved change, ask for confirmation
   * - Unlock concurent table, if not autosave
   * - Emit quit event
   * - Remove listeners
   * - Fire destroy
   */
  async destroy() {
    const et = this;
    try {
      if (et._destroyed) {
        return;
      }
      /**
       * Prevent quit with unsaved changes
       */
      const nValid = et.countUpdateValid();
      if (nValid > 0) {
        const skip = et._config.test_mode;
        if (!skip) {
          const quit = await modalConfirm({
            title: tt("edit_table_modal_quit_ignore_changes_title"),
            content: tt("edit_table_modal_quit_ignore_changes", {
              data: {
                count: nValid,
              },
            }),
            confirm: tt("btn_confirm"),
            cancel: tt("btn_cancel"),
          });
          if (!quit) {
            return false;
          }
        }
      }

      const r = et._config.routes;
      et._destroyed = true;
      et._lock_table_concurrent = false;
      et._lock_table_by_user_id = null;
      if (!et._auto_save) {
        et.lockTableConcurrent(false).catch((e) => {
          console.error(e);
        });
      }
      et.emit(r.client_exit).catch((e) => {
        console.error(e);
      });
      et._modal?.close();
      et._popups.forEach((p) => p.destroy());
      et._resize_observer?.disconnect();
      et._socket.off(r.server_joined, et.onJoined);
      et._socket.off(r.server_error, et.onServerError);
      et._socket.off(r.server_new_member, et.onNewMember);
      et._socket.off(r.server_member_exit, et.onMemberExit);
      et._socket.off(r.server_table_data, et.initTable);
      et._socket.off(r.server_dispatch, et.onDispatch);
      et._socket.off(r.server_progress, et.onProgress);
      //et._socket.off(r.server_geom_validate_result, et.onGeomValidateResult);
      et._socket.off("disconnect", et.onDisconnect);
      et.fire("destroy").catch((e) => {
        console.error(e);
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Build UI
   */
  async build() {
    const et = this;

    if (et._built) {
      return;
    }
    et._built = true;
    et._el_button_close = elButtonFa("btn_close", {
      icon: "times",
      action: et.destroy,
    });
    et._el_button_save = elButtonFa("btn_save", {
      icon: "floppy-o",
      action: et.save,
    });
    et._el_button_undo = elButtonFa("btn_edit_undo", {
      icon: "undo",
      action: et.undo,
    });
    et._el_button_redo = elButtonFa("btn_edit_redo", {
      icon: "repeat",
      action: et.redo,
    });
    et._el_button_wiki = elButtonFa("btn_help", {
      icon: "question-circle",
      action: et.dialogHelp,
    });
    et._el_button_add_column = elButtonFa("btn_edit_add_column", {
      icon: "plus-circle",
      action: et.dialogAddColumn,
    });
    et._el_button_remove_column = elButtonFa("btn_edit_remove_column", {
      icon: "minus-circle",
      action: et.dialogRemoveColumn,
    });
    et._el_checkbox_autosave = elCheckbox("btn_edit_autosave", {
      action: et.updateAutoSave,
      checked: true,
    });

    /**
     * Geom
     */
    et._el_button_geom_validate = elButtonFa("btn_edit_geom_validate", {
      icon: "check",
      action: et.dialogGeomValidate,
    });

    et._el_button_geom_repair = elButtonFa("btn_edit_geom_repair", {
      icon: "user-md",
      action: et.dialogGeomRepair,
    });

    /**
     * Toolbox
     */
    et._el_menu_tools = et._button_dropdown("btn_edit_menu_tools", {
      position: "top",
      content: [
        et._el_button_add_column,
        et._el_button_remove_column,
        et._el_button_geom_validate,
        et._el_button_geom_repair,
      ],
    });

    /**
     * User stat
     */
    et._el_users_stat = el("ul");
    et._el_users_stat_wrapper = el("small", [
      tt("edit_table_users_stat"),
      et._el_users_stat,
    ]);

    et._el_row_slider = el("div", {
      class: "edit-table--row-slider",
    });
    et._el_row_slider_container = el(
      "div",
      { class: "mx-slider-container" },
      et._el_row_slider
    );

    et._el_toolbar = el("div", { class: "edit-table--toolbar" }, [
      et._el_row_slider_container,
      et._el_checkbox_autosave,
      et._el_users_stat_wrapper,
    ]);

    et._el_updates_counter = el("span", {
      class: "edit-table--updates-counter",
      dataset: { count: 0 },
    });
    et._el_button_save.appendChild(et._el_updates_counter);

    const elModalButtons = [
      et._el_button_close,
      et._el_button_save,
      et._el_button_undo,
      et._el_button_redo,
      et._el_menu_tools,
      et._el_button_wiki,
    ];

    et._el_table = el("div", {
      class: "edit-table--table",
    });

    et._el_table_wrapper = el(
      "div",
      {
        class: "edit-table--table-wrapper",
      },
      et._el_table
    );

    et._el_overlay = el("div", {
      class: "edit-table--overlay",
      dataset: {
        disconnected: "Disconnected, trying to reconnect",
        disabled: "Disabled",
        locked: "Locked",
      },
    });

    et._el_progress = el("div", {
      class: "edit-table--progress",
    });
    const col = theme.getColorThemeItem("mx_ui_link");
    et._progress = new RadialProgress(et._el_progress, {
      radius: 60,
      stroke: 4,
      strokeColor: col,
      addTrack: true,
      addText: true,
    });
    window._et = et;

    et._el_content = el(
      "div",
      { class: ["mx_handsontable", "edit-table--container"] },
      et._el_overlay,
      et._el_progress,
      et._el_table_wrapper,
      et._el_toolbar
    );
    et._el_title = el("span");
    et._modal = modal({
      id: `edit_table_modal_${et.id}`,
      title: et._el_title,
      content: et._el_content,
      buttons: elModalButtons,
      style: {
        minWidth: "800px",
      },
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: true,
      noBtnGroup: true,
      onClose: () => {
        et.destroy("modal close");
      },
    });

    await et.fire("built");
  }

  initColumns(updates) {
    const et = this;
    et._columns = [];
    et.addColumns(updates);
  }

  addColumns(updates) {
    const et = this;
    const nColumns = et._columns.length + updates.length;
    const singleCol = updates.length === 1;

    let cPos = 0;

    for (const update of updates) {
      /**
       * Invalid name = not editable. See :
       * https://github.com/handsontable/handsontable/issues/5439
       */
      const column = et._column(update.column_name, update.column_type);
      column._pos = singleCol
        ? nColumns
        : column._invalid
        ? nColumns + 1
        : column.readOnly
        ? -1
        : cPos++;

      et._columns.push(column);
    }

    et._columns.sort((a, b) => a._pos - b._pos);
    et.updateColumnLabels();
  }

  updateColumnLabels() {
    const et = this;
    et._columns_labels = et._columns.map((c) => c.data);
  }

  addColumnStrict(update) {
    const et = this;

    const isValid =
      et.isValidName(update.column_name) && isPgType(update.column_type);

    if (!isValid) {
      console.warn(
        `Invalid column. Name: ${update.column_name} Type: ${update.column_type}`
      );
      return false;
    }
    et.addColumns([update]);
    return true;
  }

  updateTableColumns() {
    const et = this;
    et._ht.updateSettings({
      columns: et.getColumns(),
      colHeaders: et.getColumnLabels(),
    });
    et._ht.render();
  }

  get column_index() {
    const et = this;
    return et._config.id_column_main;
  }

  setColumns(columns) {
    const et = this;
    et._columns.length = 0;
    et._columns.push(...columns);
  }

  getColumns() {
    const et = this;
    return et._columns;
  }

  getColumnLabels() {
    const et = this;
    return et._columns_labels;
  }

  _column(name, pg_type) {
    const et = this;
    const column = {};
    const isInvalid = !isSafeName(name);
    const readOnly = et.isReadOnly(name);
    const isOkType = isPgType(pg_type);
    if (!isOkType) {
      throw new Error(`Wrong type in column creator : ${pg_type}`);
    }
    column._pos = 0;
    column.data = name;
    column.readOnly = readOnly || isInvalid;
    column._invalid = isInvalid;
    column._pg_type = pg_type;
    column.type = typeConvert(pg_type, "mx_handsontable");
    return column;
  }

  /**
   * Groupped button/count update
   * @param {Number} timeout Add tiemout before update. Solve cases when the hook do not fire at the right time : adding a small delay could solve issues;
   */
  updateButtons(timeout) {
    const et = this;
    timeout = isNumeric(timeout) ? timeout : 0;
    if (!et._table_ready || timeout) {
      setTimeout(et._update_buttons_now, timeout);
    } else {
      et._update_buttons_now();
    }
  }

  _update_buttons_now() {
    const et = this;
    if (!et._table_ready) {
      return;
    }
    et.updateButtonsGeom();
    et.updateButtonSave();
    et.updateButtonsUndoRedo();
    et.updateButtonsAddRemoveColumn();
  }

  /**
   * Groupped column add/remove update
   */
  updateButtonsAddRemoveColumn() {
    const et = this;
    et.updateButtonRemoveColumn();
    et.updateButtonAddColumn();
  }

  /**
   * Get current members
   * @return {Array} array of members
   */
  getMembers() {
    const et = this;
    return getArrayDistinct(et._members);
  }

  /**
   * Check if there is concurrent members
   * @return {Boolean} has concurrent members
   */
  hasConcurrentMembers() {
    const et = this;
    const members = et.getMembers();
    return members.length > 1;
  }

  /**
   * Update members state info
   */
  updateMembersStat() {
    const et = this;
    const members = et.getMembers();
    const elFrag = new DocumentFragment();
    const groups = {};

    for (const member of members) {
      if (groups[member.id]) {
        groups[member.id].n_sessions += 1;
      } else {
        groups[member.id] = {
          n_sessions: 1,
          email: member.email,
          id: member.id,
        };
      }
    }

    for (const member of Object.values(groups)) {
      const elMember = el(
        "li",
        el("span", member.email),
        el("span", ` ( ${member.n_sessions} )`)
      );
      elFrag.appendChild(elMember);
    }
    et._el_users_stat.replaceChildren(elFrag);
  }

  /**
   * Toggle undo/redo button depending on available redo/undo in the table
   */
  updateButtonsUndoRedo() {
    const et = this;
    const hasRedo = et._ht.isRedoAvailable();
    const hasUndo = et._ht.isUndoAvailable();
    et._button_enable(et._el_button_redo, hasRedo);
    et._button_enable(et._el_button_undo, hasUndo);
  }

  /**
   * Update button geom tools
   */
  updateButtonsGeom() {
    const et = this;
    const hasGeom = et._has_geom;
    et._button_enable(et._el_button_geom_repair, hasGeom);
    et._button_enable(et._el_button_geom_validate, hasGeom);
  }

  /**
   * Toggle remove column button depending on current columns number
   */
  updateButtonRemoveColumn() {
    const et = this;
    const columns = et.getColumns();
    et._disable_remove_column = columns.length <= et._config.min_columns;
    et._button_enable(et._el_button_remove_column, !et._disable_remove_column);
  }

  /**
   * Toggle add column button depending on current columns number
   */
  updateButtonAddColumn() {
    const et = this;
    const columns = et.getColumns();
    et._disable_add_column = columns.length > et._config.max_columns;
    et._button_enable(et._el_button_add_column, !et._disable_add_column);
  }

  /**
   * Toggle save button depending on auto_save and updates number
   */
  updateButtonSave() {
    const et = this;
    const hasAutoSave = et._auto_save;
    const n = et.countUpdateValid();
    const hasNoUpdates = n === 0;
    const disable = hasNoUpdates || hasAutoSave;
    et._el_updates_counter.dataset.count = n;
    et._button_enable(et._el_button_save, !disable);
  }

  /**
   * Set autosave mode
   * @param {Boolean} enable Enable autosave mode;
   * @return {Boolean} enabled
   */
  async setAutoSave(enable) {
    const et = this;
    et._el_checkbox_autosave.querySelector("input").checked = !!enable;
    return et.updateAutoSave();
  }

  /**
   * Update _auto_save state, based on checkbox, trigger lock to others
   */
  async updateAutoSave() {
    const et = this;
    try {
      et._auto_save = et._el_checkbox_autosave.querySelector("input").checked;
      et.updateButtonSave();
      if (et._auto_save) {
        et.save();
      }
      await et.lockTableConcurrent(!et._auto_save);
    } catch (e) {
      console.error(e);
    }
    return et._auto_save;
  }

  /**
   * Handler of lock update message
   * @param {Object} update Update object
   * @param {Object} message Container message
   */
  handlerUpdateLock(update, message) {
    const et = this;
    if (update.lock) {
      et._lock_table_by_user_id = message.id_user;
      et.lock();
    } else {
      et._lock_table_by_user_id = null;
      et.unlock();
    }
  }

  /**
   * Column formater
   * @param {Integer} pos column index
   * @param {Element} element Element header
   */
  formatColumns(pos, element) {
    const et = this;
    /**
     * TODO : if dev is requested, uncomment this
     */
    const DEV_TO_BE_VALIDATED = false;
    if (DEV_TO_BE_VALIDATED) {
      if (pos >= 0) {
        const type = et.getColumnTypeById(pos);
        element.classList.add(`edit-table--header`);
        element.classList.add(`edit-table--header-${type}`);
        element.title = type;
      }
    }
  }

  /**
   * Set instance height based on table el;
   */
  updateHeight() {
    const et = this;
    const r = et._el_table.getBoundingClientRect();
    return r.height - 30;
  }

  /**
   * Update table layout : minimize buttons, table resize,
   * e.g. after container change
   * NOTE: too sketchy with requestAnimationFrame..
   */
  updateLayout() {
    const et = this;
    clearTimeout(et._update_to);
    et._update_to = setTimeout(() => {
      const rectWrapper = et._el_table_wrapper.getBoundingClientRect();
      et._el_table.style.height = `${rectWrapper.height || 100}px`;
      et._ht.render();
    }, 300);
  }

  /**
   * Column name validation : columns used internally
   * @param {String} name
   * @return {Boolean}
   */
  isColumnReserved(name) {
    const et = this;
    return et._config.id_columns_reserved.includes(name);
  }
  /**
   * Column name validation : columns used in style
   * @param {String} name
   * @return {Boolean}
   */
  isColumnStyle(name) {
    const et = this;
    return et._config.id_columns_style.includes(name);
  }
  /**
   *  Check if this is a date column
   * @param {String} name Column name
   * @return {Boolean} is a date column
   */
  isColumnDate(name) {
    const et = this;
    const type = et.getColumnType(name, "postgres");
    return isPgTypeDate(type);
  }

  /**
   * Column name validation : column not editable
   * @param {String} name
   * @return {Boolean}
   */
  isReadOnly(name) {
    const et = this;
    return et.isColumnReserved(name) || !isSafeName(name);
  }

  /**
   * Column name validation : check is name is valid
   * @param {String} name
   * @return {Boolean}
   */
  isValidName(name) {
    const et = this;
    const isSafe = isSafeName(name);
    const isNotStyle = !et.isColumnStyle(name);
    const isNotReserved = !et.isColumnReserved(name);
    return isSafe && isNotReserved && isNotStyle;
  }

  /**
   * Display a dialog with illegal columns
   */
  async columnNameIssueDialog() {
    const et = this;
    const columnsIssues = [];
    const labels = et.getColumnLabels();

    for (const label of labels) {
      if (!isSafeName(label)) {
        columnsIssues.push(label);
      }
    }
    if (isNotEmpty(columnsIssues)) {
      if (et._config.test_mode) {
        console.warn("Invalid columns", columnsIssues);
        return;
      }
      await modalDialog({
        title: getDictItem("edit_table_modal_columns_name_issue_title"),
        content: getDictTemplate(
          "edit_table_modal_columns_name_issue_content",
          {
            columns: `<li>${columnsIssues.join("</li><li>")}</li>`,
          }
        ),
      });
    }
  }

  /**
   * Global progress management
   */
  setProgress(percent, text) {
    const et = this;
    text = text || "";
    onNextFrame(() => {
      et._progress.update(percent, text);

      if (percent === 0) {
        et._progress.clear();
        if (et._in_progress) {
          et._in_progress = false;
          et.updateButtons();
        }
        et._el_progress.classList.remove("active");
      } else {
        if (!et._in_progress) {
          et._in_progress = true;
          et.updateButtons();
        }
        et._el_progress.classList.add("active");
      }
    });
  }

  setProgressMessage(message, from, to) {
    const et = this;
    if (message?.nParts > 1) {
      const p = message.part / message.nParts;
      const pl = et.lerp(from || 0, to || 100, p);
      et.setProgress(pl);
    }
  }

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }

  /**
   * Progress from server
   */
  onProgress(message) {
    const et = this;
    try {
      if (message.id_table !== et._id_table) {
        return;
      }

      const percent = Math.ceil(message.percent * 100);
      et.setProgress(percent);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Initial table render
   * ⚠️  called multiple times until table.end
   * @param {EditTableData} table Table object
   */
  async initTable(table) {
    const et = this;

    if (isEmpty(table)) {
      return;
    }

    if (table.id_table !== et._id_table) {
      return;
    }

    /**
     * Show progress
     */

    if (table.start) {
      et._init_data.length = 0;
    }

    et._init_data.push(...table.data);

    if (!table.end) {
      return;
    }

    // Remove progress, replace data with the temporary one
    table.data = et._init_data;
    delete et._init_data;

    /**
     * Build handsontable object
     */
    const initLocked = table.locked && et.hasConcurrentMembers();
    const handsontable = await moduleLoad("handsontable");

    if (et._ht instanceof handsontable) {
      et._ht.destroy();
    }

    /**
     * Custom types
     */
    et._register_custom_types(handsontable);

    /**
     * Set modal title
     */
    const title = table.title;
    et._el_title.innerText = await getDictTemplate("edit_table_modal_title", {
      title,
    });

    /**
     * If table has geom,
     */
    if (table.hasGeom) {
      et._has_geom = true;
      et._validation_geom = table.validation;
    }

    if (isNotEmpty(table.colStyle)) {
      et._config.id_columns_style.push(...table.colStyle);
    }

    /**
     * Init columns
     */
    et.initColumns(table.types);

    /**
     * New handsontable
     */
    et._ht = new handsontable(et._el_table, {
      licenseKey: et._config.ht_license,
      columns: et.getColumns(),
      data: table.data,
      rowHeaders: true,
      columnSorting: true,
      colHeaders: et.getColumnLabels(),
      allowInvalid: true,
      allowInsertRow: false,
      renderAllRows: false,
      maxRows: table.data.length,
      dropdownMenu: [
        "filter_by_condition",
        "filter_operators",
        "filter_by_condition2",
        "filter_action_bar",
      ],
      filters: true,
      contextMenu: false,
      language: getHandsonLanguageCode(),
      afterFilter: null,
      beforeOnCellContextMenu: et._cancel_context_menu,
      beforeChange: et.beforeChange,
      //beforeValidate: et.beforeValidate,
      afterGetColHeader: et.formatColumns,
      afterChange: et.afterChange,
      afterLoadData: et.afterLoadData,
      height: et.updateHeight,
      disableVisualSelection: false,
    });

    /**
     * Add hooks
     */
    et._ht.addHook("afterUndo", () => {
      // isRedoAvailable is not ready after undo, add delay
      et.updateButtons(20);
    });
    et._ht.addHook("afterRedo", () => {
      // isUndoAvailable is not ready after redo, add delay
      et.updateButtons(20);
    });

    /**
     * On modal resize, updateLayout
     */
    et._resize_observer = new ResizeObserver((_) => {
      et.updateLayout();
    });
    et._resize_observer.observe(et._el_table);

    if (initLocked) {
      et.lock();
    }
  }

  /**
   * Get table dimension
   */
  getTableDimension() {
    const et = this;
    const cols = et._ht.getColHeader().length;
    const rows = et._ht.getRowHeader().length;
    return {
      cols,
      rows,
    };
  }

  async afterLoadData() {
    const et = this;
    try {
      /**
       * Dialog for column name issue
       */
      await et.columnNameIssueDialog();

      /**
       * Initial state of undo/redo buttons.
       */
      await et.updateAutoSave();
      et.updateButtons();

      /**
       * Clear progress
       */
      et.setProgress(0);

      /**
       * Fire on ready cb, if any
       */
      et._table_ready = true;
      await et.fire("table_ready");
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * On server error, display a dialog
   */
  async onServerError(error) {
    const et = this;
    try {
      console.error("server error", error);

      if (!et._config.test_mode) {
        const continueSession = await modalConfirm({
          title: "Server error",
          content: `An error occured: ${
            error?.message || "Unknown error"
          }. Continue or end the session ?`,
          confirm: "Continue",
          cancel: "Exit tool",
        });

        if (!continueSession) {
          await et.destroy("server error");
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Reset stored members info
   */
  updateMembers(members) {
    const et = this;
    if (isEmpty(members)) {
      console.warn("Update members: no members received");
      return;
    }
    et._members.length = 0;
    et._members.push(...members);
    et.updateMembersStat();
  }

  /**
   * Store info after joining a edition session
   */
  onJoined(message) {
    const et = this;
    if (et._id_session) {
      return;
    }
    et._id_table = message.id_table;
    et._id_room = message.id_room;
    et._id_session = message.id_session;
    et.updateMembers(message.members);
  }

  /*
   * Handle when new memeber enter
   * @param {Object} update message
   */
  onNewMember(message) {
    const et = this;
    et.updateMembers(message.members);
  }

  /*
   * Handler when member exit
   * @param {Object} update message
   */
  onMemberExit(message) {
    const et = this;
    et.updateMembers(message.members);
  }

  /**
   * Handle dispatched message from others
   * Can't be blocking
   */
  onDispatch(message) {
    const et = this;
    try {
      if (message.id_table !== et._id_table) {
        return;
      }

      et._log_dispatch("received", message);
      et.setProgressMessage(message, 1, 50);
      et.addDispached(message);

      if (message.end) {
        et.processDispached();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async processDispached() {
    const et = this;
    try {
      const idDispatch = `${et._config.id_source_dispatch}@${makeId()}`;
      const dispached = et.flushDispachedArray();
      for (const message of dispached) {
        et.setProgressMessage(message, 51, 100);
        // wait for progress animation
        await waitFrameAsync();
        et._log_dispatch("process", message);

        if (isNotEmpty(message.updates)) {
          for (const update of message.updates) {
            switch (update.type) {
              case "lock_table":
                et.handlerUpdateLock(update, message);
                break;
              case "update_cell":
                et.handlerUpdateCellsCollect(update, message);
                break;
              case "add_column":
                et.handlerUpdateColumnAdd(update, idDispatch);
                break;
              case "remove_column":
                et.handlerUpdateColumnRemove(update, idDispatch);
                break;
              default:
                console.warn("unhandled update:", message);
            }
          }
        }

        const processCells = message.end && et.countBatchCells() > 0;

        if (processCells) {
          await et.handlerCellsBatchProcess(idDispatch);
        }

        if (message.end) {
          et.setProgress(0);
        }
      }
    } catch (e) {
      et.setProgress(0);
      console.error(e);
    }
  }

  /**
   * Batch cells operations
   */
  cleanBatchCells() {
    const et = this;
    et._batch_cells.length = 0;
  }
  countBatchCells() {
    const et = this;
    return et._batch_cells.length;
  }
  flushBatchCells() {
    const et = this;
    const cells = [...et._batch_cells];
    et.cleanBatchCells();
    return cells;
  }
  addBatchCell(cell) {
    const et = this;
    et._batch_cells.push(cell);
  }
  addBatchCells(cells) {
    const et = this;
    et._batch_cells.push(...cells);
  }

  /**
   * Handler update in batch : array of array
   * @return {Promise<Boolean>}
   */
  handlerCellsBatchProcess(source) {
    const et = this;
    return new Promise((resolve, reject) => {
      try {
        const validSource = et.isFromValidSource(source);

        /**
         * Espect known source
         */
        if (!validSource) {
          console.warn(`Cells not processed, invalid source id ${source}`);
          return resolve(false);
        }

        // copy cells, empty queue;
        const cells = et.flushBatchCells();

        if (isEmpty(cells)) {
          console.warn("Batch cells handler requested, but no cells found");
          return resolve(false);
        }

        et.on("after_change_done", cbChange);

        et.setCells({ cells: cells, source: source });

        function cbChange(data) {
          if (data.source === source) {
            et.off("after_change_done", cbChange);
            return resolve(true);
          }
        }
      } catch (e) {
        console.warn("handlerCellsBatchProcess", e);
        return reject(false);
      }
    });
  }

  /**
   * Wrapper for set data at cell
   * @param {Object} config Configuration
   * @param {Array} config.cells Array of cells [[id_row,id_col,value],]
   * @param {String} config.source Data source id
   */
  setCells(config) {
    const et = this;
    et._ht.setDataAtCell(config.cells, null, null, config.source);
  }

  /**
   * Same as setCells, but wait for sanitized
   * @return {Promise<object>} Wait for sanitized stats
   */
  setCellsWaitSanitize(config) {
    const et = this;
    return new Promise((resolve) => {
      et.once("sanitized", resolve);
      et.setCells(config);
    });
  }

  /**
   * Add an update to batch cells array
   * -> udpate to  [[idRow, idCol, value],...]
   * @param {Object} update Update
   */
  async handlerUpdateCellsCollect(update) {
    const et = this;
    const idRow = update.row_id;
    const idCol = et.getColumnId(update.column_name);
    et.addBatchCell([idRow, idCol, update.value_new]);
  }

  /**
   * Undo + update buttons
   */
  undo() {
    const et = this;
    et._ht.undo();
  }

  /**
   * Redo + update buttons
   */
  redo() {
    const et = this;
    et._ht.redo();
  }

  /**
   * Get a list of columns (handsontable style)
   */
  getColumns() {
    return this._columns;
  }

  /**
   * Handle column removal from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnRemove(update, source) {
    const et = this;
    try {
      const columns = et.getColumns();
      let n = columns.length;
      let colRemoved = {}; // keep track for cleaning redo / updates
      while (n--) {
        const col = columns[n];
        if (col.data === update.column_name) {
          /**
           * Splice / remove
           * Keep position
           */
          colRemoved.column = columns.splice(n, 1);
          colRemoved.pos = n;
          continue;
        }
      }

      if (isEmpty(colRemoved)) {
        console.warn(`Column ${update.column_name} not removed`);
        return;
      }

      /**
       * Update columns label
       */
      et.updateColumnLabels();

      /**
       * ⚠️ Column removal using alter('remove_col',) is not
       * supported using data object as source !
       * - Error: cannot remove column with object data source or columns option specified
       * Strategy : whole manual process
       * Here is how this should be done, by the book for array as source :
       * - use the context menu OR manually, find the index of the column starting from end
       * const id = nColumns - 1 - colRemoved.pos;
       * - Alter table
       * et._ht.alter("remove_col", id);
       */
      et._ht.updateSettings({
        columns: et.getColumns(),
        colHeaders: et.getColumnLabels(),
      });

      /**
       * Remove update item that ref the removed column
       */
      et.clearUpdateRefColName(update.column_name);

      /**
       * Same for undo/redo
       */
      et.clearUndoRedoRefCol(colRemoved.pos);

      const data = et._ht.getSourceData();
      for (const row of data) {
        delete row[update.column_name];
      }

      et._ht.loadData(data);
      // not available in 6.2.2
      //et._ht.updateData(data, "column_remove_handler");

      /**
       * Update buttons state
       */
      et.updateButtons();

      /**
       * Render table
       */
      et._ht.render();

      if (et.isFromDispatch(source)) {
        return;
      }

      await et.emitUpdatesDb([update]);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * Test if id source is from dispatch
   */
  isFromDispatch(id) {
    const et = this;
    id = id || "";
    return id.split("@")[0] === et._config.id_source_dispatch;
  }
  isFromGeom(id) {
    const et = this;
    id = id || "";
    return id.split("@")[0] === et._config.id_source_geom;
  }
  isFromSanitize(id) {
    const et = this;
    return et.isFromSanitizeError(id) || et.isFromSanitizeOk(id);
  }
  isFromSanitizeError(id) {
    const et = this;
    return id === et._config.id_source_sanitize_error;
  }
  isFromSanitizeOk(id) {
    const et = this;
    return id === et._config.id_source_sanitize_ok;
  }
  isFromValidSource(id) {
    const et = this;
    return et.isFromDispatch(id) || et.isFromGeom(id) || et.isFromSanitize(id);
  }

  /*
   * Interactive column remove
   */
  async dialogRemoveColumn() {
    const et = this;
    const names = et.getColumnLabels();
    const optionColumnNames = [];
    const source = et._config.id_source_dialog;

    for (const name of names) {
      const isValid = et.isValidName(name);
      if (isValid) {
        const elOption = el("option", { value: name }, name);
        optionColumnNames.push(elOption);
      }
    }

    const columnToRemove = await modalPrompt({
      title: tt("edit_table_modal_remove_column_title"),
      label: tt("edit_table_modal_remove_column_label"),
      confirm: tt("edit_table_modal_remove_column_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        placeholder: "Column name",
        value: names[0],
      },
      inputChildren: optionColumnNames,
    });

    if (!columnToRemove) {
      return;
    }

    /**
     * Ask the user for confirmation
     */
    const confirmRemove = await modalPrompt({
      title: tt("edit_table_modal_remove_column_confirm_title"),
      label: tt("edit_table_modal_remove_column_confirm_text", {
        data: {
          column_name: columnToRemove,
        },
      }),
      confirm: tt("btn_edit_table_modal_remove_column_confirm"),
      inputTag: "input",
      inputOptions: {
        type: "checkbox",
        value: false,
        class: [], // "form-control" produce glitches
      },
      onInput: async (accept, elBtnConfirm) => {
        et._button_enable(elBtnConfirm, accept);
      },
    });

    if (!confirmRemove) {
      return;
    }

    const update = {
      type: "remove_column",
      id_table: et._id_table,
      column_name: columnToRemove,
    };

    et.handlerUpdateColumnRemove(update, source);
  }

  /**
   * Handle column addition from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnAdd(update, source) {
    const et = this;
    try {
      const done = et.addColumnStrict(update);

      if (!done) {
        return;
      }
      et.updateTableColumns();
      et.updateButtonsAddRemoveColumn();

      if (et.isFromDispatch(source)) {
        /**
         * Dispatched event : don't re-dispatch
         */
        return;
      }

      await et.emitUpdatesDb([update]);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * Test if column name exists
   * @param {string} name Column name
   */
  columnNameExists(name) {
    const et = this;
    const names = et._columns.map((c) => c.data);
    return names.includes(name);
  }

  /*
   * Interactive column add
   */
  async dialogAddColumn() {
    const et = this;
    const source = et._config.id_source_dialog;
    let valid = false;

    /**
     * Ask the user for the new column name and validate
     */
    const columnName = await modalPrompt({
      title: tt("edit_table_modal_add_column_name_title"),
      label: tt("edit_table_modal_add_column_name_label"),
      confirm: tt("edit_table_modal_add_column_name_next"),
      inputOptions: {
        type: "text",
        value: `new_column_${makeId()}`,
        placeholder: "Column name",
      },
      onInput: async (name, elBtnConfirm, elMessage) => {
        const minLength = 3;
        const maxLength = 50;
        const safeName = makeSafeName(name);
        const validUnique = !et.columnNameExists(name);
        const validName = et.isValidName(name);
        const validLength = isStringRange(name, minLength, maxLength);

        while (elMessage.firstElementChild) {
          elMessage.firstElementChild.remove();
        }

        valid = validName && validUnique && validLength;

        if (!validLength) {
          const elIssue = tt("edit_table_modal_add_column_name_issue_length", {
            data: {
              minLength,
              maxLength,
            },
          });
          elMessage.appendChild(elIssue);
        }

        if (!validName) {
          const elIssue = tt(
            "edit_table_modal_add_column_name_issue_invalid_characters"
          );
          elMessage.appendChild(elIssue);
        }

        if (!validUnique) {
          const elIssue = tt(
            "edit_table_modal_add_column_name_issue_non_available"
          );
          elMessage.appendChild(elIssue);
        }

        if (valid) {
          const elIssue = tt("edit_table_modal_add_column_name_template", {
            data: {
              column_name: safeName,
            },
          });
          elMessage.appendChild(elIssue);
        }

        et._button_enable(elBtnConfirm, valid);
      },
    });

    /**
     * If prompt is canceled or if it's not valid, quit
     */
    if (columnName === false || !valid) {
      return;
    }

    /**
     * Last sanitation
     */
    const columnNameSafe = makeSafeName(columnName);

    /**
     * Ask the user for a column type
     */
    const types = getPgTypes();
    const typeOptions = [];
    for (const type of types) {
      const elOption = el("option", { value: type }, type);
      typeOptions.push(elOption);
    }

    const columnType = await modalPrompt({
      title: tt("edit_table_modal_add_column_type_title"),
      label: tt("edit_table_modal_add_column_type_label"),
      confirm: tt("edit_table_modal_add_column_type_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        value: types[0],
        placeholder: "Column type",
      },
      inputChildren: typeOptions,
    });

    if (columnType === false) {
      return;
    }
    const isValidColumnType = isPgType(columnType);

    if (!isValidColumnType) {
      throw new Error(`Invalid column type: ${columnType}`);
    }

    /**
     * Ask the user for confirmation
     */
    const confirmCreate = await modalConfirm({
      title: tt("edit_table_modal_add_column_confirm_title"),
      content: getDictTemplate("edit_table_modal_add_column_confirm_text", {
        column_name: columnNameSafe,
        column_type: columnType,
      }),
      cancel: tt("btn_cancel"),
      confirm: tt("btn_edit_table_modal_add_column_confirm"),
    });

    if (!confirmCreate) {
      return;
    }

    const update = {
      type: "add_column",
      id_table: et._id_table,
      column_name: columnNameSafe,
      column_type: columnType,
    };

    return et.handlerUpdateColumnAdd(update, source);
  }

  /**
   * Get column pg type
   * @param {String} columnName Column name
   * @param {String} mode mode : postgres, json, input. Default = 'json'
   * @return {String} type
   */
  getColumnType(columnName, mode) {
    const et = this;
    mode = mode || "json";
    const type = et._columns.find((c) => c.data === columnName)?._pg_type;
    return typeConvert(type, mode);
  }

  /**
   * Get column json type using column position
   * @param {Integer} column id / position
   * @return {String} type
   */
  getColumnTypeById(columnId) {
    const et = this;
    const type = et._columns[columnId]?._pg_type;
    return typeConvert(type, "json");
  }

  /**
   * Get column id
   * @param {String} columnName Column name
   * @return {Integer} column id
   */
  getColumnId(columnName) {
    const et = this;
    for (let i = 0; i < et._columns.length; i++) {
      const col = et._columns[i];
      if (col.data === columnName) {
        return i;
      }
    }
    throw new Error(`Column ${columnName} not found`);
  }

  /**
   * Check if a column exists
   * @param {String} column name
   * @return {Boolean} exists
   */
  columnExists(columnName) {
    const et = this;
    return !!et._columns.find((c) => c.data === columnName);
  }

  /**
   * Display info when change is not valid
   * @param {Number} n Number of invalid
   * @return {Promise<String>} action continue / undo
   */
  async infoValidation(n) {
    const et = this;
    if (et._config.test_mode) {
      return true;
    }
    et.setReadOnly(true);
    await modalDialog({
      title: tt("edit_table_modal_values_invalid_title"),
      content: getDictTemplate("edit_table_modal_values_invalid", {
        amount: n,
      }),
      close: tt("edit_table_modal_values_invalid_ok"),
      style: {
        opacity: "0.92",
      },
    });
    et.setReadOnly(false);
  }

  /**
   * Display a dialog when large change is received
   * @param {Number} nChanges Number of changes
   * @return {Promise<Boolean>} continue
   */
  async confirmLargeUpdate(nChanges) {
    const et = this;

    if (et._config.test_mode) {
      return true;
    }
    await et.lockAll();
    const proceedLargeChanges = await modalConfirm({
      title: tt("edit_table_modal_large_changes_number_title"),
      content: getDictTemplate(
        "edit_table_modal_large_changes_number_content",
        {
          count: nChanges,
        }
      ),
      confirm: tt("btn_edit_table_modal_large_changes_number_continue"),
      cancel: tt("btn_edit_table_modal_large_changes_number_undo"),
    });
    await et.unlockAll();
    return proceedLargeChanges;
  }

  /**
   * Display a dialog when the the changes are too large
   * @param {Number} nChanges Number of changes
   * @return {Promise<Boolean>} continue
   */
  async dialogChangesToBig(nChanges) {
    const et = this;
    if (et._config.test_mode) {
      return true;
    }
    await modalDialog({
      title: tt("edit_table_modal_changes_too_big_title"),
      content: getDictTemplate("edit_table_modal_changes_too_big_content", {
        count: nChanges,
        max_changes: et._config.max_changes,
      }),
      close: tt("btn_edit_table_modal_changes_too_big_ok"),
    });
  }

  /*
   * Handle logic for after cell update
   * @param {Array} changes Array of changes
   * @param {String} source Change source : dispatch/undo/edit ...
   */
  afterChange(changes, source) {
    /* changes: [[row, prop, oldValue, newValue]] */
    const et = this;

    try {
      if (isEmpty(changes)) {
        return;
      }

      /**
       * In case of undo after large numnber of change,
       * no values was sent. The undo will trigger 'afterChange',
       * but there is no need to send the changes. Ignore that event.
       */
      if (et._ignore_next_changes) {
        et._ignore_next_changes = false;
        return;
      }

      /**
       * Ignore dispatch changes, only "edit","Autofill.fill","..".
       */
      if (et.isFromDispatch(source)) {
        return;
      }
      /**
       * Ignore cells with errors
       */
      if (et.isFromSanitizeError(source)) {
        return;
      }

      for (const change of changes) {
        /* change: [row, prop, oldValue, newValue] */

        if (change[2] === change[3]) {
          /* no change */
          continue;
        }
        et.addChangeToUpdates(change, true);
      }

      /**
       * Save
       */
      if (et._auto_save) {
        et.save();
      }
    } catch (e) {
      console.error(e);
    } finally {
      et.fire("after_change_done", { source });
    }
  }

  /**
   * Save and dispatch changes
   */
  async save() {
    const et = this;
    const updates = et.getUpdatesArray();
    if (et._disconnected) {
      console.warn("Can't save while disconnected");
      return;
    }
    if (et._lock_table_by_user_id) {
      console.warn("Can't save while locked");
      return;
    }
    if (isEmpty(updates)) {
      return;
    }
    await et.emitUpdatesDb(updates);
    et.clearUpdates();
    et.updateButtons();
  }

  /**
   * Push update, or delete if equal original state
   * TODO: isValid is always valid : remote validation, and if
   *       not valid = not added to updates
   * @param {Object} change
   * @param {Boolean} isValid
   */
  addChangeToUpdates(change, isValid) {
    const et = this;
    const idRow = et._ht.toPhysicalRow(change[0]);
    const row = et._ht.getSourceDataAtRow(idRow);
    const gid = row[et.column_index];
    const columnName = change[1];
    const columnType = et.getColumnType(columnName, "postgres");
    const isEmptyOrig = isEmpty(change[2]);
    const isEmptyNew = isEmpty(change[3]);

    const valOrig = change[2];
    const valNew = change[3];

    const update = {
      id_table: et._id_table,
      type: "update_cell",
      column_name: columnName,
      column_type: columnType,
      value_orig: isEmptyOrig ? null : valOrig,
      value_new: isEmptyNew ? null : valNew,
      valid: isValid,
      gid: gid,
      row_id: idRow,
    };

    if (update.value_new === update.value_orig) {
      return;
    }

    const id = `${update.id_table}_${update.gid}_${update.column_name}`;
    const previous = et._updates.get(id);
    if (previous) {
      const noChange = previous.value_orig === update.value_new;
      if (noChange) {
        et._updates.delete(id);
        return;
      }
    }
    et._updates.set(id, update);
  }
  /**
   * Update management
   */
  clearUpdates() {
    const et = this;
    et._updates.clear();
  }
  getUpdates() {
    const et = this;
    return et._updates.values();
  }
  getUpdatesArray() {
    const et = this;
    return Array.from(et.getUpdates());
  }
  countUpdateValid() {
    const et = this;
    return et._updates.size;
  }

  /**
   * Dispatch management
   */
  clearDispatched() {
    const et = this;
    et._dispatch_queue.clear();
  }
  getDispached() {
    const et = this;
    return et._dispatch_queue.values();
  }
  getDispachedArray() {
    const et = this;
    return Array.from(et.getDispached());
  }
  addDispached(message) {
    const et = this;
    et._dispatch_queue.add(message);
  }
  flushDispachedArray() {
    const et = this;
    const out = et.getDispachedArray();
    et.clearDispatched();
    return out;
  }

  /**
   * Set readonly
   */
  setReadOnly(readOnly) {
    const et = this;
    const ro = !!readOnly;
    et._ht.deselectCell();
    et._ht.updateSettings({
      readOnly: ro,
      contextMenu: !ro,
      disableVisualSelection: ro,
      manualColumnResize: !ro,
      manualRowResize: !ro,
      comments: !ro,
    });
    et.updateButtons();
  }

  /**
   * Disable the tool
   */
  disable() {
    const et = this;
    et._disabled = true;
    et._el_overlay.classList.add("disabled");
    et.setReadOnly(true);
  }

  /**
   * Enable the tool
   */
  enable() {
    const et = this;
    et._disabled = false;
    et._el_overlay.classList.remove("disabled");
    et.setReadOnly(false);
  }

  /**
   * Handle disconnection
   */
  onDisconnect() {
    const et = this;
    et.disable();
    et._disconnected = true;
    et._el_overlay.classList.add("disconnected");
    et._socket.io.once("reconnect", et.onReconnect);
  }

  /**
   * Handle reconnection
   */
  async onReconnect() {
    const et = this;
    try {
      et._disconnected = false;
      et._el_overlay.classList.remove("disconnected");
      et.enable();
      await et.start({
        send_table: false,
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Get locked state
   */
  get locked() {
    const et = this;
    return !!et._locked;
  }

  /**
   * Lock the tool
   */
  lock() {
    const et = this;
    et.disable();
    et._locked = true;
    et._el_overlay.classList.add("locked");
  }

  /**
   * Unlock the tool
   */
  unlock() {
    const et = this;
    et._disconnected = false;
    et._el_overlay.classList.remove("locked");
    et._locked = false;
    et.enable();
  }

  /**
   * Send lock event to other concurent user
   * @param {Boolean} lock Enable/disable lock for other. If empty, use _auto_save state
   */
  async lockTableConcurrent(lock) {
    const et = this;
    et._lock_table_concurrent = isNotEmpty(lock) ? lock : !et._auto_save;
    const update = {
      type: "lock_table",
      lock: et._lock_table_concurrent,
    };
    await et.emitUpdatesState([update]);
  }

  async lockAll() {
    const et = this;
    await et.lockTableConcurrent(true);
    et.lock();
  }

  async unlockAll() {
    const et = this;
    await et.lockTableConcurrent(!et._auto_save);
    et.unlock();
  }

  /**
   * ws emit wrapper : format message and emit
   * @param {String} type Emit type
   * @param {Object} message Message to emit, if not locked
   */
  emit(type, message, timeout) {
    const et = this;
    const to = isEmpty(timeout) ? et._config.timeout_emit : timeout;

    return new Promise((resolve, reject) => {
      if (!et.state.built) {
        return false;
      }
      if (et.locked) {
        return false;
      }
      const messageEmit = et.message_formater(message);
      et._socket.timeout(to).emit(type, messageEmit, (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * ws emit wrapper : format message and emit
   * @param {String} type Emit type
   * @param {Object} message Message to emit, if not locked
   */
  async emitGet(type, message, timeout) {
    const et = this;
    const to = isEmpty(timeout) ? et._config.timeout_emit : timeout;
    return new Promise((resolve) => {
      const messageEmit = et.message_formater(message);
      et._socket.timeout(to).emit(type, messageEmit, (err, res) => {
        if (err) {
          console.error(err);
          resolve(false);
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * ws emit wrapper :  emit updates
   * @param {Array} update Array of updates
   * @param {Object} opt Options pased to emit message
   */
  async emitUpdates(updates, opt) {
    const et = this;
    const r = et._config.routes;
    if (et.locked) {
      return;
    }
    if (et._config.test_mode) {
      console.warn("Test mode. Updates not emited:", updates);
      return;
    }

    const n = updates.length;
    const max = et._config.max_changes_large;
    const nChunk = Math.ceil(n / max);

    try {
      for (let iChunk = 0; iChunk < nChunk; iChunk++) {
        const chunk = updates.splice(0, max);
        await et.emit(r.client_edit_updates, {
          nParts: nChunk,
          part: iChunk + 1,
          start: iChunk === 0,
          end: iChunk === nChunk - 1,
          updates: chunk,
          ...opt,
        });
      }
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  /**
   * emit update + write to db (if authentication match server side)
   * @param {Array} updates
   */
  async emitUpdatesDb(updates) {
    const et = this;
    await et.emitUpdates(updates, { write_db: true });
  }

  /**
   * emit state update (e.g. lock state change )
   * @param {Array} updates
   */
  async emitUpdatesState(updates) {
    const et = this;
    await et.emitUpdates(updates, { update_state: true });
  }

  /**
   * Format emit message : add/re add id for session, table, etc.
   * @note : could be better handled by namespaces...
   * @param {Object|String} data Message
   * @param {Object} opt Options to merge
   * @return {Object} Formated message
   */
  message_formater(data, opt) {
    const et = this;

    if (isEmpty(data)) {
      data = {};
    }
    if (isString(data)) {
      data = {
        message: data,
      };
    }

    const m = {
      id_user: et._id_user,
      id_table: et._id_table,
      id_room: et._id_room,
      id_session: et._id_session,
      ...data,
      ...opt,
    };

    return m;
  }

  /**
   * Display a dialog with the help from wiki
   */
  dialogHelp() {
    return modalMarkdown({
      title: getDictItem("edit_table_modal_help"),
      wiki: "Attribute-table-edition",
    });
  }

  /**
   * Display a dialog with source selection
   * - built with tom select, in select_auto module
   */
  async dialogSelectTable() {
    const res = await modalSelectSource({
      disable_large: true,
      disable_missing: true,
    });
    return res;
  }

  /**
   * Geometry tools
   */
  async dialogGeomValidate() {
    const et = this;
    if (et.locked) {
      return;
    }
    const r = et._config.routes;
    const ok = await modalConfirm({
      title: getDictItem("edit_table_modal_validate_title"),
      content: getDictItem("edit_table_modal_validate_desc"),
      cancel: getDictItem("btn_cancel"),
      confirm: getDictItem("btn_continue"),
    });

    if (!ok) {
      return;
    }
    const data = await et.emitGet(
      r.client_geom_validate,
      {
        use_cache: false,
        autoCorrect: false,
      },
      et._config.timeout_geom_valid
    );

    const res = await et.onGeomValidateResult(data);
    return res;
  }

  /**
   * Dialog GEOM repair
   */
  async dialogGeomRepair() {
    const et = this;
    if (et.locked) {
      return;
    }
    const r = et._config.routes;

    const ok = await modalConfirm({
      title: getDictItem("edit_table_modal_repair_title"),
      content: getDictItem("edit_table_modal_repair_desc"),
      cancel: getDictItem("btn_cancel"),
      confirm: getDictItem("btn_continue"),
    });

    if (!ok) {
      return;
    }

    const opt = { use_cache: true, autoCorrect: true };
    const data = await et.emitGet(
      r.client_geom_validate,
      opt,
      et._config.timeout_geom_valid
    );
    const res = et.onGeomValidateResult(data);
    return res;
  }

  /**
   * Geom validate
   */
  async onGeomValidateResult(data) {
    const et = this;
    try {
      const validValues = data?.stat?.values;
      const gidRows = et._ht.getDataAtProp(et.column_index);
      const idBatch = `${et._config.id_source_geom}@${makeId()}`;

      /**
       * Format cell as [2307, '_mx_valid', true]
       */
      const idCol = et.getColumnId(et._config.id_column_valid);

      const cells = validValues.map((v) => {
        const idRow = gidRows.indexOf(v.gid);
        const val = v[et._config.id_column_valid];
        return [idRow, idCol, val];
      });
      et.addBatchCells(cells);
      await et.handlerCellsBatchProcess(idBatch);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  /**
   * Wrapper for buttonEnable : use default from table editor
   * @param {Element} elBtn Button element
   * @param {Boolean} enable Enable / Disable button
   */
  _button_enable(elBtn, enable) {
    const et = this;
    return buttonEnable(
      elBtn,
      et._disabled || et._in_progress ? false : enable
    );
  }

  /**
   * Simple button with drop down / popup wrapper
   * @param {String} key Translation key
   * @param {Object} opt Options ( passed to elButtonFa too)
   * @param {String} opt.position Drop down position : top, right, left, bottom
   * @param {Array} opt.content Drop down content
   * @return {Element}
   */
  _button_dropdown(key, opt) {
    const et = this;
    opt.action = toggleMenu;
    opt.icon = "cogs";
    const elBtn = elButtonFa(key, opt);
    const popup = new Popup({ position: "top", elAnchor: elBtn, ...opt });
    et._popups.push(popup);

    function toggleMenu() {
      popup.toggle();
    }

    return elBtn;
  }

  /**
   * Remove ref to column name from updates
   * e.g. after column removed
   * @param {String} name Column name
   */
  clearUpdateRefColName(name) {
    const et = this;
    et._updates.forEach((update, key) => {
      if (update.column_name === name) {
        et._updates.delete(key);
      }
    });
  }
  /**
   * Remove ref to column name from unduRedo
   * e.g. after column remove
   * @param {Number} pos Column last position
   */
  clearUndoRedoRefCol(pos) {
    const et = this;
    const ur = et._ht.getPlugin("UndoRedo") || et._ht.undoRedo;
    const actions = ur.doneActions;
    const undoneActions = ur.undoneActions;
    et._clear_undo_ref_col(actions, pos);
    et._clear_undo_ref_col(undoneActions, pos);
  }
  /**
   * Helper for clearUndoRedoRefCol
   */
  _clear_undo_ref_col(actions, pos) {
    let nA = actions.length;
    while (nA--) {
      const a = actions[nA];
      if (a.actionType === "change") {
        const changes = a.changes;
        for (const change of changes) {
          if (change[1] === pos) {
            actions.splice(nA, 1);
          }
        }
      }
    }
  }

  /**
   * Sanitize
   */
  async sanitize(changes) {
    const et = this;
    const stat = {};
    try {
      /*
       * Check changes length
       */
      const nChanges = changes.length;
      const changesTooLarge = nChanges > et._config.max_changes;
      const changesLarge = nChanges > et._config.max_changes_large;

      if (changesTooLarge) {
        await et.dialogChangesToBig(nChanges);
        return false;
      }
      if (changesLarge) {
        const confirmChanges = await et.confirmLargeUpdate(nChanges);
        if (!confirmChanges) {
          return false;
        }
      }

      /**
       * Convert changes to updates
       */
      const updates = changes.map((change) => {
        // 0 row, 1 prop, (2 old), 3 new, 4 type
        const type = et.getColumnType(change[1], "postgres");
        // jsonb should be parsed OR stringified after mx_try_cast, which return objects
        const value = change[3];
        //[type === "jsonb" ? JSON.parse(change[3]) : change[3];

        return {
          row_id: change[0],
          column_name: change[1],
          column_type: type,
          value_new: value,
        };
      });

      /*
       * Sanitize by chunk
       */
      const n = updates.length;
      const max = et._config.max_changes_large;
      const nChunk = Math.ceil(n / max);
      const progThreshold = n > 100;
      const sanitized = [];

      if (progThreshold) {
        await et.lockTableConcurrent(true);
      }

      for (let iChunk = 0; iChunk < nChunk; iChunk++) {
        const chunk = updates.splice(0, max);
        const percent = ((iChunk + 1) / nChunk) * 100;
        if (progThreshold) {
          et.setProgress(percent);
        }

        const sanitizedChunk = await et.emitGet(
          et._config.routes.client_changes_sanitize,
          {
            updates: chunk,
          },
          et._config.timeout_sanizing
        );
        sanitized.push(...sanitizedChunk);
      }

      /**
       * Apply sanitized values
       */
      const cellsSanitized = [];
      const cellsError = [];
      /**
       * Removed ht.batch -> not available in 6.2
       */
      //et._ht.batch(() => {
      /**
       * Sanitized updates
       *     -> cells with error
       *     -> cells valid
       */
      for (const update of sanitized) {
        const id_col = et.getColumnId(update.column_name);

        const invalid =
          isEmpty(update.value_sanitized) && isNotEmpty(update.value_new);

        if (invalid) {
          update.value_sanitized = update.value_new;
        }

        const cell = [update.row_id, id_col, update.value_sanitized];

        if (invalid) {
          cellsError.push(cell);
        } else {
          cellsSanitized.push(cell);
        }

        et._ht.setCellMeta(update.row_id, id_col, "valid", !invalid);
      }

      /**
       * Update cell in table
       * valid   -> source ok = dispatch and/or save
       * invalid -> source error = do nothing
       */
      et.setCells({
        cells: cellsSanitized,
        source: et._config.id_source_sanitize_ok,
      });
      et.setCells({
        cells: cellsError,
        source: et._config.id_source_sanitize_error,
      });

      stat.nValid = cellsSanitized.length;
      stat.nError = cellsError.length;
      //});
    } catch (e) {
      console.error(e);
    } finally {
      await et.lockTableConcurrent();
      et.setProgress(0);
      et.fire("sanitized", stat);
    }
  }

  /**
   * before validation
   */
  beforeChange(changes, source) {
    const et = this;
    const skip =
      et.isFromSanitize(source) ||
      et.isFromDispatch(source) ||
      et.isFromGeom(source);

    if (skip) {
      return;
    }

    /*
     * Intercept: validate + sanitize;
     * handsontable 6.2.2 changes should be cloned before
     * sanitazing : the array "changes" is emptied by handsontable
     */
    et.sanitize([...changes]);

    return false;
  }

  /**
   * Cancel context menu
   */
  _cancel_context_menu(e) {
    /*
     * Disable context menu
     */
    e.stopImmediatePropagation();
  }

  _register_custom_types(handsontable) {
    /**
     * Override editor and renderer
     * according to postgres types
     */

    const te = handsontable.editors.TextEditor;
    const tr = handsontable.renderers.TextRenderer;

    const ne = handsontable.editors.NumericEditor;
    const nr = handsontable.renderers.NumericRenderer;

    const be = handsontable.editors.CheckboxEditor;
    const br = handsontable.renderers.CheckboxRenderer;

    const types = {
      mx_jsonb: {
        editor: te,
        renderer: tr,
        validator: null,
        className: null,
      },
      mx_string: {
        editor: te,
        renderer: tr,
        validator: null,
        className: null,
      },
      mx_number: {
        editor: ne,
        renderer: nr,
        validator: null,
        className: "htRight, htNumeric",
      },
      mx_boolean: {
        editor: be,
        renderer: br,
        validator: null,
        className: null,
      },
    };

    for (const type of Object.keys(types)) {
      const c = types[type];
      handsontable.cellTypes.registerCellType(type, {
        editor: c.editor,
        renderer: c.renderer,
        validator: c.validator,
        className: c.className,
        allowInvalid: true,
      });
    }
  }

  /**
   * Debug dispatch helper
   */
  _log_dispatch(label, message) {
    const et = this;
    if (et._config.debug) {
      console.log(
        `dispatch, ${label}: ${message?.part}/${message?.nParts} updates:${message?.updates?.length} type : ${message?.updates[0]?.type} `
      );
    }
  }
}
