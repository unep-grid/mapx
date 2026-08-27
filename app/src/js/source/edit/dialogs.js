import { settings } from "../../settings";
import { modalPrompt, modalConfirm, modalDialog } from "./../../mx_helper_modal.js";
import { pickEditableTableSource } from "./source_picker.js";
import { el, elButtonFa, tt } from "../../el_mapx";
import { getDictTemplate, getDictItem } from "./../../language";
import { prefGet, prefSet } from "../../user_pref";
import { makeId } from "../../mx_helper_misc.js";
import { draw } from "../../mx.js";
import { viewLink, getView, viewsReplace } from "../../map_helpers/index.js";
import { getSourceVtSummaryUI } from "../../mx_helper_source_summary";
import { isPgType, getPgTypes } from "./../../handsontable/utils.js";
import { isNotEmpty, isEmpty, isSafeName, makeSafeName, isEqual } from "./../../is_test/index.js";
import { modalIframe } from "../../modal_iframe";
import { editFeatureGeometry } from "./geometry_flow.js";
import { previewTableFeatureGeometry } from "./geometry_preview_flow.js";

/**
 * User dialogs : column/row operations, confirmations, geometry tools.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const dialogsMixin = {
  /**
   * Ask if changed should be discarded
   */
  async dialogUnsavedChangesDiscard() {
    const et = this;
    const skip = et._config.test_mode;
    const nPending = et.countUpdateValid();
    if (nPending === 0 || skip) {
      return true;
    }

    const discard = await modalConfirm({
      title: tt("edit_table_modal_quit_ignore_changes_title"),
      content: tt("edit_table_modal_quit_ignore_changes", {
        data: {
          count: nPending,
        },
      }),
      confirm: tt("btn_confirm"),
      cancel: tt("btn_cancel"),
    });
    return !!discard;
  },

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
  },

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
          },
        ),
      });
    }
  },

  async dialogRemoveRows() {
    const et = this;
    const ids = et.getSelectedRowsIndex();
    const source = et._config.id_source_dialog;

    if (isEmpty(ids)) {
      await modalDialog({
        title: tt("edit_table_modal_remove_rows_no_selection_title"),
        content: tt("edit_table_modal_remove_rows_no_selection_content"),
      });
      return;
    }

    const confirmRemove = await modalConfirm({
      title: tt("edit_table_modal_remove_rows_confirm_title"),
      content: tt("edit_table_modal_remove_rows_confirm_text", {
        data: {
          count: ids.length,
        },
      }),
      confirm: tt("btn_edit_table_modal_remove_rows_confirm"),
      cancel: tt("btn_cancel"),
    });

    if (!confirmRemove) {
      return;
    }

    const update = {
      type: "remove_rows",
      id_table: et._id_table,
      id_rows: ids,
    };
    await et.handlerUpdateRowsRemove(update, source);
  },

  async dialogAddRow() {
    const et = this;
    if (et.locked || et._geom_mode) {
      return;
    }

    const ok = await modalConfirm({
      title: et._has_geom ? "New feature" : "New row",
      content: et._has_geom
        ? "Create an empty feature row. Attribute values and geometry can be edited afterward."
        : "Create an empty row. Attribute values can be edited afterward.",
      cancel: tt("btn_cancel"),
      confirm: et._has_geom ? "Create feature" : "Create row",
    });

    if (!ok) {
      return false;
    }

    const clientId = makeId();
    return et.emitUpdatesDb([
      {
        type: "add_row",
        id_table: et._id_table,
        geom: null,
        _client_id: clientId,
      },
    ]);
  },

  async dialogColumnOrder() {
    const { default: Muuri } = await import("muuri");
    const et = this;
    const source = et._config.id_source_dialog;
    const columns = et.getColumns().filter((c) => !et.isColumnOrderFixed(c.data));
    const orderBefore = columns.map((c) => c.data);
    let grid;

    const elCols = el(
      "div",
      {
        class: "edit-table--murri-grid",
      },
      columns.map((c) => {
        return el(
          "div",
          { class: "edit-table--muuri-item", value: c.data },
          el(
            "div",
            { class: "edit-table--muuri-item-content" },
            el("span", c.data),
          ),
        );
      }),
    );

    const ro = new ResizeObserver(() => {
      if (!(grid instanceof Muuri)) {
        return;
      }
      clearTimeout(grid._id_ro);
      grid._id_ro = setTimeout(() => {
        grid.refreshItems().layout();
      }, 200);
    });

    ro.observe(elCols);

    const orderAfter = await modalConfirm({
      title: tt("edit_table_modal_order_columns_title"),
      content: elCols,
      cbInit: () => {
        grid = new Muuri(elCols, {
          containerClass: "edit-table--murri-grid",
          itemClass: "edit-table--murri-item",
          dragEnabled: true,
        });
      },
      cbData: () => {
        const order = grid
          .getItems()
          .map((item) => item._element.getAttribute("value"));
        return order;
      },
    });

    ro.disconnect();

    if (!orderAfter) {
      return;
    }

    const update = {
      type: "order_columns",
      id_table: et._id_table,
      columns_order: orderAfter,
    };

    if (isEqual(orderBefore, orderAfter)) {
      return;
    }

    et.handlerUpdateColumnsOrder(update, source);
  },

  /**
   * Show basic attribute stat
   */
  async dialogStat() {
    const et = this;
    const names = et.getColumnLabels();
    //const checks = ["is_not_reserved", "is_safe"];
    const checks = ["is_not_reserved"];
    const options = await et.getColumnsNamesOptions(checks);

    const column = await modalPrompt({
      title: tt("edit_table_modal_stat_column_title"),
      label: tt("edit_table_modal_stat_column_label"),
      confirm: tt("btn_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        placeholder: "Attribute name",
        value: names[0],
      },
      onInput: async (name, elBtnConfirm) => {
        const ok = await et.isValidName(name, checks);
        et._button_enable(elBtnConfirm, ok);
      },
      inputChildren: options,
    });

    await getSourceVtSummaryUI({ idSource: et._id_table, idAttr: column });
  },

  /*
   * Interactive column remove
   */
  async dialogRemoveColumn() {
    const et = this;
    const names = et.getColumnLabels();
    const checks = ["is_not_reserved", "is_safe", "is_not_used"];
    const options = await et.getColumnsNamesOptions(checks);
    const source = et._config.id_source_dialog;

    const columnToRemove = await modalPrompt({
      title: tt("edit_table_modal_remove_column_title"),
      label: tt("edit_table_modal_remove_column_label"),
      confirm: tt("btn_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        placeholder: "Column name",
        value: names[0],
      },
      onInput: async (name, elBtnConfirm) => {
        const ok = await et.isValidName(name, checks);
        et._button_enable(elBtnConfirm, ok);
      },
      inputChildren: options,
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

    await et.handlerUpdateColumnRemove(update, source);
  },

  async dialogDuplicateColumn() {
    const et = this;
    const checks = ["is_not_reserved"];
    const options = await et.getColumnsNamesOptions(checks);
    const names = et.getColumnLabels();
    const source = et._config.id_source_dialog;

    const columnToDuplicate = await modalPrompt({
      title: tt("edit_table_modal_duplicate_column_title"),
      label: tt("edit_table_modal_duplicate_column_label"),
      confirm: tt("btn_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        placeholder: "Column name",
        value: names[0],
      },
      onInput: async (name, elBtnConfirm) => {
        const ok = await et.isValidName(name, checks);
        et._button_enable(elBtnConfirm, ok);
      },
      inputChildren: options,
    });

    if (!columnToDuplicate) {
      return;
    }

    const columnNewName = await et.dialogNewColumn(columnToDuplicate);
    const { valid } = await et.validateNewName(columnNewName);

    if (!valid || !columnNewName) {
      return;
    }

    /**
     * Ask the user for confirmation
     */
    const confirmDuplicate = await modalConfirm({
      title: tt("edit_table_modal_duplicate_column_confirm_title"),
      content: getDictTemplate(
        "edit_table_modal_duplicate_column_confirm_text",
        {
          column_name: columnToDuplicate,
          column_name_new: columnNewName,
        },
      ),
      cancel: tt("btn_cancel"),
      confirm: tt("btn_edit_table_modal_duplicate_column_confirm"),
    });

    if (!confirmDuplicate) {
      return;
    }

    const update = {
      type: "duplicate_column",
      id_table: et._id_table,
      column_name_new: columnNewName,
      column_name: columnToDuplicate,
    };

    return et.handlerUpdateColumnDuplicate(update, source);
  },

  /*
   * Interactive column rename
   */
  async dialogRenameColumn() {
    const et = this;
    const names = et.getColumnLabels();
    const source = et._config.id_source_dialog;
    const checks = ["is_not_reserved"];
    const hasCode = await et.hasSourceViewsCode();

    if (hasCode) {
      const elTable = await et.getTableViewsCodeTable();
      const idModal = makeId();
      const elButtonDuplicate = elButtonFa("btn_edit_duplicate_column", {
        icon: "copy",
        action: async () => {
          const elModal = document.getElementById(idModal);
          if (elModal) {
            elModal.close();
          }
          await et.dialogDuplicateColumn();
        },
      });

      const elButtonHelpRename = elButtonFa("btn_help", {
        icon: "question-circle",
        action: () => et.dialogHelp("rename-column"),
      });

      return modalDialog({
        id: idModal,
        title: tt("edit_table_modal_has_code_title"),
        content: el("div", [el("p", tt("edit_table_modal_has_code")), elTable]),
        close: tt("edit_table_modal_has_code_close"),
        buttons: [elButtonDuplicate, elButtonHelpRename],
      });
    }

    const options = await et.getColumnsNamesOptions(checks);
    const columnToRename = await modalPrompt({
      title: tt("edit_table_modal_rename_column_title"),
      label: tt("edit_table_modal_rename_column_label"),
      confirm: tt("btn_next"),
      inputTag: "select",
      inputOptions: {
        type: "select",
        placeholder: "Column name",
        value: names[0],
      },
      onInput: async (name, elBtnConfirm) => {
        const ok = await et.isValidName(name, checks);
        et._button_enable(elBtnConfirm, ok);
      },
      inputChildren: options,
    });

    if (!columnToRename) {
      return;
    }

    /**
     * Ask the user for the new column name
     */
    const columnNewName = await et.dialogNewColumn(columnToRename);
    const { valid } = await et.validateNewName(columnNewName);

    if (!valid || !columnNewName) {
      return;
    }

    /**
     * Ask the user for confirmation
     */
    const confirmRename = await modalPrompt({
      title: tt("edit_table_modal_rename_column_confirm_title"),
      label: tt("edit_table_modal_rename_column_confirm_text", {
        data: {
          column_name: columnToRename,
          column_name_new: columnNewName,
        },
      }),
      confirm: tt("btn_edit_table_modal_rename_column_confirm"),
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

    if (!confirmRename) {
      return;
    }

    const update = {
      type: "rename_column",
      id_table: et._id_table,
      column_name: columnToRename,
      column_name_new: columnNewName,
    };

    await et.handlerUpdateColumnRename(update, source);
    et.resetColumnsUsedCache();
  },

  /**
   * Dialogs for a new column
   */
  async dialogNewColumn(name) {
    const et = this;

    if (isNotEmpty(name) && !isSafeName(name)) {
      name = `s${name}`;
    }

    if (isNotEmpty(name) && et.columnNameExists(name)) {
      name = `${name}_${makeId(5, true)}`;
    }

    const columnName = await modalPrompt({
      title: tt("edit_table_modal_add_column_name_title"),
      label: tt("edit_table_modal_add_column_name_label"),
      confirm: tt("btn_next"),
      inputOptions: {
        type: "text",
        value: name || `new_column_${makeId(5, true)}`,
        placeholder: "Column name",
      },
      onInput: async (name, elBtnConfirm, elMessage) => {
        const safeName = makeSafeName(name);

        const {
          valid,
          validUnique,
          validLength,
          validName,
          minLength,
          maxLength,
        } = await et.validateNewName(name);

        while (elMessage.firstElementChild) {
          elMessage.firstElementChild.remove();
        }

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
            "edit_table_modal_add_column_name_issue_invalid_characters",
          );
          elMessage.appendChild(elIssue);
        }

        if (!validUnique) {
          const elIssue = tt(
            "edit_table_modal_add_column_name_issue_non_available",
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
    return makeSafeName(columnName);
  },

  /*
   * Interactive identity column add
   */
  async dialogAddColumnIdentity() {
    const et = this;
    return et.dialogAddColumn(true);
  },

  /*
   * Interactive column add
   */
  async dialogAddColumn(identity = false) {
    const et = this;
    const source = et._config.id_source_dialog;

    /**
     * Ask the user for the new column name and validate
     */
    const columnName = await et.dialogNewColumn();
    const { valid } = await et.validateNewName(columnName);

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
    let columnType = "integer";

    if (!identity) {
      /**
       * Ask the user for a column type
       */
      const types = getPgTypes();
      const typeOptions = [];
      for (const type of types) {
        const elOption = el("option", { value: type }, type);
        typeOptions.push(elOption);
      }

      columnType = await modalPrompt({
        title: tt("edit_table_modal_add_column_type_title"),
        label: tt("edit_table_modal_add_column_type_label"),
        confirm: tt("btn_next"),
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
      is_identity: identity,
    };

    return et.handlerUpdateColumnAdd(update, source);
  },

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
  },

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
        },
      ),
      confirm: tt("btn_edit_table_modal_large_changes_number_continue"),
      cancel: tt("btn_edit_table_modal_large_changes_number_undo"),
    });
    await et.unlockAll();
    return proceedLargeChanges;
  },

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
  },

  /**
   * Display a dialog with the help from wiki
   */
  dialogHelp(id) {
    return modalIframe({
      title: getDictItem("edit_table_modal_help"),
      doc_id: "doc_attribute_table_edit",
      scroll_to: id,
    });
  },

  /**
   * Display a dialog with source selection
   */
  async dialogSelectTable() {
    const et = this;
    return pickEditableTableSource({
      root: et._config.root,
    });
  },

  async dialogEditGeometry(gid) {
    const et = this;
    if (
      !et._geometry_edit_enabled ||
      !et._has_geom ||
      et._geom_mode ||
      et.locked ||
      isEmpty(gid)
    ) {
      return;
    }
    if (et.unsaved) {
      await modalDialog({
        title: "Pending changes",
        content:
          "Save or discard pending attribute changes before editing geometry.",
      });
      return;
    }

    const locked = await et.acquireGeometryEditLock(gid);
    if (!locked) {
      await modalDialog({
        title: "Geometry edit locked",
        content: "Another user is already editing geometry for this source.",
      });
      return;
    }

    await et.setGeometryMode(true);
    try {
      await editFeatureGeometry({
        session: et,
        gid,
        geomType: et._geom_type,
        viewsApi: { getView, viewsReplace },
      });
    } catch (e) {
      console.error(e);
    } finally {
      await et.setGeometryMode(false);
      await et.releaseGeometryEditLock();
    }
  },

  async dialogZoomFeature(gid) {
    const et = this;
    if (!et._has_geom || isEmpty(gid)) {
      return;
    }
    await previewTableFeatureGeometry(et, draw, gid, { maxZoom: 12 });
  },

  async dialogGeomValidate() {
    const et = this;
    if (et.locked) {
      return;
    }
    const e = et._config.events;
    const ok = await modalConfirm({
      title: getDictItem("edit_table_modal_validate_title"),
      content: getDictItem("edit_table_modal_validate_desc"),
      cancel: getDictItem("btn_cancel"),
      confirm: getDictItem("btn_continue"),
    });

    if (!ok) {
      return;
    }
    const data = await et.emit(
      e.client_geom_validate,
      {
        use_cache: false,
        autoCorrect: false,
      },
      et._config.timeout_geom_valid,
    );
    const res = await et.onGeomValidateResult(data);
    return res;
  },

  /**
   * Dialog GEOM repair
   */
  async dialogGeomRepair() {
    const et = this;
    if (et.locked) {
      return;
    }

    const e = et._config.events;
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
    const data = await et.emit(
      e.client_geom_validate,
      opt,
      et._config.timeout_geom_valid,
    );
    const res = et.onGeomValidateResult(data);
    return res;
  },

  /**
   * Test if source is referenced in dashboard, custom code / style
   * -> In such case remove/rename should be disabled
   * @return {Promise<Boolean>}
   */
  async hasSourceViewsCode() {
    const et = this;
    return et.hasSourceViews(["dashboard", "custom_style", "custom_code"]);
  },

  /**
   * Test if source is referenced as layer, dashboard, cc and cs
   */
  async hasSourceViews(types) {
    const et = this;
    const s = await et.getTableViewsFilter(types);
    return s.length > 0;
  },

  /**
   * Get views table with dependencies +filter by type
   */
  async getTableViewsFilter(types) {
    const et = this;
    types = types || ["layer", "dashboard", "custom_style", "custom_code"];
    const table = await et.getTableViews();
    return table.filter((t) => types.includes(t.type));
  },

  async getTableViewsCode() {
    const et = this;
    const table = await et.getTableViewsFilter([
      "custom_code",
      "custom_style",
      "dashboard",
    ]);
    return table;
  },

  async getTableViewsCodeTable() {
    /**
     * views table
     */
    const et = this;
    const tableData = await et.getTableViewsCode();
    const currentProject = settings.project.id;

    const elTable = el("table", { class: ["table"] });
    const elThead = el("thead");
    const elTbody = el("tbody");

    const headers = ["Title", "Project", "Type"];
    const elTrHead = el(
      "tr",
      headers.map((header) => el("th", header)),
    );
    elThead.appendChild(elTrHead);
    elTable.appendChild(elThead);

    for (const row of tableData) {
      const view = getView(row.id);
      const addLink = row.project === currentProject && view?._edit;
      const elTitle = el("span", row.title);
      const elView = addLink
        ? el(
            "a",
            {
              href: viewLink(row.id, {
                useStatic: false,
                project: row.project,
              }),
              target: "_blank",
            },
            elTitle,
          )
        : elTitle;

      const elTr = el("tr", [
        el("td", elView),
        el("td", row.project_name),
        el("td", tt(`edit_table_view_with_${row.type}`)),
      ]);

      elTbody.appendChild(elTr);
    }

    elTable.appendChild(elTbody);
    return elTable;
  },
};
