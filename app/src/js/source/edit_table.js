import "./edit_table.less";
import {
  modal,
  modalPrompt,
  modalConfirm,
  modalDialog,
} from "./../mx_helper_modal.js";
import { el, elButtonFa, elSpanTranslate, elCheckbox } from "../el_mapx";
import { moduleLoad } from "./../modules_loader_async";
import { bindAll } from "./../bind_class_methods";
import { getDictTemplate, getDictItem } from "./../language";
import { getArrayDistinct } from "./../array_stat";
import { prefGet, prefSet } from "./../user_pref";
import { modalMarkdown } from "./../modal_markdown/index.js";
import {
  typeConvert,
  getTypes,
  getHandsonLanguageCode,
} from "./../handsontable/utils.js";
import { makeId, parseTemplate } from "./../mx_helper_misc.js";
import {
  isSourceId,
  isNotEmpty,
  isEmpty,
  isString,
  isStringRange,
  isSafeName,
  makeSafeName,
} from "./../is_test/index.js";

const defaults = {
  log_perf: false,
  id_table: null,
  ht_license: "non-commercial-and-evaluation",
  id_column_main: "gid",
  id_columns_reserved: ["gid", "_mx_valid"],
  max_changes: 1e4,
  max_changes_warning: 1e3,
  min_columns: 3,
  max_rows: 1e5, // should match server
  max_columns: 200, // should match server
  routes: {
    server_joined: "/server/edit_table/joined",
    server_error: "/server/edit_table/error",
    server_new_member: "/server/edit_table/new_member",
    server_member_exit: "/server/edit_table/member_exit",
    server_full_table: "/server/edit_table/full_table",
    server_dispatch: "/server/edit_table/dispatch",
    client_edit_start: "/client/edit_table/start",
    client_edit_updates: "/client/edit_table/update",
    client_exit: "/client/edit_table/exit",
  },
  id_source_dispatch: "from_dispatch",
  id_source_edit: "edit",
};

export class EditTableSessionClient {
  constructor(socket, config) {
    const et = this;
    et._id = makeId();
    et._config = Object.assign({}, defaults, config);
    et._socket = socket;
    et._on_destroy = [];
    et._members = [];
    et._updates = [];
    et._locked;
    et._lock_table_concurrent = false;
    et._lock_table_by_user_id = null;
    bindAll(et);
    et._perf = {};
  }

  get id() {
    return this._id;
  }

  async init() {
    const et = this;
    window._et = et;
    const r = et._config.routes;
    if (et._initialized) {
      return;
    }
    et._initialized = true;
    et._id_table = et._config?.id_table;
    const valid = isSourceId(et._id_table);
    if (!valid) {
      throw new Error("Invalid table id");
    }
    /**
     * ⚠️ ALL INSTANCE WILL LISTEN TO ALL action
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
    et._socket.on(r.server_full_table, et.initTable);
    et._socket.on(r.server_dispatch, et.onDispatch);
    et._socket.on("disconnect", et.onDisconnect);
    await et.warning();
    et.start();
    await et.build();
  }

  async warning() {
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

  start(opt) {
    const et = this;
    const r = et._config.routes;
    const def = { send_table: true };
    opt = Object.assign({}, def, opt);
    et.emit(r.client_edit_start, opt);
  }

  destroy() {
    const et = this;
    const r = et._config.routes;
    if (et._destroyed) {
      return;
    }
    et._destroyed = true;
    et._lock_table_concurrent = false;
    et._lock_table_by_user_id = null;
    et.lockTableConcurrent(false);
    et.emit(r.client_exit);
    et._modal?.close();
    et._resize_observer?.disconnect();
    et._socket.off(r.server_joined, et.onJoined);
    et._socket.off(r.server_error, et.onServerError);
    et._socket.off(r.server_new_member, et.onNewMember);
    et._socket.off(r.server_member_exit, et.onMemberExit);
    et._socket.off(r.server_full_table, et.initTable);
    et._socket.off(r.server_dispatch, et.onDispatch);
    et._socket.off("disconnect", et.onDisconnect);
    for (const cb of et._on_destroy) {
      cb();
    }
  }

  async build() {
    const et = this;

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
    et._el_button_wiki = elButtonFa("btn_edit_wiki", {
      icon: "question-circle",
      action: et.showModalHelp,
    });
    et._el_button_add_column = elButtonFa("btn_edit_add_column", {
      icon: "plus-circle",
      action: et.addColumnPrompt,
    });
    et._el_button_remove_column = elButtonFa("btn_edit_remove_column", {
      icon: "minus-circle",
      action: et.removeColumnPrompt,
    });
    et._el_checkbox_autosave = elCheckbox("btn_edit_autosave", {
      action: et.updateAutoSave,
      checked: true,
    });

    et._el_users_stat = el("ul");
    et._el_users_stat_wrapper = el("small", [
      elSpanTranslate("edit_table_users_stat"),
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
      et._el_button_add_column,
      et._el_button_remove_column,
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
    et._el_content = el(
      "div",
      { class: ["mx_handsontable", "edit-table--container"] },
      et._el_overlay,
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
      addBackground: false,
      noBtnGroup: true,
      onClose: () => {
        et.destroy();
      },
    });
  }

  /**
   * Update helpers
   */
  updateButtons() {
    const et = this;
    et.updateButtonSave();
    et.updateUpdatesCounter();
    et.updateButtonsUndoRedo();
    et.updateButtonsAddRemoveColumn();
  }
  updateButtonsAddRemoveColumn() {
    const et = this;
    et.updateButtonRemoveColumn();
    et.updateButtonAddColumn();
  }

  updateMembersStat() {
    const et = this;
    const members = getArrayDistinct(et._members);
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

  updateUpdatesCounter() {
    const et = this;
    et._el_updates_counter.dataset.count = `${et._updates.length}`;
  }

  updateButtonsUndoRedo() {
    const et = this;
    const cld = "disabled-alt";
    const hasRedo = et._ht.isRedoAvailable();
    const hasUndo = et._ht.isUndoAvailable();
    if (hasRedo) {
      et._el_button_redo.classList.remove(cld);
    } else {
      et._el_button_redo.classList.add(cld);
    }
    if (hasUndo) {
      et._el_button_undo.classList.remove(cld);
    } else {
      et._el_button_undo.classList.add(cld);
    }
  }
  updateButtonRemoveColumn() {
    const et = this;
    const cld = "disabled-alt";
    et._disable_remove_column = et._columns.length <= et._config.min_columns;
    if (et._disable_remove_column) {
      et._el_button_remove_column.classList.add(cld);
    } else {
      et._el_button_remove_column.classList.remove(cld);
    }
  }
  updateButtonAddColumn() {
    const et = this;
    const cld = "disabled-alt";
    et._disable_add_column = et._columns.length > et._config.max_columns;
    if (et._disable_add_column) {
      et._el_button_add_column.classList.add(cld);
    } else {
      et._el_button_add_column.classList.remove(cld);
    }
  }
  updateButtonSave() {
    const et = this;
    const hasAutoSave = et._auto_save;
    const hasNoUpdates = et._updates.length === 0;
    const disable = hasNoUpdates || hasAutoSave;
    if (disable) {
      et._el_button_save.classList.add("disabled-alt");
    } else {
      et._el_button_save.classList.remove("disabled-alt");
    }
  }
  updateAutoSave() {
    const et = this;
    et._auto_save = et._el_checkbox_autosave.querySelector("input").checked;
    et.updateButtonSave();
    if (et._auto_save) {
      et.save();
    }
    et.lockTableConcurrent(!et._auto_save);
  }
  lockTableConcurrent(lock) {
    const et = this;
    et._lock_table_concurrent = isNotEmpty(lock) ? lock : !et._auto_save;
    const update = {
      type: "lock_table",
      lock: et._lock_table_concurrent,
    };
    et.emitUpdatesState([update]);
  }
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
  updateLayout() {
    const et = this;
    clearTimeout(et._update_to);
    et._update_to = setTimeout(() => {
      const elButtons = _et._el_button_close.parentElement;
      const elFooter = elButtons.parentElement;
      const rectButtons = elButtons.getBoundingClientRect();
      const rectFooter = elFooter.getBoundingClientRect();
      const rectWrapper = et._el_table_wrapper.getBoundingClientRect();
      if (rectButtons.width >= rectFooter.width) {
        elButtons.classList.add("mx-modal-foot-btns-collapsed");
      } else {
        elButtons.classList.remove("mx-modal-foot-btns-collapsed");
      }
      et._el_table.style.height = `${rectWrapper.height}px`;
      et._ht.render();
    }, 200);
  }

  isColumnBase(name) {
    const et = this;
    return et._config.id_columns_reserved.includes(name);
  }

  isReadOnly(name) {
    const et = this;
    return et.isColumnBase(name) || !isSafeName(name);
  }

  async columnNameIssueDialog() {
    const et = this;
    const columnsIssues = [];

    for (const column of et._columns_labels) {
      if (!isSafeName(column)) {
        columnsIssues.push(column);
      }
    }
    if (isNotEmpty(columnsIssues)) {
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
   * Initial table render
   */
  async initTable(table) {
    const et = this;

    if (isEmpty(table)) {
      return;
    }

    if (table.id_table !== et._id_table) {
      return;
    }

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
      maxRows: table.data.length,
      mminows: table.data.length,
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
      afterChange: et.afterChange,
      renderAllRows: false,
      height: function () {
        const r = et._el_table.getBoundingClientRect();
        return r.height - 30;
      },
      disableVisualSelection: false,
    });

    /**
     * Dialog for column name issue
     */
    await et.columnNameIssueDialog();

    /**
     * On modal resize, updateLayout
     */
    et._resize_observer = new ResizeObserver(() => {
      et.updateLayout();
    });
    et._resize_observer.observe(et._modal);

    if (table.locked) {
      et.lock();
    }

    /**
     * Initial state of undo/redo buttons.
     */
    et.updateAutoSave();
    et.updateButtons();
  }

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
        cancel: "End the session",
      });

      if (!continueSession) {
        et.destroy();
      }
    } catch (e) {
      console.warn(e);
    }
  }

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

  onNewMember(message) {
    const et = this;
    et.updateMembers(message.members);
  }

  onMemberExit(message) {
    const et = this;
    et.updateMembers(message.members);
  }

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

  handlerCellsBatchProcess(cells) {
    const et = this;
    try {
      et._ht.setDataAtRowProp(cells, null, null, et._config.id_source_dispatch);
    } catch (e) {
      console.warn("handlerCellsBatchProcess", e);
    }
  }

  handlerUpdateCellsBatchAdd(update, cells) {
    // [[row, prop, value], ...].
    const et = this;
    const gid = update[et._config.id_column_main];
    const gidRow = et._ht.getDataAtProp(et._config.id_column_main);
    const idRow = gidRow.indexOf(gid);
    cells.push([idRow, update.column_name, update.value_new]);
  }

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

  addDestroyCb(cb) {
    const et = this;
    et._on_destroy.push(cb);
  }

  undo() {
    const et = this;
    et._ht.undo();
    et.updateButtons();
  }

  redo() {
    const et = this;
    et._ht.redo();
    et.updateButtons();
  }

  handlerUpdateColumnRemove(update, source) {
    const et = this;

    let n = et._columns.length;
    let colRemoved;
    while (n--) {
      const col = et._columns[n];
      if (col.data === update.column_name) {
        colRemoved = et._columns.splice(n, 1);
      }
    }

    if (!colRemoved) {
      console.warn(`Column ${update.column_name} not removed`);
      return;
    }

    et._ht.updateSettings({
      columns: et._columns,
      colHeaders: et._columns.map((c) => c.data),
    });
    et.updateButtonsAddRemoveColumn();
    et._ht.render();

    if (source === et._config.id_source_dispatch) {
      return;
    }

    et.emitUpdatesDb([update]);
  }

  /*
   * Interactive column remove
   */
  async removeColumnPrompt() {
    const et = this;
    const idSkip = et._config.id_columns_reserved;
    const names = et._columns.reduce((a, c) => {
      if (!idSkip.includes(c.data)) {
        a.push(c.data);
      }
      return a;
    }, []);

    const optionColumnNames = names.map((t) => el("option", { value: t }, t));

    const columnToRemove = await modalPrompt({
      title: elSpanTranslate("edit_table_modal_remove_column_title"),
      label: elSpanTranslate("edit_table_modal_remove_column_label"),
      confirm: elSpanTranslate("edit_table_modal_remove_column_next"),
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
      title: elSpanTranslate("edit_table_modal_remove_column_confirm_title"),
      label: getDictTemplate("edit_table_modal_remove_column_confirm_text", {
        column_name: columnToRemove,
      }),
      confirm: elSpanTranslate("btn_edit_table_modal_remove_column_confirm"),
      inputTag: "input",
      inputOptions: {
        type: "checkbox",
        value: false,
        class: [], // "form-control" produce glitches
      },
      onInput: async (accept, elBtnConfirm) => {
        if (!accept) {
          elBtnConfirm.setAttribute("disabled", "true");
          elBtnConfirm.classList.add("disabled");
        } else {
          elBtnConfirm.removeAttribute("disabled");
          elBtnConfirm.classList.remove("disabled");
        }
      },
    });

    /*const confirmRemove = await modalConfirm({*/
    /*title: elSpanTranslate("edit_table_modal_remove_column_confirm_title"),*/
    /*content: getDictTemplate("edit_table_modal_remove_column_confirm_text", {*/
    /*column_name: columnToRemove,*/
    /*}),*/
    /*cancel: elSpanTranslate("btn_cancel"),*/
    /*confirm: elSpanTranslate("btn_edit_table_modal_remove_column_confirm"),*/
    /*});*/

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
   * Add column
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
    et._ht.updateSettings({
      columns: et._columns,
      colHeaders: et._columns.map((c) => c.data),
    });
    et.updateButtonsAddRemoveColumn();
    et._ht.render();

    if (source === et._config.id_source_dispatch) {
      return;
    }
    et.emitUpdatesDb([update]);
  }

  /*
   * Interactive column add
   */
  async addColumnPrompt() {
    const et = this;
    const names = et._columns.map((c) => c.data);
    let valid = false;

    /**
     * Ask the user for the new column name and validate
     */
    const columnName = await modalPrompt({
      title: elSpanTranslate("edit_table_modal_add_column_name_title"),
      label: elSpanTranslate("edit_table_modal_add_column_name_label"),
      confirm: elSpanTranslate("edit_table_modal_add_column_name_next"),
      inputOptions: {
        type: "text",
        value: `new_column_${makeId()}`,
        placeholder: "Column name",
      },
      onInput: async (name, elBtnConfirm, elMessage) => {
        const min_length = 3;
        const max_length = 50;
        const has_bad_chars = !et.isValidName(name);
        const columnNameSafe = makeSafeName(name);
        const validLength = isStringRange(
          columnNameSafe,
          min_length,
          max_length
        );
        const validUnique = !names.includes(columnNameSafe);
        valid = validUnique && validLength;
        const txtTemplateName = await getDictItem(
          "edit_table_modal_add_column_name_template"
        );
        const txtYes = await getDictItem("yes");
        const txtNo = await getDictItem("no");

        elMessage.innerHTML = parseTemplate(txtTemplateName, {
          min_length,
          max_length,
          column_name: columnNameSafe,
          has_bad_chars: has_bad_chars ? txtYes : txtNo,
          is_available: validUnique ? txtYes : txtNo,
          correct_length: validLength ? txtYes : txtNo,
        });

        if (valid) {
          elBtnConfirm.disabled = false;
          elBtnConfirm.classList.remove("disabled");
        } else {
          elBtnConfirm.disabled = true;
          elBtnConfirm.classList.add("disabled");
        }
      },
    });

    if (columnName === false || !valid) {
      return;
    }
    const columnNameSafe = makeSafeName(columnName);

    /**
     * Ask the user for a column type
     */
    const typeOptions = getTypes("postgres").map((t) =>
      el("option", { value: t }, t)
    );

    const columnType = await modalPrompt({
      title: elSpanTranslate("edit_table_modal_add_column_type_title"),
      label: elSpanTranslate("edit_table_modal_add_column_type_label"),
      confirm: elSpanTranslate("edit_table_modal_add_column_type_next"),
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
      title: elSpanTranslate("edit_table_modal_add_column_confirm_title"),
      content: getDictTemplate("edit_table_modal_add_column_confirm_text", {
        column_name: columnNameSafe,
        column_type: columnType,
      }),
      cancel: elSpanTranslate("btn_cancel"),
      confirm: elSpanTranslate("btn_edit_table_modal_add_column_confirm"),
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

    et.handlerUpdateColumnAdd(update);
  }

  getColumnType(columnName) {
    const et = this;
    const type = et._columns.find((c) => c.data === columnName)?.type || "text";
    return typeConvert(type, "input", "javascript");
  }

  validateChange(change) {
    /* change: [row, prop, oldValue, newValue] */
    const et = this;
    const type = et.getColumnType(change[1]);
    const value = change[3];

    if (isEmpty(value)) {
      change[3] = null;
      return true;
    }

    if (type === "boolean") {
      return ["false", "true", "FALSE", "TRUE", true, false].includes(value);
    }

    return typeof change[3] === type;
  }

  async confirmValidation(change) {
    const et = this;

    const type = et.getColumnType(change[1]);
    const nextValue = await modalConfirm({
      title: "Invalid value",
      content: `Invalid value received. Make sure to use the correct type : ${type} `,
      cancel: "Undo last change",
      confirm: "Continue",
    });
    if (nextValue) {
      return "continue";
    } else {
      return "undo";
    }
  }

  async confirmLargeUpdate(changes) {
    const nChanges = changes.length;
    const proceedLargeChanges = await modalConfirm({
      title: elSpanTranslate("edit_table_modal_large_changes_number_title"),
      content: getDictTemplate(
        "edit_table_modal_large_changes_number_content",
        {
          count: nChanges,
        }
      ),
      confirm: elSpanTranslate(
        "btn_edit_table_modal_large_changes_number_continue"
      ),
      cancel: elSpanTranslate("btn_edit_table_modal_large_changes_number_undo"),
    });

    return proceedLargeChanges;
  }

  async confirmChangesToBig(changes) {
    const et = this;
    const nChanges = changes.length;
    await modalDialog({
      title: elSpanTranslate("edit_table_modal_changes_too_big_title"),
      content: getDictTemplate("edit_table_modal_changes_too_big_content", {
        count: nChanges,
        max_changes: et._config.max_changes,
      }),
      confirm: elSpanTranslate("btn_edit_table_modal_changes_too_big_ok"),
      cancel: null,
    });
  }
  /*
   * Handle logic for after cell update
   */
  async afterChange(changes, source) {
    const et = this;
    if (isEmpty(changes)) {
      return;
    }

    /**
     * Check length : warning, stop, batch or not
     */
    const changesWarning = changes.length >= et._config.max_changes_warning;
    const changesTooBig = changes.length >= et._config.max_changes;

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
      const confirmLargeUpdate = await et.confirmLargeUpdate(changes);

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

        switch (confirmValidation) {
          case "undo":
            et.undo();
            et._ignore_next_changes = true;
            return;
          case "continue":
          default:
            continue;
        }
      }

      /**
       * Push, update or delete
       */
      et.pushUpdateOrDelete(change);
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

  flushUpdates() {
    const et = this;
    //et._updates.length = 0;
    et._updates = [];
  }

  pushUpdateOrDelete(change) {
    const et = this;
    const idRow = et._ht.toPhysicalRow(change[0]);
    const row = et._ht.getSourceDataAtRow(idRow);
    const gid = row[et._config.id_column_main];
    const update = {
      id_table: et._id_table,
      type: "update_cell",
      column_name: change[1],
      value_orig: change[2],
      value_new: change[3],
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

  disable() {
    const et = this;
    const hot = et._ht;
    et._el_overlay.classList.add("disabled");
    hot.updateSettings({
      readOnly: true,
      contextMenu: false,
      disableVisualSelection: true,
      manualColumnResize: false,
      manualRowResize: false,
      comments: false,
    });

    et._el_button_undo.classList.add("disabled");
    et._el_button_redo.classList.add("disabled");
    et._el_button_save.classList.add("disabled");
    et._el_button_add_column.classList.add("disabled");
    et._el_button_remove_column.classList.add("disabled");
  }

  enable() {
    const et = this;
    const hot = et._ht;
    et._el_overlay.classList.remove("disabled");
    hot.updateSettings({
      readOnly: false,
      contextMenu: true,
      disableVisualSelection: false,
      manualColumnResize: true,
      manualRowResize: true,
      comments: true,
    });
    et._el_button_undo.classList.remove("disabled");
    et._el_button_redo.classList.remove("disabled");
    et._el_button_save.classList.remove("disabled");
    et._el_button_add_column.classList.remove("disabled");
    et._el_button_remove_column.classList.remove("disabled");
  }

  onDisconnect() {
    const et = this;
    et.disable();
    et._disconnected = true;
    et._el_overlay.classList.add("disconnected");
    et._socket.io.once("reconnect", et.onReconnect);
  }

  onReconnect() {
    const et = this;
    et._disconnected = false;
    et._el_overlay.classList.remove("disconnected");
    et.enable();
    et.start({
      send_table: false,
    });
  }

  get locked() {
    const et = this;
    return !!et._locked;
  }

  lock() {
    const et = this;
    et.disable();
    et._locked = true;
    et._el_overlay.classList.add("locked");
  }

  unlock() {
    const et = this;
    et._disconnected = false;
    et._el_overlay.classList.remove("locked");
    et._locked = false;
    et.enable();
  }

  emit(type, message) {
    const et = this;
    const messageEmit = et.message_formater(message);
    if (et.locked) {
      return;
    }
    et._socket.emit(type, messageEmit);
  }

  emitUpdates(updates, opt) {
    const et = this;
    const r = et._config.routes;
    if (et.locked) {
      return;
    }
    et.emit(r.client_edit_updates, { updates, ...opt });
  }
  emitUpdatesDb(updates) {
    const et = this;
    et.emitUpdates(updates, { write_db: true });
  }
  emitUpdatesState(updates) {
    const et = this;
    et.emitUpdates(updates, { update_state: true });
  }

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

  isValidName(name) {
    const et = this;
    const isSafe = isSafeName(name);
    const isNotReserved = !et._config.id_columns_reserved.includes(name);
    return isSafe && isNotReserved;
  }

  perf(label) {
    if (!defaults.log_perf) {
      return;
    }
    const et = this;
    delete et._perf[label];
    et._perf[label] = performance.now();
  }

  perfEnd(label) {
    if (!defaults.log_perf) {
      return;
    }
    const et = this;
    const diff = performance.now() - et._perf[label];
    console.log(`Perf ${label}: ${diff} [ms]`);
  }

  showModalHelp() {
    return modalMarkdown({
      title: getDictItem("edit_table_modal_help"),
      wiki: "Attribute-table-edition",
    });
  }
}
