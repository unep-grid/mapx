/**
 * Multi user table editor : orchestrator.
 *
 * The editor class is assembled from mixins, one file per concern :
 * - channel.js      shared ws protocol ( also used by quick geometry edit )
 * - geometry_flow.js shared draw-edit orchestration
 * - columns.js      column model, naming rules, types
 * - dialogs.js      user dialogs
 * - ht_adapter.js   handsontable specifics
 * - toolbar.js      buttons + progress UI
 * - changes.js      change collection, sanitize, save
 * - locks_client.js lock state and UI locking
 *
 * This file keeps : session lifecycle ( init / start / destroy ), socket
 * event handlers, dispatch routing and the emit layer.
 */
import { settings } from "../../settings";
import { modalConfirm } from "./../../mx_helper_modal.js";
import { getArrayDistinct } from "./../../array_stat";
import { clone, makeId } from "../../mx_helper_misc.js";
import { getView, viewsReplace } from "../../map_helpers/index.js";
import { EditTableBase } from "./base.js";
import { events as channelEvents, createLockHeartbeat } from "./channel.js";
import { refreshTableViews as refreshTableViewsFlow } from "./geometry_flow.js";
import {
  isSourceId,
  isNotEmpty,
  isFunction,
  isEmpty,
  isString,
} from "./../../is_test/index.js";
import { waitFrameAsync } from "../../animation_frame";
import { columnsMixin } from "./columns.js";
import { dialogsMixin } from "./dialogs.js";
import { htAdapterMixin } from "./ht_adapter.js";
import { toolbarMixin } from "./toolbar.js";
import { changesMixin } from "./changes.js";
import { locksClientMixin } from "./locks_client.js";

import "./types.js";
import "./style.less";

const defaults = {
  debug: false,
  log_perf: false,
  id_table: null,
  ht_license: "non-commercial-and-evaluation",
  id_column_main: "gid",
  id_column_valid: "_mx_valid",
  id_column_geom_action: "__mx_geom_action",
  id_column_geom_status: "__mx_geom_status",
  id_columns_reserved: [
    "gid",
    "_mx_valid",
    "geom",
    "__mx_geom_status",
    "__mx_geom_action",
  ],
  id_columns_hidden: ["gid"],
  max_changes: 1e5, //max one column at max rows
  min_columns: 3,
  max_changes_large: 1e3,
  max_columns: 1e3, // should match server
  timeout_emit: 1e3 * 60, // 60s round trip
  timeout_emit_short: 1e3, // 1s round trip
  timeout_sanizing: 1e3 * 60,
  timeout_geom_valid: 1e3 * 120,
  timeout_cache: 1e3 * 10,
  events: channelEvents,
  id_source_dialog: "from_dialog",
  id_source_dispatch: "from_dispatch",
  id_source_geom: "from_geom",
  id_source_sanitize_ok: "from_sanitize_ok",
  id_source_sanitize_error: "from_sanitize_error",
};

export class EditTableSessionClient extends EditTableBase {
  constructor(ws, config) {
    super(ws);
    const et = this;
    et._config = Object.assign(et._config, et._config, defaults, config);
  }

  /**
   * Async initialisation
   */
  async init() {
    const et = this;
    try {
      const e = et._config.events;
      if (et._initialized) {
        return;
      }
      et._updates = new Map();
      et._validation_cache = new Map();
      et._get_cache = new Map();
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
      et._geometry_lock_by_session = null;
      et._initialized = true;
      et._id_table = et._config?.id_table;
      et._id_user = settings.user.id;
      et._has_geom = false;
      et._geom_type = null;
      et._geom_mode = false;
      et._validation_geom = {};
      et._table_ready = false;
      et._init_data = [];
      /**
       * If empty id, display a dialog to select
       */
      if (isEmpty(et._id_table)) {
        et._id_table = await et.dialogSelectTable();
        const valid = isSourceId(et._id_table);
        if (!valid) {
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
      et._socket.on(e.server_joined, et.onJoined);
      et._socket.on(e.server_error, et.onServerError);
      et._socket.on(e.server_new_member, et.onNewMember);
      et._socket.on(e.server_member_exit, et.onMemberExit);
      et._socket.on(e.server_table_data, et.initTable);
      et._socket.on(e.server_dispatch, et.onDispatch);
      et._socket.on(e.server_progress, et.onProgress);

      et._socket.on("disconnect", et.onDisconnect);

      /**
       * If a on_destroy callback is set in option, add it
       * to others destroy callback
       */
      if (isFunction(et._config.on_destroy)) {
        et.addDestroyCb(et._config.on_destroy);
      }

      await et.dialogWarning();

      /**
       * Build UI
       */
      await et.build();

      /**
       * Start data edition
       */
      await et.start();

      /**
       * Keep server-side owned locks ( batch lock, geometry lock ) alive
       * for the whole editor session : refresh is a no-op server-side
       * when this session owns nothing
       */
      et._heartbeat = createLockHeartbeat(() =>
        et.emitGet(e.client_lock_refresh, null, et._config.timeout_emit_short),
      );
      et._heartbeat.start();

      await et.once("table_ready", null);

      /**
       * Register cb
       */
      et.on("after_change_done", () => {
        et.updateButtons(50);
      });

      return true;
    } catch (e) {
      et.destroy();
      throw new Error(e);
    }
  }

  /**
   * Start edtion or restart during init or reconnection
   * @param {Object} opt Options
   * @param {Boolean} opt.send_table Resend full table
   */
  async start(opt) {
    const et = this;
    const e = et._config.events;
    const def = { send_table: true };
    opt = Object.assign({}, def, opt);
    await et.emit(e.client_edit_start, opt);
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
    const e = et._config.events;

    try {
      if (et._destroyed || et._destroying) {
        return;
      }
      /**
       * Prevent quit with unsaved changes
       */
      const discard = await et.dialogUnsavedChangesDiscard();
      if (!discard) {
        return;
      }

      /**
       * Clean
       */
      et._destroying = true;
      et._lock_table_concurrent = false;
      et._lock_table_by_user_id = null;
      et._geometry_lock_by_session = null;
      if (et._id_session) {
        await et.releaseGeometryEditLock();
      }

      /**
       * Close modal
       * -> could trigger a destroy
       */
      et._modal?.close();

      if (et._built && !et._auto_save) {
        et.lockTableConcurrent(false).catch((e) => {
          console.error(e);
        });
      }

      /**
       * Auto reload views locally
       * -> structural change requires broadcasting changes from the server
       * -> here quick local reload, to see values changes
       */
      if (et._built) {
        et.lock();
        await et.refreshTableViews();
      }

      /**
       * Emit exit
       */
      await et.emit(e.client_exit, null, et._config.timeout_emit_short);

      /**
       * Remove listeners, clear
       */
      et._heartbeat?.stop();
      et._popups.forEach((p) => p.destroy());
      et._resize_observer?.disconnect();
      et._socket.off(e.server_joined, et.onJoined);
      et._socket.off(e.server_error, et.onServerError);
      et._socket.off(e.server_new_member, et.onNewMember);
      et._socket.off(e.server_member_exit, et.onMemberExit);
      et._socket.off(e.server_table_data, et.initTable);
      et._socket.off(e.server_dispatch, et.onDispatch);
      et._socket.off(e.server_progress, et.onProgress);
      et._socket.off("disconnect", et.onDisconnect);

      /**
       * Fire destroy event / trigger destroy callbacks
       */
      et.fire("destroy").catch((e) => {
        console.error(e);
      });
      et._destroyed = true;
    } catch (e) {
      console.error(e);
    }
  }

  get column_index() {
    const et = this;
    return et._config.id_column_main;
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
   * Get views table with dependencies : layer, dash, cc, cs
   */
  async getTableViews() {
    const et = this;
    const tableViews = await et.emitGetCached("table_views");
    return tableViews;
  }

  async refreshTableViews() {
    const et = this;
    return refreshTableViewsFlow(et, { getView, viewsReplace });
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
   * Handler of move column / visual order
   * -> only for dispatch
   * @param {Object} update Update object
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnsOrder(update, source) {
    const et = this;
    try {
      const order = update.columns_order;
      et.sortColumns(order);
      et.updateTableColumns();

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
      et.setProgressMessage(message, 1, 50);
      et.addDispached(message);

      if (message.end) {
        et.processDispatched();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async processDispatched() {
    const et = this;
    try {
      const idDispatch = `${et._config.id_source_dispatch}@${makeId()}`;
      const dispached = et.flushDispachedArray();
      for (const message of dispached) {
        et.setProgressMessage(message, 51, 100);
        // wait for progress animation
        await waitFrameAsync();

        if (isNotEmpty(message.updates)) {
          for (const update of message.updates) {
            switch (update.type) {
              case "lock_table":
                await et.handlerUpdateLock(update, message);
                break;
              case "geometry_edit_lock":
                await et.handlerUpdateGeometryLock(update, message);
                break;
              case "update_cell":
                await et.handlerUpdateCellsCollect(update, message);
                break;
              case "add_column":
                await et.handlerUpdateColumnAdd(update, idDispatch);
                break;
              case "rename_column":
                await et.handlerUpdateColumnRename(update, idDispatch);
                break;
              case "duplicate_column":
                await et.handlerUpdateColumnDuplicate(update, idDispatch);
                break;
              case "remove_column":
                await et.handlerUpdateColumnRemove(update, idDispatch);
                break;
              case "order_columns":
                await et.handlerUpdateColumnsOrder(update, idDispatch);
                break;
              case "remove_rows":
                await et.handlerUpdateRowsRemove(update, idDispatch);
                break;
              case "add_row":
                await et.handlerUpdateRowAdd(update, idDispatch);
                break;
              case "update_geom":
                await et.handlerUpdateGeom(update, idDispatch);
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
          colRemoved.column = columns.splice(n, 1)[0];
          colRemoved.pos = n;
          colRemoved.name = colRemoved.column.data;
          continue;
        }
      }

      if (isEmpty(colRemoved)) {
        console.warn(`Column ${update.column_name} not removed`);
        return false;
      }
      /**
       * Remove refs : undo/redo/updates
       */
      et.clearRef(colRemoved.name);
      /**
       * Update column meta
       */
      et.updateTableColumns();

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
      const data = et._ht.getSourceData();
      for (const row of data) {
        delete row[update.column_name];
      }
      await et.updateData(data, "column_remove_handler");

      /**
       * Update buttons state
       */
      et.updateButtons();

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
   * Handle column duplicate from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnDuplicate(update, source) {
    const et = this;
    try {
      await et._rename_column(update.column_name, update.column_name_new, {
        duplicate: true,
      });
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
   * Handle column rename from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnRename(update, source) {
    const et = this;
    try {
      await et._rename_column(update.column_name, update.column_name_new);

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
   * Handle column addition from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateColumnAdd(update, source) {
    const et = this;
    try {
      await et._add_column_strict(update);

      if (isNotEmpty(update._column_config)) {
        const { type, rows } = update._column_config;
        const cells = [];
        const idCol = et.getColumnIndex(update.column_name);
        const gidRows = et._ht.getDataAtProp(et.column_index);

        for (const row of rows) {
          const idRow = gidRows.indexOf(row.gid);
          if (idRow !== -1) {
            cells.push([idRow, idCol, row.value]);
          }
        }

        et.setCells({
          cells: cells,
          source: source,
        });
      }

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
   * Handle rows removal from update
   * @param {Object} update
   * @param {String} source (edit, dispatch..)
   */
  async handlerUpdateRowsRemove(update, source) {
    const et = this;
    try {
      await et._remove_rows(update);

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

  async handlerUpdateRowAdd(update, source) {
    const et = this;
    try {
      const row = et.rowForTable(update.row);
      if (isEmpty(row)) {
        return false;
      }
      await et._add_row(row);
      et.fire("row_added", {
        row,
        client_id: update._client_id,
        source,
      });
      await et.refreshTableViews();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async handlerUpdateGeom(update, source) {
    const et = this;
    try {
      const row = et.rowForTable(update.row);
      const gid = update.gid || row?.gid;
      if (isEmpty(gid)) {
        return false;
      }
      const data = et._ht.getSourceData();
      const idRow = data.findIndex((r) => r[et.column_index] === gid);
      if (idRow === -1) {
        if (row) {
          await et._add_row(row);
        }
        await et.refreshTableViews();
        return true;
      }
      const keyStatus = et._config.id_column_geom_status;
      const geomStatus = update[keyStatus] || row?.[keyStatus] || "present";
      const dataUpdated = data.map((r, i) => {
        return i === idRow ? { ...r, [keyStatus]: geomStatus } : r;
      });
      await et.updateData(dataUpdated, source || et._config.id_source_geom);
      await et.refreshTableViews();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async _remove_rows(update) {
    const et = this;
    const data = et._ht.getSourceData();
    const idsRemove = new Set(update.id_rows);
    const columnIndex = et.column_index;
    // Using Set + filter is 5x faster than for of...
    const filteredData = data.filter((row) => !idsRemove.has(row[columnIndex]));

    await et.updateData(filteredData, "column_remove_handler");

    return true;
  }

  async _add_row(row) {
    const et = this;
    row = et.rowForTable(row);
    const data = et._ht.getSourceData();
    const gid = row[et.column_index];
    const exists = data.some((r) => r[et.column_index] === gid);
    if (exists) {
      return false;
    }
    data.push(row);
    await et.updateData(data, "row_add_handler");
    et._ht.updateSettings({
      maxRows: data.length,
      copyPaste: {
        rowsLimit: data.length,
      },
    });
    et._ht.render();
    return true;
  }

  rowForTable(row) {
    if (isEmpty(row)) {
      return row;
    }
    const out = clone(row);
    delete out.geom;
    return out;
  }

  get unsaved() {
    const et = this;
    return et.countUpdateValid() > 0;
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
   * Handle disconnection
   */
  onDisconnect() {
    const et = this;
    et.disable();
    et._disconnected = true;
    et._el_overlay?.classList?.add("edit-table--disconnected");
    et._socket.io.once("reconnect", et.onReconnect);
  }

  /**
   * Handle reconnection
   */
  async onReconnect() {
    const et = this;
    try {
      et._disconnected = false;
      et._el_overlay?.classList?.remove("edit-table--disconnected");
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
  get destroyed() {
    const et = this;
    return !!et._destroyed;
  }

  get destroying() {
    const et = this;
    return !!et._destroying;
  }

  /**
   * Get locked state
   */
  get locked() {
    const et = this;
    return !!et._locked;
  }

  /**
   * ws emit wrapper : format message and emit
   * @param {String} type Emit type
   * @param {Object} message Message to emit, if not locked
   * @return {Promise<any>}
   */
  async emit(type, message, timeout) {
    const et = this;

    if (et.destroyed) {
      console.warn("Trying to emit from a destroyed instance", type, message);
      return false;
    }
    if (!et._built) {
      console.warn("Trying to emit when it's not fully built", type, message);
      return false;
    }
    if (!et.destroying && et.locked) {
      console.warn("Trying to emit when it's locked", type, message);
      return false;
    }

    const maxTime = isEmpty(timeout) ? et._config.timeout_emit : timeout;
    const messageEmit = et.message_formater(message);
    return et._ws.emitAsync(type, messageEmit, maxTime);
  }

  /**
   * ws get emit wrapper : format message and emit
   * @note : same as emit, but allow when not build/locked
   * @param {String} type Emit type
   * @param {Object} message Message to emit
   * @return {Promise<any>}
   */
  async emitGet(type, message, timeout) {
    const et = this;
    const maxTime = isEmpty(timeout) ? et._config.timeout_emit : timeout;
    const messageEmit = et.message_formater(message);
    return et._ws.emitAsync(type, messageEmit, maxTime);
  }

  /**
   * Get data from specific events, cache result
   */
  async emitGetCached(type, timeout) {
    const et = this;
    const cached = et._get_cache.get(type);
    if (cached) {
      return cached;
    }
    const data = await et.emitGet("/client/get", { type }, timeout);
    if (data) {
      et._get_cache.set(type, data);
    }
    setTimeout(() => {
      et._get_cache.delete(type);
    }, et._config.timeout_cache);
    return data;
  }

  /**
   * ws emit wrapper :  emit updates
   * @param {Array} update Array of updates
   * @param {Object} opt Options pased to emit message
   */
  async emitUpdates(updates, opt, force = false) {
    const et = this;
    const e = et._config.events;
    if (et.locked && !force) {
      return false;
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
        const message = {
          nParts: nChunk,
          part: iChunk + 1,
          start: iChunk === 0,
          end: iChunk === nChunk - 1,
          updates: chunk,
          ...opt,
        };
        const accepted = force
          ? await et._ws.emitAsync(
              e.client_edit_updates,
              et.message_formater(message),
              et._config.timeout_emit,
            )
          : await et.emit(e.client_edit_updates, message);
        if (!accepted) {
          return false;
        }
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
    return et.emitUpdates(updates, { write_db: true });
  }

  /**
   * emit state update (e.g. lock state change )
   * @param {Array} updates
   */
  async emitUpdatesState(updates, force = false) {
    const et = this;
    return et.emitUpdates(updates, { update_state: true }, force);
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
   * Geometry tools
   */
  async getFeature(gid) {
    const et = this;
    const e = et._config.events;
    return et.emitGet(
      e.client_get,
      {
        type: "feature",
        gid,
      },
      et._config.timeout_emit,
    );
  }

  /**
   * Read the server-owned declared geometry column type.
   */
  async getGeometryInfo() {
    const et = this;
    const e = et._config.events;
    return et.emitGet(
      e.client_get,
      {
        type: "geometry_info",
      },
      et._config.timeout_emit,
    );
  }

  /**
   * Write a feature geometry ( session interface for geometry_flow )
   * @param {Number} gid Feature id
   * @param {Object} geometry GeoJSON geometry or null
   * @return {Promise<Boolean>} accepted
   */
  async updateGeometry(gid, geometry) {
    const et = this;
    return et.emitUpdatesDb([
      {
        type: "update_geom",
        id_table: et._id_table,
        gid,
        geom: geometry,
      },
    ]);
  }

  /**
   * Toggle the editor UI for a map geometry edit session
   * ( main panel visibility is handled by geometry_flow )
   */
  async setGeometryMode(enable) {
    const et = this;
    et._geom_mode = !!enable;
    et._el_content.classList.toggle("edit-table--geom-mode", et._geom_mode);
    et.setReadOnly(et._geom_mode);
    if (et._geom_mode) {
      et._modal?.hide?.();
    } else {
      et._modal?.show?.();
    }
    et.updateButtons();
  }
}

Object.assign(
  EditTableSessionClient.prototype,
  columnsMixin,
  dialogsMixin,
  htAdapterMixin,
  toolbarMixin,
  changesMixin,
  locksClientMixin,
);
