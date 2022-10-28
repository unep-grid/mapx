import { WsToolsBase } from "../ws_tools/base.js";
import {
  modal,
  modalPrompt,
  modalConfirm,
  modalDialog,
} from "./../mx_helper_modal.js";
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
  typeConvert,
  getTypes,
  getHandsonLanguageCode,
} from "./../handsontable/utils.js";
import {
  isSourceId,
  isNotEmpty,
  isFunction,
  isEmpty,
  isString,
  isStringRange,
  isSafeName,
  makeSafeName,
} from "./../is_test/index.js";

import "./edit_table.types.js";
import "./edit_table.less";
const defaults = {
  log_perf: false, //def from ws_tools
  id_table: null,
  ht_license: "non-commercial-and-evaluation",
  id_column_main: "gid",
  id_column_valid: "_mx_valid",
  id_columns_reserved: ["gid", "_mx_valid", "geom"],
  max_changes: 1e4,
  max_changes_warning: 1e3,
  min_columns: 3,
  max_rows: 1e5, // should match server
  max_columns: 1000, // should match server
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
  },
  id_source_dispatch: "from_dispatch",
  id_source_edit: "edit",
};

export class EditTableSessionClient extends WsToolsBase {
  constructor(socket, config) {
    super(socket);
    const et = this;
    et._config = Object.assign(et._config, et._config, defaults, config);
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
      et._members = [];
      et._updates = [];
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
      et._socket.on(r.server_geom_validate_result, et.onGeomValidateResult);

      et._socket.on("disconnect", et.onDisconnect);
      await et.dialogWarning();

      /**
       * Request data from server
       * -> detached ! Build UI in the meantime
       */
      et.start();

      /**
       * Build UI
       */
      await et.build();

      /**
       * If a on_destroy callback is set in option, add it
       * to others destroy callback
       */
      if (isFunction(et._config.on_destroy)) {
        et.addDestroyCb(et._config.on_destroy);
      }

      await et.once("table_ready", null);

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
    const showWarning = await prefGet("pref_show_edit_table_warning");
    if (showWarning === null || showWarning === true) {
      const keepShowing = await modalConfirm({
        title: getDictItem("edit_table_modal_warning_title"),
        content: getDictItem("edit_table_modal_warning_text"),
        cancel: getDictItem("edit_table_modal_warning_ok_no_more"),
        confirm: getDictItem("edit_table_modal_warning_ok"),
      });
      await prefSet("pref_show_edit_table_warning", keepShowing);
    }
  }

  /**
   * Start edtion or restart during init or reconnection
   * @param {Object} opt Options
   * @param {Boolean} opt.send_table Resend full table
   */
  start(opt) {
    const et = this;
    const r = et._config.routes;
    const def = { send_table: true };
    opt = Object.assign({}, def, opt);
    et.emit(r.client_edit_start, opt);
  }

  /**
   * Destroy handler
   */
  async destroy(msg) {
    const et = this;

    if (et._config.debug) {
      console.log("destroy requested:", msg);
    }
    try {
      if (et._destroyed) {
        return;
      }

      if (et._updates.length > 1) {
        const quit = await modalConfirm({
          title: tt("edit_table_modal_quit_ignore_changes_title"),
          content: tt("edit_table_modal_quit_ignore_changes", {
            data: {
              count: et._updates.length,
            },
          }),
          confirm: tt("btn_confirm"),
          cancel: tt("btn_cancel"),
        });
        if (!quit) {
          return false;
        }
      }

      const r = et._config.routes;
      et._destroyed = true;
      et._lock_table_concurrent = false;
      et._lock_table_by_user_id = null;
      et.lockTableConcurrent(false);
      et.emit(r.client_exit);
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
      et._socket.off(r.server_geom_validate_result, et.onGeomValidateResult);
      et._socket.off("disconnect", et.onDisconnect);
      await et.fire("destroy");
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

  /**
   * Groupped button/count update
   * @param {Number} timeout Add tiemout before update. Solve cases when the hook do not fire at the right time : adding a small delay could solve issues;
   */
  updateButtons(timeout) {
    const et = this;
    timeout = isEmpty(timeout) ? null : timeout;
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
    et.perf("update_buttons");
    et.updateButtonsGeom();
    et.updateButtonSave();
    et.updateUpdatesCounter();
    et.updateButtonsUndoRedo();
    et.updateButtonsAddRemoveColumn();
    et.perfEnd("update_buttons");
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
   * Set pending update count in save button
   */
  updateUpdatesCounter() {
    const et = this;
    et._el_updates_counter.dataset.count = `${et._updates.length}`;
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
    et._disable_remove_column = et._columns.length <= et._config.min_columns;
    et._button_enable(et._el_button_remove_column, !et._disable_remove_column);
  }

  /**
   * Toggle add column button depending on current columns number
   */
  updateButtonAddColumn() {
    const et = this;
    et._disable_add_column = et._columns.length > et._config.max_columns;
    et._button_enable(et._el_button_add_column, !et._disable_add_column);
  }

  /**
   * Toggle save button depending on auto_save and updates number
   */
  updateButtonSave() {
    const et = this;
    const hasAutoSave = et._auto_save;
    const hasNoUpdates = et._updates.length === 0;
    const disable = hasNoUpdates || hasAutoSave;
    et._button_enable(et._el_button_save, !disable);
  }

  /**
   * Update _auto_save state, based on checkbox, trigger lock to others
   */
  updateAutoSave() {
    const et = this;
    et._auto_save = et._el_checkbox_autosave.querySelector("input").checked;
    et.updateButtonSave();
    if (et._auto_save) {
      et.save();
    }
    et.lockTableConcurrent(!et._auto_save);
  }

  /**
   * Send lock event to other concurent user
   * @param {Boolean} lock Enable/disable lock for other. If empty, use _auto_save state
   */
  lockTableConcurrent(lock) {
    const et = this;
    et._lock_table_concurrent = isNotEmpty(lock) ? lock : !et._auto_save;
    const update = {
      type: "lock_table",
      lock: et._lock_table_concurrent,
    };
    et.emitUpdatesState([update]);
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
   * Column name validation : column not editable
   * @param {String} name
   * @return {Boolean}
   */
  isReadOnly(name) {
    const et = this;
    return et.isColumnReserved(name) || !isSafeName(name);
  }

  /**
   * Column name validation : check is name is valaid
   * @param {String} name
   * @return {Boolean}
   */
  isValidName(name) {
    const et = this;
    const isSafe = isSafeName(name);
    const isNotReserved = !et.isColumnReserved(name);
    return isSafe && isNotReserved;
  }

  /**
   * Display a dialog with illegal columns
   */
  async columnNameIssueDialog() {
    const et = this;
    const columnsIssues = [];

    for (const column of et._columns_labels) {
      if (!isSafeName(column)) {
        columnsIssues.push(column);
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
  }
  /**
   * Progress from server
   */
  onProgress(message) {
    const et = this;
    const percent = Math.ceil(message.percent * 100);
    et.setProgress(percent);
  }

  /**
   * Initial table render
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

    /**
     * Convert col format
     */
    const columns = table.types || [];
    const nColumns = columns.length;
    let cPos = 0;
    for (const column of columns) {
      const readOnly = et.isReadOnly(column.id);
      /**
       * Invalid name = not editable. See :
       * https://github.com/handsontable/handsontable/issues/5439
       */
      const isInvalid = !isSafeName(column.id);
      column.type = typeConvert(column.value, "json", "input");
      column.data = column.id;
      column.readOnly = readOnly;
      column._pos = isInvalid ? nColumns + 1 : readOnly ? -1 : cPos++;
      delete column.value;
      delete column.id;
    }
    et._columns = columns.sort((a, b) => a._pos - b._pos);
    et._columns_labels = et._columns.map((c) => c.data);
    /**
     * New handsontable
     */
    et._ht = new handsontable(et._el_table, {
      columns: et._columns,
      data: table.data,
      rowHeaders: true,
      columnSorting: true,
      colHeaders: et._columns_labels,
      allowInvalid: true,
      allowInsertRow: false,
      renderAllRows: false,
      maxRows: table.data.length,
      //mminows: table.data.length,
      //colWidths: 80,
      //manualColumnResize: true,
      licenseKey: et._config.ht_license,
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
      afterGetColHeader: (pos, element) => {
        const DEV_TO_BE_VALIDATED = false;
        if (DEV_TO_BE_VALIDATED) {
          if (pos >= 0) {
            const type = et.getColumnTypeById(pos);
            element.classList.add(`edit-table--header`);
            element.classList.add(`edit-table--header-${type}`);
            element.title = type;
          }
        }
      },
      afterChange: et.afterChange,
      afterLoadData: et.afterLoadData,
      height: function () {
        const r = et._el_table.getBoundingClientRect();
        return r.height - 30;
      },
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
      et.updateAutoSave();
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
   * Long process on server
   */
  omProgress(message) {
    const et = this;

    if (message.id_table !== et._id_table) {
      return;
    }

    if (message.percent) {
      et.setProgress(message.percent);
    }

    switch (message.type) {
      case "validate":
        if (message?.data?.mx_valid) {
          // update table
        }
        break;
      default:
        null;
    }
  }

  /**
   * Handle dispatched message from others
   */
  onDispatch(message) {
    const et = this;

    if (message.id_table !== et._id_table) {
      return;
    }
    if (isNotEmpty(message.updates)) {
      et.perf("dispatch_update");
      const cells = [];

      et._ht.batch(() => {
        for (const update of message.updates) {
          switch (update.type) {
            case "lock_table":
              et.handlerUpdateLock(update, message);
              break;
            case "update_cell":
              et.handlerUpdateCellsBatchAdd(update, cells);
              break;
            case "add_column":
              et.handlerUpdateColumnAdd(update, et._config.id_source_dispatch);
              break;
            case "remove_column":
              et.handlerUpdateColumnRemove(
                update,
                et._config.id_source_dispatch
              );
              break;
            default:
              console.warn("unhandled update:", message);
          }
        }
        if (isNotEmpty(cells)) {
          et.handlerCellsBatchProcess(cells);
        }
      });
      et.perfEnd("dispatch_update");
    }
  }

  /**
   * Handler update in batch : array of array
   */
  handlerCellsBatchProcess(cells, idSource) {
    const et = this;
    try {
      et._ht.setDataAtRowProp(
        cells,
        null,
        null,
        idSource || et._config.id_source_dispatch
      );
    } catch (e) {
      console.warn("handlerCellsBatchProcess", e);
    }
  }

  /**
   * Add an update to batch cells array
   * @param {Object} update Update
   * @param {Array} cells Batch cells, used by handlerCellsBatchProcess
   */
  handlerUpdateCellsBatchAdd(update, cells) {
    // [[row, prop, value], ...].
    const et = this;
    const gid = update[et._config.id_column_main];
    const gidRow = et._ht.getDataAtProp(et._config.id_column_main);
    const idRow = gidRow.indexOf(gid);
    cells.push([idRow, update.column_name, update.value_new]);
  }

  /**
   * Update cell with a single value
   * @param {Object} update Update
   * @param {String} source Id of the source. e.g. id_source_dispatch
   */
  updateCellValue(update, source) {
    const et = this;
    const gid = update[et._config.id_column_main];
    const gidRow = et._ht.getDataAtProp(et._config.id_column_main);
    const idRow = gidRow.indexOf(gid);
    et._ht.setDataAtRowProp(
      idRow,
      update.column_name,
      update.value_new,
      source
    );
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
  handlerUpdateColumnRemove(update, source) {
    const et = this;

    let n = et._columns.length;
    let colRemoved = {}; // keep track for cleaning redo / updates
    while (n--) {
      const col = et._columns[n];
      if (col.data === update.column_name) {
        colRemoved.column = et._columns.splice(n, 1);
        colRemoved.pos = n;
      }
    }

    if (isEmpty(colRemoved)) {
      console.warn(`Column ${update.column_name} not removed`);
      return;
    }

    et._ht.updateSettings({
      columns: et._columns,
      colHeaders: et._columns.map((c) => c.data),
    });

    /**
     * Remove update item that ref the removed column
     */
    et.clearUpdateRefColName(update.column_name);

    /**
     * Same for undo/redo
     */
    et.clearUndoRedoRefCol(colRemoved.pos);

    /**
     * Update buttons state
     */
    et.updateButtons();

    /**
     * Render table
     */
    et._ht.render();
    et.validateTable();

    if (source === et._config.id_source_dispatch) {
      return;
    }

    et.emitUpdatesDb([update]);
    return true;
  }

  /*
   * Interactive column remove
   */
  async dialogRemoveColumn() {
    const et = this;
    const names = et._columns.reduce((a, c) => {
      const isValid = et.isValidName(c.data);
      if (isValid) {
        a.push(c.data);
      }
      return a;
    }, []);

    const optionColumnNames = names.map((t) => el("option", { value: t }, t));

    const columnToRemove = await modalPrompt({
      title: tt("edit_table_modal_remove_column_title"),
      label: tt("edit_table_modal_remove_column_label"),
      confirm: tt("edit_table_modal_remove_column_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        value: getTypes("postgres")[0],
        placeholder: "Column type",
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

    et.handlerUpdateColumnRemove(update);
  }

  /**
   * Handle column addition from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  handlerUpdateColumnAdd(update, source) {
    const et = this;
    const isValid = et.isValidName(update.column_name);

    if (!isValid) {
      console.warn(`Invalid column name : ${update.column_name}`);
      return;
    }

    const column = {
      data: update.column_name,
      type: typeConvert(update.column_type, "postgres", "input"),
    };

    /**
     * Update column list and emit updates directly
     */
    et._columns.push(column);
    const headers = et._columns.map((c) => c.data);
    et._ht.updateSettings({
      columns: et._columns,
      colHeaders: headers,
    });

    et.updateButtonsAddRemoveColumn();
    /**
     * Render table
     */
    et._ht.render();
    et.validateTable();

    if (source === et._config.id_source_dispatch) {
      return;
    }
    et.emitUpdatesDb([update]);
    return true;
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
    const typeOptions = getTypes("postgres").map((t) =>
      el("option", { value: t }, t)
    );

    const columnType = await modalPrompt({
      title: tt("edit_table_modal_add_column_type_title"),
      label: tt("edit_table_modal_add_column_type_label"),
      confirm: tt("edit_table_modal_add_column_type_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        value: getTypes("postgres")[0],
        placeholder: "Column type",
      },
      inputChildren: typeOptions,
    });

    if (columnType === false) {
      return;
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

    return et.handlerUpdateColumnAdd(update);
  }

  /**
   * Get column javascript type
   * @param {String} column name
   * @return {String} type
   */
  getColumnType(columnName) {
    const et = this;
    const type = et._columns.find((c) => c.data === columnName)?.type || "text";
    return typeConvert(type, "input", "javascript");
  }

  /**
   * Get column javascript type using column position
   * @param {Integer} column id / position
   * @return {String} type
   */

  getColumnTypeById(columnId) {
    const et = this;
    const type = et._columns[columnId]?.type || "text";
    return typeConvert(type, "input", "javascript");
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
   * Validate change
   * @param {Array} change Handsontable change
   * @return {Boolean} valid change
   */
  validateChange(change) {
    /* change: [row, prop, oldValue, newValue] */
    const et = this;

    const column = change[1];
    const value = change[3];

    if (isEmpty(value)) {
      change[3] = null;
      return true;
    }

    return et._validate_col_val(column, value);
  }

  /**
   * Validate old value of an handsontable change
   * @param {Array} Handsontable change
   * @return {Boolean} valid old value
   */
  validateOldValue(change) {
    /* change: [row, prop, oldValue, newValue] */
    const et = this;

    const column = change[1];
    const value = change[2];

    if (isEmpty(value)) {
      change[2] = null;
      return true;
    }

    return et._validate_col_val(column, value);
  }

  /**
   * Internal method for validate value, given column
   * @return {Boolean} valid
   */
  _validate_col_val(column, value) {
    const et = this;

    const exists = et.columnExists(column);

    if (!exists) {
      return false;
    }

    const type = et.getColumnType(column);

    if (type === "boolean") {
      return ["false", "true", "FALSE", "TRUE", true, false].includes(value);
    }

    return typeof value === type;
  }

  /**
   * Validate table ( manually )
   * TODO: this method should be removed: workaround handsontable issue
   * - handsontable remove validate formating after updateSettings.
   * we re-validate here as a warkaund
   * - validateCells return an error. Try itterate on cols
   * - still an error : added setTimeout(()): "solved"
   */
  validateTable() {
    const et = this;
    const cols = et.getColumns();
    setTimeout(() => {
      for (let i = 0; i < cols.length; i++) {
        try {
          et._ht.validateColumns([i]);
        } catch (e) {
          const col = cols[i];
          console.warn("Issue with col validation", col, e);
        }
      }
    }, 10);
  }
  /**
   * Display dialog when change is not valid
   * @param {Array} change
   * @return {Promise<String>} action continue / undo
   */
  async confirmValidation(change) {
    const et = this;
    const type = et.getColumnType(change[1]);
    const exists = et.columnExists(change[1]);

    if (!exists) {
      console.warn(`Column set for validation do not exist: ${change[1]}`);
      return "continue";
    }

    const nextValue = await modalConfirm({
      title: tt("edit_table_modal_value_invalid_title"),
      content: getDictTemplate("edit_table_modal_value_invalid", {
        type: type,
      }),
      cancel: tt("btn_edit_undo_last"),
      confirm: tt("edit_table_modal_value_invalid_continue"),
    });
    if (nextValue) {
      return "continue";
    } else {
      return "undo";
    }
  }

  /**
   * Display a dialog when large change is received
   * @param {Array} changes Array of changes
   * @return {Promise<Boolean>} continue
   */
  async confirmLargeUpdate(changes) {
    const nChanges = changes.length;
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

    return proceedLargeChanges;
  }

  /**
   * Display a dialog when the the changes are too large
   * @param {Array} changes Array of changes
   * @return {Promise<Boolean>} continue
   */
  async confirmChangesToBig(changes) {
    const et = this;
    if (et._config.test_mode) {
      return true;
    }
    const nChanges = changes.length;
    await modalDialog({
      title: tt("edit_table_modal_changes_too_big_title"),
      content: getDictTemplate("edit_table_modal_changes_too_big_content", {
        count: nChanges,
        max_changes: et._config.max_changes,
      }),
      confirm: tt("btn_edit_table_modal_changes_too_big_ok"),
      cancel: null,
    });
  }

  /*
   * Handle logic for after cell update
   * @param {Array} changes Array of changes
   * @param {String} source Change source : dispatch/undo/edit ...
   */
  async afterChange(changes, source) {
    const et = this;

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
    if (source === et._config.id_source_dispatch) {
      return;
    }

    /**
     * Check length : warning, stop, batch or not
     */
    const changesWarning = changes.length >= et._config.max_changes_warning;
    const changesTooBig = changes.length >= et._config.max_changes;

    if (changesTooBig) {
      /**
       * Too much changes detected : alert
       */
      et._ignore_next_changes = true;
      et.undo();
      await et.confirmChangesToBig(changes);
      return;
    }

    if (changesWarning) {
      /**
       * Lots of changes detected : confirm
       */
      et.lockTableConcurrent(true);
      et.lock();
      const confirmLargeUpdate = await et.confirmLargeUpdate(changes);
      et.unlock();
      et.lockTableConcurrent(!et._auto_save);

      if (!confirmLargeUpdate) {
        et._ignore_next_changes = true;
        et.undo();
        return;
      }
    }

    et.perf("afterChange");

    for (const change of changes) {
      /* change: [row, prop, oldValue, newValue] */

      if (change[2] === change[3]) {
        /* no change */
        continue;
      }

      const isNotValid = !et.validateChange(change);

      if (isNotValid) {
        const confirmValidation = await et.confirmValidation(change);

        if (confirmValidation === "undo") {
          et._ignore_next_changes = true;
          et.undo();
          return;
        } else {
          continue;
        }
      }

      const isValidOld = et.validateOldValue(change);

      if (isValidOld) {
        /**
         * Push, update or delete
         */
        et.pushUpdateOrDelete(change);
      }
    }

    /**
     * Save
     */
    if (et._auto_save) {
      et.save();
    }

    et.updateButtons();

    et.perfEnd("afterChange");
  }

  /**
   * Save and dispatch changes
   */
  save() {
    const et = this;
    et.perf("save");
    const updates = et._updates;
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
    et.emitUpdatesDb(updates);
    et.flushUpdates();
    et.updateButtons();
    et.perfEnd("save");
  }

  /**
   * Remove pending updates
   */
  flushUpdates() {
    const et = this;
    //et._updates.length = 0;
    et._updates = [];
  }

  /**
   * Push update, or delete if equal original state
   * @param {Object} change
   */
  pushUpdateOrDelete(change) {
    const et = this;
    const idRow = et._ht.toPhysicalRow(change[0]);
    const row = et._ht.getSourceDataAtRow(idRow);
    const gid = row[et._config.id_column_main];
    const update = {
      id_table: et._id_table,
      type: "update_cell",
      column_name: change[1],
      value_orig: change[2] || null,
      value_new: change[3] || null,
      gid: gid,
    };
    /**
     * Update, delete or push
     * Avoid duplication of update in the _udpates queue :
     * - If a previous value is the original value : delete the upadate
     * - If a previous value existe : update it
     * - No previous update, push the update
     */
    let pushUpdate = true;
    let updatePrevious;
    let deletePrevious;
    let deletePos;
    let noChange;
    let pos = 0;
    for (const previousUpdate of et._updates) {
      if (!pushUpdate || deletePrevious) {
        continue;
      }
      updatePrevious =
        previousUpdate.type === update.type &&
        previousUpdate.gid === update.gid &&
        previousUpdate.column_name === update.column_name &&
        previousUpdate.id_table === update.id_table;
      if (updatePrevious) {
        noChange = update.value_new === previousUpdate.value_orig;
        console.log(noChange);
        if (noChange) {
          deletePrevious = true;
          deletePos = pos;
          pushUpdate = false;
        } else {
          previousUpdate.value_new = update.value_new;
          pushUpdate = false;
        }
      }
      pos++;
    }

    if (deletePrevious) {
      et._updates.splice(deletePos, 1);
    }
    if (pushUpdate) {
      et._updates.push(update);
    }
  }

  /**
   * Disable the tool
   */
  disable() {
    const et = this;
    const hot = et._ht;
    et._disabled = true;
    et._el_overlay.classList.add("disabled");
    hot.updateSettings({
      readOnly: true,
      contextMenu: false,
      disableVisualSelection: true,
      manualColumnResize: false,
      manualRowResize: false,
      comments: false,
    });
    et.updateButtons();
  }

  /**
   * Enable the tool
   */
  enable() {
    const et = this;
    const hot = et._ht;
    et._disabled = false;
    et._el_overlay.classList.remove("disabled");
    hot.updateSettings({
      readOnly: false,
      contextMenu: true,
      disableVisualSelection: false,
      manualColumnResize: true,
      manualRowResize: true,
      comments: true,
    });
    et.updateButtons();
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
  onReconnect() {
    const et = this;
    et._disconnected = false;
    et._el_overlay.classList.remove("disconnected");
    et.enable();
    et.start({
      send_table: false,
    });
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
  lockTableConcurrent(lock) {
    const et = this;
    et._lock_table_concurrent = isNotEmpty(lock) ? lock : !et._auto_save;
    const update = {
      type: "lock_table",
      lock: et._lock_table_concurrent,
    };
    et.emitUpdatesState([update]);
  }

  /**
   * ws emit wrapper : format message and emit
   * @param {String} type Emit type
   * @param {Object} message Message to emit, if not locked
   */
  emit(type, message) {
    const et = this;
    const messageEmit = et.message_formater(message);

    if (et.locked) {
      return;
    }
    et._socket.emit(type, messageEmit);
  }

  /**
   * ws emit wrapper :  emit updates
   * @param {Array} update Array of updates
   * @param {Object} opt Options pased to emit message
   */
  emitUpdates(updates, opt) {
    const et = this;
    const r = et._config.routes;
    if (et.locked) {
      return;
    }
    if (et._config.test_mode) {
      console.warn("Test mode. Updates not emited:", updates);
      return;
    }
    et.emit(r.client_edit_updates, { updates, ...opt });
  }

  /**
   * emit update + write to db (if authentication match server side)
   * @param {Array} updates
   */
  emitUpdatesDb(updates) {
    const et = this;
    et.emitUpdates(updates, { write_db: true });
  }

  /**
   * emit state update (e.g. lock state change )
   * @param {Array} updates
   */
  emitUpdatesState(updates) {
    const et = this;
    et.emitUpdates(updates, { update_state: true });
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
    const res = await modalPrompt({
      title: getDictItem("edit_table_modal_select_title"),
      label: getDictItem("edit_table_modal_select_label"),
      onInput: (value, elBtnConfirm) => {
        if (isSourceId(value)) {
          elBtnConfirm.classList.remove("disabled");
        } else {
          elBtnConfirm.classList.add("disabled");
        }
      },
      selectAutoOptions: {
        type: "sources_list_edit",
        config: {
          loaderData: {
            types: ["tabular", "vector"],
          },
        },
      },
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
    const opt = { use_cache: false, autoCorrect: false };
    et.emit(r.client_geom_validate, opt);
  }

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
    et.emit(r.client_geom_validate, opt);
  }

  async onGeomValidateResult(data) {
    const et = this;
    try {
      const validValues = data?.stat?.values;
      const gidRow = et._ht.getDataAtProp(et._config.id_column_main);
      /**
       * Format cell as [2307, '_mx_valid', true]
       */
      const cells = validValues.map((v) => {
        const idRow = gidRow.indexOf(v.gid);
        return [
          idRow,
          et._config.id_column_valid,
          v[et._config.id_column_valid],
        ];
      });
      et.handlerCellsBatchProcess(cells);
    } catch (e) {
      console.error(e);
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
    let nU = et._updates.length;
    while (nU--) {
      const sUpdate = et._updates[nU];
      if (sUpdate.column_name === name) {
        et._updates.splice(nU, 1);
      }
    }
  }
  /**
   * Remove ref to column name from unduRedo
   * e.g. after column remove
   * @param {Number} pos Column last position
   */
  clearUndoRedoRefCol(pos) {
    const et = this;
    const ur = et._ht.getPlugin("UndoRedo");
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
}
