import { el } from "../../el_mapx";
import { getDictItem } from "./../../language";
import { clone } from "../../mx_helper_misc.js";
import { isPgType, isPgTypeDate, typeConvert } from "./../../handsontable/utils.js";
import { isEmpty, isStringRange, isSafeName, isArray } from "./../../is_test/index.js";

/**
 * Column model : creation, ordering, naming rules and type lookups.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const columnsMixin = {
  _init_columns(table) {
    const et = this;
    const columns = table.types;
    et._columns = [];
    et._add_columns(columns, table.columnsOrder);
    if (table.hasGeom) {
      et._columns.push(et._column_create_geom_action());
    }
    et.sortColumns(table.columnsOrder);
  },

  _add_columns(updates, order) {
    const et = this;
    const nColumns = et._columns.length + updates.length;
    const singleCol = updates.length === 1;
    let cPos = 0;

    for (const update of updates) {
      /**
       * Invalid name = not editable. See :
       * https://github.com/handsontable/handsontable/issues/5439
       */
      const { column_name, column_type, is_identity } = update;
      const column = et._column_create(column_name, column_type, is_identity);
      column._pos = singleCol
        ? nColumns
        : column._invalid
          ? nColumns + 1
          : column.readOnly
            ? -1
            : cPos++;
      if (isArray(order) && order.includes(column.data)) {
        column._pos = order.indexOf(column.data);
      }
      et._columns.push(column);
    }

    et.sortColumns(order);
  },

  async _add_column_strict(update) {
    const et = this;
    const isValidName = await et.isValidName(update.column_name);
    const isValid = isValidName && isPgType(update.column_type);

    if (!isValid) {
      return false;
    }
    et._add_columns([update]);
    et.updateTableColumns();
    return true;
  },

  /**
   * Helper to rename / duplicate column
   * @param {string} oldColumnName Old column name
   * @param {string} newColumnName New column name
   * @param {object} opt options
   * @return {Promise}
   */
  async _rename_column(oldColumnName, newColumnName, opt) {
    const et = this;
    opt = Object.assign({}, { duplicate: false }, opt);
    const columns = et.getColumns();
    const labels = et.getColumnLabels();
    const posData = columns.findIndex(
      (column) => column.data === oldColumnName,
    );
    const posLabel = labels.indexOf(oldColumnName);

    if (posLabel === -1) {
      console.warn(`_rename_column: unknown column ${oldColumnName}`);
      return;
    }

    if (!opt.duplicate) {
      et.clearRef(oldColumnName);
    }

    if (opt.duplicate) {
      const newColumn = clone(columns[posData]);
      newColumn.data = newColumnName;
      newColumn._is_identity = false; // duplicate  remove the identity
      columns.push(newColumn);
      et._column_set_readonly(newColumn);
    } else {
      columns[posData].data = newColumnName;
      et._column_set_readonly(columns[posData]);
    }

    const data = et._ht.getSourceData();
    for (const row of data) {
      if (row.hasOwnProperty(oldColumnName)) {
        row[newColumnName] = clone(row[oldColumnName]);
        if (!opt.duplicate) {
          delete row[oldColumnName];
        }
      }
    }

    await et.updateData(data, "column_rename_handler");
  },

  updateTableColumns() {
    const et = this;
    et._ht.updateSettings({
      columns: et.getColumns(),
      colHeaders: et.getColumnLabels(),
    });
    et._ht.render();
    et.updateButtonsAddRemoveColumn();
  },

  setColumns(columns) {
    const et = this;
    et._columns.length = 0;
    et._columns.push(...columns);
  },

  getColumns() {
    const et = this;
    return et._columns;
  },

  getColumnLabels() {
    const et = this;
    return et._columns.map((c) => c.data);
  },

  sortColumns(order) {
    const et = this;
    let i = 0;
    for (const column of et._columns) {
      if (et.isColumnGeomAction(column.data)) {
        column._pos = Number.MIN_SAFE_INTEGER;
        continue;
      }
      if (et.isColumnHidden(column.data)) {
        column._pos = Number.MIN_SAFE_INTEGER + 1 + i++;
        continue;
      }
      if (column.data === et._config.id_column_valid) {
        column._pos = Number.MAX_SAFE_INTEGER;
        continue;
      }
      if (isArray(order) && order.includes(column.data)) {
        column._pos = order.indexOf(column.data);
      }
    }
    et._columns.sort((a, b) => a._pos - b._pos);
  },

  isColumnOrderFixed(name) {
    const et = this;
    return (
      et.isColumnGeomAction(name) ||
      et.isColumnHidden(name) ||
      name === et._config.id_column_valid
    );
  },

  /**
   * Get an array of columns as option
   * @param {Array} checks in is_safe, is_not_used, is_not_reserved
   * @return {Promise<array>}
   */
  async getColumnsNamesOptions(checks) {
    const et = this;
    const names = et.getColumnLabels();
    const optionColumnNames = [];
    const optionColumnNamesDisabled = [];

    for (const name of names) {
      const isValid = await et.isValidName(name, checks);
      const elOption = el("option", { value: name }, name);
      if (isValid) {
        optionColumnNames.push(elOption);
      } else {
        optionColumnNamesDisabled.push(elOption);
        elOption.disabled = true;
        const reasons = await et.validateName(name);
        const issues = [];
        for (const k in reasons) {
          const v = reasons[k];
          if (!v) {
            issues.push(await getDictItem(`edit_table_modal_issue_name_${k}`));
          }
        }
        elOption.label = `${name} (${issues.join(",")})`;
      }
    }

    return [...optionColumnNames, ...optionColumnNamesDisabled];
  },

  _column_create(name, pg_type, is_identity) {
    const et = this;
    const column = {};
    const isOkType = isPgType(pg_type);
    if (!isOkType) {
      throw new Error(`Wrong type in column creator : ${pg_type}`);
    }
    column._pg_type = pg_type;
    column._pos = 0;
    column.data = name;
    column.type = typeConvert(pg_type, "mx");
    column._is_identity = is_identity;
    et._column_set_readonly(column);
    return column;
  },

  _column_create_geom_action() {
    const et = this;
    return {
      data: et._config.id_column_geom_action,
      type: "mx_string",
      _pg_type: "text",
      _pos: Number.MIN_SAFE_INTEGER,
      readOnly: true,
      _is_geom_action: true,
      renderer: et.renderGeomActionCell,
    };
  },

  _column_set_readonly(column) {
    const et = this;

    if (isEmpty(column)) {
      return;
    }
    const name = column.data;
    column._invalid = !isSafeName(name);
    column.readOnly =
      et.isReadOnly(name) || column._invalid || column._is_identity;
    return column;
  },

  /**
   * Column name validation : columns used internally
   * @param {String} name
   * @return {Boolean}
   */
  isColumnReserved(name) {
    const et = this;
    return et._config.id_columns_reserved.includes(name);
  },

  /**
   * Column name validation : columns used internally
   * @param {String} name
   * @return {Boolean}
   */
  isColumnHidden(name) {
    const et = this;
    return et._config.id_columns_hidden.includes(name);
  },

  isColumnGeomAction(name) {
    const et = this;
    return name === et._config.id_column_geom_action;
  },

  /**
   * Column name validation : columns used in style and secondary attributes
   * @param {String} name
   * @return {Promise<Boolean>}
   */
  async isColumnUsed(name) {
    const et = this;
    const cc = et.getColumnsUsedCache();
    const now = Date.now();
    const ttl = 5 * 60 * 1000;
    const age = now - cc.timestamp;
    if (age > ttl) {
      cc.columns = await et.emitGetCached("columns_used");
      cc.timestamp = now;
    }

    return cc.columns.includes(name);
  },

  /**
   * Reset columns cache
   */
  resetColumnsUsedCache() {
    const et = this;
    et._columns_used_cache = { columns: [], timestamp: 0 };
  },

  /**
   * Get column cache
   * @return {Object} cache {columns:[], timestamp: n}
   */
  getColumnsUsedCache() {
    const et = this;
    if (!et._columns_used_cache) {
      et.resetColumnsUsedCache();
    }
    return et._columns_used_cache;
  },

  /**
   *  Check if this is a date column
   * @param {String} name Column name
   * @return {Boolean} is a date column
   */
  isColumnDate(name) {
    const et = this;
    const type = et.getColumnType(name, "postgres");
    return isPgTypeDate(type);
  },

  /**
   * Column name validation : column not editable
   * @param {String} name
   * @return {Boolean}
   */
  isReadOnly(name) {
    const et = this;
    return et.isColumnReserved(name) || !isSafeName(name);
  },

  /**
   * Column name validation : check is name is valid
   * @param {String} name
   * @param {array} checks List of checks : is_safe,is_not_used, is_not_reserved
   * @return {Promise<Boolean>}
   */
  async isValidName(name, checks) {
    const et = this;
    checks = isEmpty(checks)
      ? ["is_safe", "is_not_used", "is_not_reserved", "is_not_local"]
      : checks;
    const valid = await et.validateName(name);
    const ok = checks.reduce((a, c) => a && valid[c], true);
    return ok;
  },

  /**
   * Column name validation : check is name is valid
   * @param {String} name
   * @return {Promise<Boolean>}
   */
  async validateName(name) {
    const et = this;
    const isNotLocal = !et.columnExists(name);
    const isSafe = isSafeName(name);
    const isUsed = await et.isColumnUsed(name);
    const isNotUsed = !isUsed;
    const isNotReserved = !et.isColumnReserved(name);
    const res = {
      is_not_local: isNotLocal,
      is_safe: isSafe,
      is_not_used: isNotUsed,
      is_not_reserved: isNotReserved,
    };
    return res;
  },

  /**
   * Column new name validation : check is new name is valid
   * @param {String} name
   * @return {Promise<Boolean>}
   */
  async validateNewName(name) {
    const et = this;
    const minLength = 1;
    const maxLength = 50;
    const validUnique = !et.columnNameExists(name);
    const validName = await et.isValidName(name, [
      "is_safe",
      "is_not_reserved",
    ]);
    const validLength = isStringRange(name, minLength, maxLength);
    const valid = validName && validUnique && validLength;

    return {
      valid,
      validUnique,
      validLength,
      validName,
      minLength,
      maxLength,
    };
  },

  /**
   * Test if column name exists
   * @param {string} name Column name
   */
  columnNameExists(name) {
    const et = this;
    const names = et.getColumns().map((c) => c.data);
    return names.includes(name);
  },

  /**
   * Get column pg type
   * @param {String} columnName Column name
   * @param {String} format : postgres, css, input. Default = 'css'
   * @return {String} type
   */
  getColumnType(columnName, format = "css") {
    const et = this;
    const { _pg_type: type } = et
      .getColumns()
      .find((c) => c.data === columnName);
    return typeConvert(type, format);
  },

  /**
   * Get column json type using column index
   * @param {Integer} column index
   * @return {String} type
   */
  getColumnTypeByIndex(index, format = "css") {
    const et = this;
    const { _pg_type: type } = et._columns[index];
    return typeConvert(type, format);
  },

  /**
   * Get column index
   * @param {String} columnName Column name
   * @return {Integer} column id
   */
  getColumnIndex(columnName) {
    const et = this;
    for (let i = 0; i < et._columns.length; i++) {
      const col = et._columns[i];
      if (col.data === columnName) {
        return i;
      }
    }
    throw new Error(`Column ${columnName} not found`);
  },

  /**
   * Check if a column exists
   * @param {String} column name
   * @return {Boolean} exists
   */
  columnExists(columnName) {
    const et = this;
    return !!et._columns.find((c) => c.data === columnName);
  },
};
