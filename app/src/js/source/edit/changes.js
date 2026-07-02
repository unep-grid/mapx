import { makeId } from "../../mx_helper_misc.js";
import { isNotEmpty, isEmpty, isEqualNoType } from "./../../is_test/index.js";

/**
 * Edit pipeline : change collection, sanitize, save, batch cells
 * and change source routing.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const changesMixin = {
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

        if (et.isColumnGeomAction(change[1])) {
          continue;
        }

        /* no change = continue
         */
        if (isEqualNoType(change[2], change[3])) {
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
  },

  /**
   * before validation
   */
  beforeChange(changes, source) {
    const et = this;

    const changesData = changes.filter(
      (change) => !et.isColumnGeomAction(change[1]),
    );

    const skip =
      et.isFromSanitize(source) ||
      et.isFromDispatch(source) ||
      et.isFromGeom(source) ||
      changesData.length === 0;

    if (skip) {
      return;
    }

    /*
     * Intercept: validate + sanitize;
     * handsontable 6.2.2 changes should be cloned before
     * sanitazing : the array "changes" is emptied by handsontable
     */
    et.sanitize([...changesData]);

    return false;
  },

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

        const sanitizedChunk = await et.emit(
          et._config.events.client_changes_sanitize,
          {
            updates: chunk,
          },
          et._config.timeout_sanizing,
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
        const id_col = et.getColumnIndex(update.column_name);

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
  },

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
    const id = `${et._id_table}_${gid}_${columnName}`;
    const previous = et._updates.get(id);
    const valOrig = change[2];
    const valNew = change[3];

    const update = {
      id_table: et._id_table,
      type: "update_cell",
      column_name: columnName,
      column_type: columnType,
      value_orig: previous ? previous.value_orig : isEmptyOrig ? null : valOrig,
      value_new: isEmptyNew ? null : valNew,
      valid: isValid,
      gid: gid,
      row_id: idRow,
    };

    if (previous) {
      const noChange = isEqualNoType(previous.value_orig, update.value_new);
      if (noChange) {
        et._updates.delete(id);
        return;
      }
    }
    et._updates.set(id, update);
  },

  /**
   * Update management
   */
  clearUpdates() {
    const et = this;
    et._updates.clear();
  },

  getUpdates() {
    const et = this;
    return et._updates.values();
  },

  getUpdatesArray() {
    const et = this;
    return Array.from(et.getUpdates());
  },

  countUpdateValid() {
    const et = this;
    return !et._updates ? 0 : et._updates.size;
  },

  /**
   * Save and dispatch changes
   */
  async save() {
    const et = this;
    const updates = et.getUpdatesArray();
    if (et._disconnected) {
      return;
    }
    if (et._lock_table_by_user_id) {
      return;
    }
    if (isEmpty(updates)) {
      return;
    }
    const saved = await et.emitUpdatesDb(updates);
    if (!saved) {
      return false;
    }
    et.clearUpdates();
    et.updateButtons();
    return true;
  },

  /**
   * Set autosave mode
   * @param {Boolean} enable Enable autosave mode;
   * @return {Boolean} enabled
   */
  async setAutoSave(enable) {
    const et = this;
    et._el_checkbox_autosave.querySelector("input").checked = !!enable;
    return et.updateAutoSave();
  },

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
  },

  /**
   * Batch cells operations
   */
  cleanBatchCells() {
    const et = this;
    et._batch_cells.length = 0;
  },

  countBatchCells() {
    const et = this;
    return et._batch_cells.length;
  },

  flushBatchCells() {
    const et = this;
    const cells = [...et._batch_cells];
    et.cleanBatchCells();
    return cells;
  },

  addBatchCell(cell) {
    const et = this;
    et._batch_cells.push(cell);
  },

  addBatchCells(cells) {
    const et = this;
    et._batch_cells.push(...cells);
  },

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
  },

  /**
   * Add an update to batch cells array
   * -> udpate to  [[idRow, idCol, value],...]
   * @param {Object} update Update
   */
  async handlerUpdateCellsCollect(update) {
    const et = this;
    const idRow = update.row_id;
    const idCol = et.getColumnIndex(update.column_name);
    et.addBatchCell([idRow, idCol, update.value_new]);
  },

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
      const idCol = et.getColumnIndex(et._config.id_column_valid);

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
  },

  /**
   * Test if id source is from dispatch
   */
  isFromDispatch(id) {
    const et = this;
    id = id || "";
    return id.split("@")[0] === et._config.id_source_dispatch;
  },

  isFromGeom(id) {
    const et = this;
    id = id || "";
    return id.split("@")[0] === et._config.id_source_geom;
  },

  isFromSanitize(id) {
    const et = this;
    return et.isFromSanitizeError(id) || et.isFromSanitizeOk(id);
  },

  isFromSanitizeError(id) {
    const et = this;
    return id === et._config.id_source_sanitize_error;
  },

  isFromSanitizeOk(id) {
    const et = this;
    return id === et._config.id_source_sanitize_ok;
  },

  isFromValidSource(id) {
    const et = this;
    return et.isFromDispatch(id) || et.isFromGeom(id) || et.isFromSanitize(id);
  },

  /**
   * Remove ref to column name from updates
   * e.g. after column removed
   * @param {String} name Column name
   */
  clearUpdateRefColName(name) {
    const et = this;
    for (const [key, update] of et._updates) {
      if (update.column_name === name) {
        et._updates.delete(key);
      }
    }
  },

  /**
   * Remove all undo/redo/update by column name
   * @param {string} name Column name
   */
  clearRef(name) {
    const et = this;
    et.clearUpdateRefColName(name);
    et.clearUndoRedoRefColName(name);
  },
};
