import { el, tt } from "../../el_mapx";
import { moduleLoad } from "./../../modules_loader_async";
import { getDictTemplate, getDictItem } from "./../../language";
import { clone } from "../../mx_helper_misc.js";
import { getHandsonLanguageCode } from "./../../handsontable/utils.js";
import { isNotEmpty, isEmpty, isEqualNoType } from "./../../is_test/index.js";

/**
 * Handsontable specifics : instance creation, custom types,
 * undo/redo surgery, cell IO, rendering and layout.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const htAdapterMixin = {
  /**
   * Column formater
   * @param {Integer} pos column index
   * @param {Element} element Element header
   */
  formatColumns(pos, element) {
    const et = this;
    if (pos >= 0) {
      const column = et._columns[pos];
      if (column?._is_geom_action) {
        element.classList.add("edit-table--header");
        element.classList.add("edit-table--header-geom");
        element.replaceChildren(tt("btn_edit_geom_tool"));
        getDictItem("btn_edit_geom_tool").then((label) => {
          element.title = label;
        });
        return;
      }
      const type = et.getColumnTypeByIndex(pos, "css");
      const type_pg = et.getColumnTypeByIndex(pos, "postgres");
      element.classList.add(`edit-table--header`);
      element.classList.add(`edit-table--header-${type}`);
      element.title = type_pg;
    }
  },

  renderGeomActionCell(instance, td, row) {
    const et = this;
    const physicalRow = instance.toPhysicalRow(row);
    const rowData = instance.getSourceDataAtRow(physicalRow) || {};
    const gid = rowData[et.column_index];
    const status = rowData[et._config.id_column_geom_status] || "present";
    const isMissing = status === "null" || status === "empty";
    const buttons = [
      et.renderGeomToolButton({
        key: isMissing ? "btn_edit_geom_add" : "btn_edit_geom_edit",
        icon: isMissing ? "fa-plus" : "fa-pencil",
        className: isMissing ? "edit-table--geom-action-missing" : null,
        disabled: !et._geometry_edit_enabled,
        action: () => et.dialogEditGeometry(gid),
      }),
    ];

    if (!isMissing) {
      buttons.push(
        et.renderGeomToolButton({
          key: "btn_edit_geom_zoom",
          icon: "fa-binoculars",
          action: () => et.dialogZoomFeature(gid),
        }),
      );
    }

    const content = el("div", { class: "edit-table--geom-tools" }, buttons);

    td.className = "htCenter htMiddle edit-table--geom-cell";
    td.replaceChildren(content);
    return td;
  },

  renderGeomToolButton(opt) {
    const tooltipKey = opt.disabled ? "action_not_allowed_dev" : opt.key;
    const button = el(
      "button",
      {
        class: [
          "btn",
          "btn-default",
          "btn-xs",
          "edit-table--geom-action",
          opt.className,
        ].filter(isNotEmpty),
        type: "button",
        disabled: !!opt.disabled,
        dataset: {
          lang_key: tooltipKey,
          lang_type: "tooltip",
        },
        on: {
          click: (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) {
              return;
            }
            opt.action().catch(console.error);
          },
        },
      },
      el("i", { class: ["fa", opt.icon] }),
    );
    getDictItem(tooltipKey).then((label) => {
      button.title = label;
    });
    getDictItem(opt.key).then((label) => {
      button.setAttribute("aria-label", label);
    });
    return button;
  },

  /**
   * Set instance height based on table el;
   */
  updateHeight() {
    const et = this;
    const r = et._el_table.getBoundingClientRect();
    return r.height - 30;
  },

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
  },

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
     * Empty array at start
     */
    if (table.start) {
      et._init_data.length = 0;
    }

    /**
     * Push rows
     */
    et._init_data.push(...table.data);

    /**
     * If not end, wait for the next rows
     */
    if (!table.end) {
      return;
    }

    /**
     * Transfer rows
     */
    table.data.length = 0;
    table.data.push(...et._init_data);
    et._init_data.length = 0;

    /**
     * Build handsontable object
     */
    const geometryLock = table.geometryEditLock;
    const initGeometryLocked =
      geometryLock?.locked && geometryLock.id_session !== et._id_session;
    const initLocked =
      (table.locked && et.hasConcurrentMembers()) || initGeometryLocked;
    if (initGeometryLocked) {
      et._geometry_lock_by_session = geometryLock.id_session;
    }
    const handsontable = await moduleLoad("handsontable");
    et._handsontable = handsontable;

    if (et.hasHt()) {
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
      et._geom_type = table.geomType || "polygon";
      et._validation_geom = table.validation;
    }

    /**
     * Init columns
     */
    et._init_columns(table);

    /**
     * Set additional visual order for manual move
     */
    et._ht = new handsontable(et._el_table, {
      licenseKey: et._config.ht_license,
      columns: et.getColumns(),
      data: table.data,
      rowHeaders: true,
      persistentState: false,
      colHeaders: et.getColumnLabels(),
      columnSorting: true,
      allowInvalid: true,
      allowInsertRow: false,
      renderAllRows: false,
      maxRows: table.data.length,
      manualColumnResize: true,
      copyPaste: {
        rowsLimit: table.data.length,
      },
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
      afterLoadData: et.afterLoadData, //also reload/updateData
      height: et.updateHeight,
      disableVisualSelection: false,
      outsideClickDeselects: false,
      comment: false,
      colWidths: et._get_col_width(table),
    });

    /**
     * Add hooks
     */
    et._ht.addHook("afterUndo", () => {
      // BUG: isRedoAvailable is not ready after undo, add delay
      et.updateButtons(20);
    });
    et._ht.addHook("afterRedo", () => {
      // BUG isUndoAvailable is not ready after redo, add delay
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
  },

  hasHt() {
    const et = this;
    return et._handsontable && et._ht instanceof et._handsontable;
  },

  getSelectedRowsIndex() {
    const ht = this._ht;
    const selected = ht.getSelected();

    if (isEmpty(selected)) {
      return [];
    }

    const rowIdSet = new Set();
    const columnIndex = this.column_index;

    for (const [startRow, , endRow] of selected) {
      for (let row = startRow; row <= endRow; row++) {
        const rowData = ht.getSourceDataAtRow(row);
        if (isNotEmpty(rowData) && isNotEmpty(rowData[columnIndex])) {
          rowIdSet.add(rowData[columnIndex]);
        }
      }
    }

    return Array.from(rowIdSet);
  },

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
  },

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
  },

  /**
   * Wrapper for set data at cell
   * @param {Object} config Configuration
   * @param {Array} config.cells Array of cells [[id_row,id_col,value],]
   * @param {String} config.source Data source id
   */
  setCells(config) {
    const et = this;
    et._ht.setDataAtCell(config.cells, null, null, config.source);
  },

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
  },

  /**
   * Undo + update buttons
   */
  undo() {
    const et = this;
    et._ht.undo();
  },

  /**
   * Redo + update buttons
   */
  redo() {
    const et = this;
    et._ht.redo();
  },

  /**
   * Update data wrapper
   * @return {Promise<boolean>} done
   */
  async updateData(data, id) {
    const et = this;
    // avoid load / update data on a sorted table
    et.clearSort();

    // load data remove done action
    const oldDone = clone(et._ht.undoRedo.doneActions);
    const oldUndone = clone(et._ht.undoRedo.undoneActions);

    if (et._ht.updateData) {
      // not available in 6.2.2
      et._ht.updateData(data, id || "column_remove_handler");
    } else {
      et._ht.loadData(data);
    }
    await et.once("table_ready", null);
    et._ht.render();
    et._ht.deselectCell();
    et.updateTableColumns();
    /**
     * ht clear undo redo and add insert : we don't want that
     * - clear redo ( inserts... )
     * - re-add previous undo / redo
     * ⚠️  in case of collumn remove, clear
     *    redo / undo should be done before updateData
     */
    et._ht.undoRedo.clear();
    et._ht.undoRedo.doneActions.push(...oldDone);
    et._ht.undoRedo.undoneActions.push(...oldUndone);
    et.updateButtonsUndoRedo();
  },

  /**
   * Set readonly
   */
  setReadOnly(readOnly) {
    const et = this;
    const ro = !!readOnly;
    const hasTable = et.hasHt();
    if (hasTable) {
      et._ht.deselectCell();
      et._ht.updateSettings({
        readOnly: ro,
        disableVisualSelection: ro,
      });
    }
    et.updateButtons();
  },

  /**
   * Remove ref to change
   * -> change that are not real change should be removed
   */
  clearUndoRedoNoChange() {
    const et = this;
    const ur = et._ht.getPlugin("UndoRedo") || et._ht.undoRedo;
    const actions = ur.doneActions;
    const undoneActions = ur.undoneActions;
    et._clear_undo_redo_no_change(actions);
    et._clear_undo_redo_no_change(undoneActions);
  },

  /**
   * Remove ref to column name from unduRedo
   * e.g. after column remove
   * @param {String} name Column name
   */
  clearUndoRedoRefColName(name) {
    const et = this;
    const ur = et._ht.getPlugin("UndoRedo") || et._ht.undoRedo;
    const actions = ur.doneActions;
    const undoneActions = ur.undoneActions;
    et._clear_undo_ref_col(actions, name);
    et._clear_undo_ref_col(undoneActions, name);
  },

  /**
   * Helper for clearUndoRedoRefCol
   */
  _clear_undo_ref_col(actions, name) {
    let nA = actions.length;
    while (nA--) {
      const a = actions[nA];
      if (a.actionType === "change") {
        const changes = a.changes;
        for (const change of changes) {
          if (change[1] === name) {
            actions.splice(nA, 1);
          }
        }
      }
    }
  },

  /**
   * Helper for clearUndoNoChange
   */
  _clear_undo_redo_no_change(actions) {
    let nA = actions.length;
    while (nA--) {
      const a = actions[nA];
      if (a.actionType === "change") {
        const changes = a.changes;
        for (const change of changes) {
          if (isEqualNoType(change[2], change[3])) {
            actions.splice(nA, 1);
          }
        }
      }
    }
  },

  /**
   * Remove all insert
   * not used
   */
  _clear_undo_redo_insert() {
    const et = this;
    const ur = et._ht.getPlugin("UndoRedo") || et._ht.undoRedo;
    const actions = ur.doneActions;
    let nA = actions.length;
    while (nA--) {
      const action = actions[nA];
      if (action.actionType === "insert_row") {
        actions.splice(nA, 1);
      }
    }
  },

  /**
   * Clear sort ( important before any load )
   */
  clearSort() {
    const et = this;
    const cs = et._ht.getPlugin("ColumnSorting");
    cs.clearSort();
  },

  _get_col_width(table) {
    const { data } = table;
    const sampleSize = Math.min(100, data.length);
    const columns = this.getColumns();
    const colWidths = columns.map((c) => {
      if (c._is_geom_action) {
        return 72;
      }
      if (this.isColumnHidden(c.data)) {
        return 0.1;
      }
      let maxWidth = c.data.length * 10;
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        const value = row[c.data];
        if (isNotEmpty(value)) {
          const valueWidth = value.toString().length * 10;
          if (valueWidth > maxWidth) {
            maxWidth = valueWidth;
          }
        }
      }

      const padding = 30; // Base padding
      const calculatedWidth = maxWidth + padding;

      // Set reasonable bounds
      const minWidth = 80;
      const maxWidthAllowed = 400;

      return Math.max(minWidth, Math.min(maxWidthAllowed, calculatedWidth));
    });
    return colWidths;
  },

  /**
   * Cancel context menu
   */
  _cancel_context_menu(e) {
    /*
     * Disable context menu
     */
    e.stopImmediatePropagation();
  },

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
      mx_json: {
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
  },
};
