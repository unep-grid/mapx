import {
  tableExists,
  columnExists,
  getColumnsTypesSimple,
  getLayerTitle,
  getLayerUsedAttributes,
  getTableDimension,
  isLayerValid,
  sanitizeUpdates,
  getMxSourceData,
} from "#mapx/db_utils";
import { getSourceAttributeTable } from "#mapx/source";
import { randomString } from "#mapx/helpers";
import { isEmpty, isString, isSourceId } from "@fxi/mx_valid";
import {
  ioUpdateDbViewsAltStyleBySource,
  getViewsTableBySource,
} from "#mapx/view";
import { events } from "./events.js";
import {
  acquireLock,
  getLock,
  isLockOwner,
  releaseLock,
  refreshLock,
} from "./locks.js";
import {
  isSocketAllowedToEditGeometry,
  isSocketAllowedToEditSource,
  isUserAllowedToEditSource,
} from "./permissions.js";
import { writeUpdates } from "./writes.js";
import {
  addGeometryStatusToRows,
  cols,
  getFeatureByGid,
  getGeometryColumnInfo,
  getGeometryTypeSimple,
} from "./geometry.js";
import { getSourceIdentityStatus, repairSourceIdentity } from "./identity.js";
import { pgWrite } from "#mapx/db";
import { createSourceRevision } from "../revision.js";

/**
 * Triggered by '/client/source/edit/table' in ..api/index.js
 */
export async function ioEditSource(socket, options, callback) {
  try {
    const et = new EditTableSession(socket, options);
    await et.init();
    callback(true);
  } catch (e) {
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

export async function ioEditSourceStatus(socket, options, callback) {
  try {
    const idTable = options?.id_table;
    if (!isSourceId(idTable)) {
      return callback(false);
    }
    const exists = await tableExists(idTable);
    if (!exists) {
      return callback(false);
    }
    const allowed = await isSocketAllowedToEditSource(socket, idTable);
    if (!allowed) {
      return callback(false);
    }
    const geometryEditAllowed = await isSocketAllowedToEditGeometry(
      socket,
      idTable,
      pgWrite,
    );
    return callback({
      id_table: idTable,
      locked: !!(await getLock(idTable, "table")),
      geometryEditLock: await getLock(idTable, "geometry"),
      geometryEditAllowed,
      identity: await getSourceIdentityStatus(idTable),
    });
  } catch (e) {
    console.error("Edit source status failed", e);
    callback(false);
  }
}

export async function ioEditSourceIdentityRepair(socket, options, callback) {
  const idTable = options?.id_table;
  let client;
  try {
    if (!isSourceId(idTable)) {
      throw new Error("Invalid source");
    }
    if (!(await isSocketAllowedToEditSource(socket, idTable))) {
      throw new Error("Source identity repair is not allowed");
    }
    const tableLock = await getLock(idTable, "table");
    const geometryLock = await getLock(idTable, "geometry");
    if (tableLock || geometryLock) {
      throw new Error(
        "Close active edit sessions before repairing this source",
      );
    }
    const room = `room/source/edit/table/${idTable}`;
    const activeEditors = await socket.server.in(room).fetchSockets();
    if (activeEditors.length > 0) {
      throw new Error(
        "Close active edit sessions before repairing this source",
      );
    }

    client = await pgWrite.connect();
    await client.query("BEGIN");
    const identity = await repairSourceIdentity(
      idTable,
      socket.session.user_id,
      client,
    );
    if (identity.repaired) {
      await createSourceRevision({
        idSource: idTable,
        idUser: Number(socket.session.user_id),
        client,
      });
    }
    await client.query("COMMIT");
    callback({ id_table: idTable, identity, success: true });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    callback({
      id_table: idTable,
      success: false,
      error: error?.message || error,
    });
  } finally {
    client?.release();
  }
}

const def = {
  start_percent: 0.001, //initial progress value ( 0 remove it )
  log_perf: false,
  max_rows: 1e5,
  max_columns: 1000, // should match client
  size_chunk: 1e3,
};

export class EditTableSession {
  constructor(socket, config) {
    const et = this;
    const session = socket.session;
    et._socket = socket;
    et._io = et._socket.server;
    et._config = config;
    et._perf = {};
    et._tables_allowed = new Map();
    et._is_authenticated = session.user_authenticated || false;
    et._busy = false;
    et._id_user = session.user_id;
    et._id_project = session.project_id;
    et._user_roles = session.user_roles;
    et.onUpdate = et.onUpdate.bind(et);
    et.onExit = et.onExit.bind(et);
    et.onValidate = et.onValidate.bind(et);
    et.onSanitize = et.onSanitize.bind(et);
    et.onGet = et.onGet.bind(et);
    et.onLockRefresh = et.onLockRefresh.bind(et);
    et.onDisconnect = et.onDisconnect.bind(et);
    et.progress = et.progress.bind(et);
    et.progressAll = et.progressAll.bind(et);
  }

  /**
   * Set busy flag
   */
  setBusy(busy) {
    const et = this;
    et._busy = busy;
  }
  get busy() {
    const et = this;
    return !!et._busy;
  }

  async getGeometryEditLock() {
    const et = this;
    return getLock(et._id_table, "geometry");
  }

  isGeometryEditLockOwner(lock) {
    const et = this;
    return isLockOwner(lock, et._id_session);
  }

  async isGeometryEditAuthorized(client = pgWrite) {
    const et = this;
    return isSocketAllowedToEditGeometry(
      et._socket,
      et._id_table,
      client,
    );
  }

  async isGeometryEditAllowed(client = pgWrite) {
    const et = this;
    if (!(await et.isGeometryEditAuthorized(client))) {
      return false;
    }
    const lock = await et.getGeometryEditLock();
    return !lock || et.isGeometryEditLockOwner(lock);
  }

  async acquireGeometryEditLock(update = {}) {
    const et = this;
    if (!(await et.isGeometryEditAuthorized())) {
      return false;
    }
    const lock = await acquireLock({
      idTable: et._id_table,
      scope: "geometry",
      idSession: et._id_session,
      idUser: et._id_user,
      gid: update.gid,
      mode: update.mode || "table",
    });
    if (!lock) {
      return false;
    }
    update.lock = lock;
    return true;
  }

  async releaseGeometryEditLock() {
    const et = this;
    return releaseLock(et._id_table, "geometry", et._id_session);
  }

  /**
   * Keep owned locks alive : called on client heartbeat and on any
   * update activity. No-op for locks this session does not own.
   */
  async refreshOwnedLocks() {
    const et = this;
    try {
      await refreshLock(et._id_table, "table", et._id_session);
      await refreshLock(et._id_table, "geometry", et._id_session);
    } catch (err) {
      et.error("Refresh locks error", err);
    }
  }

  perf(label) {
    if (!def.log_perf) {
      return;
    }
    const et = this;
    delete et._perf[label];
    et._perf[label] = performance.now();
  }
  perfEnd(label) {
    if (!def.log_perf) {
      return;
    }
    const et = this;
    const diff = performance.now() - et._perf[label];
    console.log(`Perf ${label}: ${diff} [ms]`);
  }

  async init() {
    const et = this;

    /**
     * Setup session
     */
    et._id_session = randomString("mx_edit_table");
    et._id_table = et._config.id_table;
    et._id_room = `room/source/edit/table/${et._id_table}`;

    /**
     * Authentication
     */
    const allowed = await et.isAllowed();

    if (!allowed) {
      et.error("Not allowed");
      return;
    }

    const idValid = isSourceId(et._id_table);

    if (!idValid) {
      et.error(`Table ${et._id_table} is not a valid source`);
      return;
    }

    const exists = await tableExists(et._id_table);

    if (!exists) {
      et.error("Table not found");
      return;
    }

    const identity = await getSourceIdentityStatus(et._id_table);
    if (!identity.valid) {
      throw new Error(
        `Source gid identity is invalid: ${identity.issues.join(", ")}`,
      );
    }

    const lightweight = et._config.lightweight === true;
    const dim = lightweight ? null : await getTableDimension(et._id_table);

    if (!lightweight && dim.nrow > def.max_rows) {
      et.error(`Full table: too many rows. ${dim.nrow} > ${def.max_rows} `);
      return;
    }

    if (!lightweight && dim.ncol > def.max_columns) {
      et.error(
        `Full table: too many columns. ${dim.ncol} > ${def.max_columns} `
      );
      return;
    }

    /**
     * Join a common room
     */
    et.joinRoom();

    /**
     * Listen for events
     */
    et._socket.on(events.client_exit, et.onExit);
    et._socket.on(events.client_edit_updates, et.onUpdate);
    et._socket.on(events.client_geom_validate, et.onValidate);
    et._socket.on(events.client_changes_sanitize, et.onSanitize);
    et._socket.on(events.client_get, et.onGet);
    et._socket.on(events.client_lock_refresh, et.onLockRefresh);
    et._socket.on("disconnect", et.onDisconnect);

    /*
     * Get list of current members
     */
    const members = await et.getMembers();

    /**
     * Signal join
     */
    et.emit(events.server_joined, {
      id_room: et._id_room,
      id_session: et._id_session,
      members: members,
    });
    et.emitRoom(events.server_new_member, {
      id_socket: et._socket.id,
      roles: et._user_roles,
      members: members,
    });

    if (et._config.send_table && !lightweight) {
      /*
       * Initial table send
       */
      await et.sendTable();
    }
  }

  error(txt, err) {
    const et = this;
    et.emit(events.server_error, {
      message: txt,
      error: err?.message || err,
      id_room: et._id_room,
    });
    console.error(txt, err);
  }

  async getMembers() {
    const et = this;
    const sockets = await et._io.in(et._id_room).fetchSockets();
    const members = [];
    for (const s of sockets) {
      if (!s.session) {
        // case when socket is remote, session could have been removed
        s.session = s.data;
      }
      const member = {
        id: s.session.user_id,
        email: s.session.user_email,
      };
      members.push(member);
    }
    return members;
  }

  joinRoom() {
    const et = this;
    const rooms = (et._socket.data.edit_table_rooms ||= {});
    const count = rooms[et._id_room] || 0;
    rooms[et._id_room] = count + 1;
    if (count === 0) {
      et._socket.join(et._id_room);
    }
  }

  leaveRoom() {
    const et = this;
    const rooms = (et._socket.data.edit_table_rooms ||= {});
    const count = rooms[et._id_room] || 0;
    if (count <= 1) {
      delete rooms[et._id_room];
      et._socket.leave(et._id_room);
      return;
    }
    rooms[et._id_room] = count - 1;
  }

  async destroy() {
    const et = this;
    if (et._destroyed) {
      return;
    }
    et._destroyed = true;
    const releasedUpdates = [];
    const geometryLock = await et.getGeometryEditLock();
    if (et.isGeometryEditLockOwner(geometryLock)) {
      await et.releaseGeometryEditLock();
      releasedUpdates.push({
        type: "geometry_edit_lock",
        action: "release",
        lock: null,
      });
    }
    const tableLock = await getLock(et._id_table, "table");
    if (isLockOwner(tableLock, et._id_session)) {
      await releaseLock(et._id_table, "table", et._id_session);
      releasedUpdates.push({
        type: "lock_table",
        lock: false,
      });
    }
    if (releasedUpdates.length > 0) {
      et.emitRoom(events.server_dispatch, {
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        update_state: true,
        updates: releasedUpdates,
      });
    }
    et.leaveRoom();
    const members = await et.getMembers();

    et.emitRoom(events.server_member_exit, {
      id_socket: et._socket.id,
      roles: et._user_roles,
      members: members,
    });

    et._socket.off(events.client_exit, et.onExit);
    et._socket.off(events.client_edit_updates, et.onUpdate);
    et._socket.off(events.client_geom_validate, et.onValidate);
    et._socket.off(events.client_changes_sanitize, et.onSanitize);
    et._socket.off(events.client_get, et.onGet);
    et._socket.off(events.client_lock_refresh, et.onLockRefresh);
    et._socket.off("disconnect", et.onDisconnect);
  }

  /**
   * Socket gone without clean exit ( crash, tab closed, network loss ) :
   * same cleanup as an explicit exit. Locks owned by this session are
   * released now; if this handler never runs ( api crash ), the lock TTL
   * is the safety net.
   */
  onDisconnect() {
    const et = this;
    et.destroy().catch((e) => {
      console.error("Edit session disconnect cleanup failed", e);
    });
  }

  /**
   * Client heartbeat : keep owned locks alive during long, otherwise
   * silent, edit sessions ( e.g. hours in the geometry editor )
   */
  async onLockRefresh(message, callback) {
    const et = this;
    if (message.id_session !== et._id_session) {
      return;
    }
    await et.refreshOwnedLocks();
    if (typeof callback === "function") {
      callback(true);
    }
  }

  dispatch(message) {
    const et = this;
    if (message._include_sender) {
      et.emitAll(events.server_dispatch, message);
    } else {
      et.emitRoom(events.server_dispatch, message);
    }
  }

  onExit(message, callback) {
    const et = this;
    if (message.id_session !== et._id_session) {
      return;
    }
    et.destroy();
    callback(true);
  }

  async onValidate(message, callback) {
    const et = this;
    try {
      if (et.busy) {
        return;
      }
      et.setBusy(true);
      et.progressAll({ init: true });
      const out = await isLayerValid({
        idLayer: et._id_table,
        useCache: message.use_cache,
        autoCorrect: message.autoCorrect,
        analyze: message.analyze,
        validate: message.validate,
        onProgress: et.progressAll,
      });
      callback(out);
    } catch (e) {
      et.error("Validation failed. Check logs", e);
      callback(false);
    } finally {
      et.progressAll({ percent: 0 });
      et.setBusy(false);
    }
  }

  async onGet(message, callback) {
    const et = this;
    try {
      if (message.id_session && message.id_session !== et._id_session) {
        return;
      }
      switch (message.type) {
        case "lock_table": {
          const locked = await getLock(et._id_table, "table");
          return callback(!!locked);
        }
        case "geometry_edit_lock": {
          return callback(await et.getGeometryEditLock());
        }
        case "geometry_info": {
          const hasGeom = await columnExists(cols.geom, et._id_table);
          return callback(
            hasGeom ? await getGeometryColumnInfo(et._id_table) : false
          );
        }
        case "columns_used": {
          const data = await getLayerUsedAttributes(et._id_table);
          return callback(data);
        }
        case "table_views": {
          const data = await getViewsTableBySource(
            et._id_table,
            et._id_project
          );
          return callback(data);
        }
        case "feature": {
          const data = await getFeatureByGid(et._id_table, message.gid);
          return callback(data);
        }
      }
    } catch (e) {
      et.error("Get handler failed. Check logs", e);
    }
    return callback(false);
  }

  async onSanitize(message, callback) {
    const et = this;
    try {
      const updates = await sanitizeUpdates(message.updates);
      callback(updates);
    } catch (e) {
      et.error("Sanitize failed. Check logs", e);
      callback(false);
    }
  }

  progress(messageProgress, all) {
    const et = this;

    if (messageProgress?.init) {
      messageProgress = { percent: def.start_percent };
    }
    if (all) {
      et.emitAll(events.server_progress, messageProgress);
    } else {
      et.emit(events.server_progress, messageProgress);
    }
  }

  progressAll(messageProgress) {
    const et = this;
    return et.progress(messageProgress, true);
  }

  onProgress(message, callback) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    et.progressAll(message);
    callback(true);
  }

  async onUpdate(message, callback) {
    const et = this;
    try {
      if (message.id_session && message.id_session !== et._id_session) {
        return;
      }
      if (message.id_table !== et._id_table) {
        callback(false);
        return;
      }
      if (message.write_db) {
        const written = await et.write(message);
        if (!written) {
          callback(false);
          return;
        }
      }
      if (message.update_state) {
        const updated = await et.updateState(message);
        if (!updated) {
          callback(false);
          return;
        }
      }

      // any accepted activity counts as a heartbeat for owned locks
      await et.refreshOwnedLocks();

      et.dispatch(message);
    } catch (e) {
      callback(false);
      et.error("Update error", e);
      return;
    }
    callback(true);
  }

  async updateState(message) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    const updates = message?.updates;
    if (isEmpty(updates)) {
      return;
    }
    let ok = true;
    for (const update of updates) {
      switch (update.type) {
        case "lock_table":
          if (update.lock) {
            const lock = await acquireLock({
              idTable: et._id_table,
              scope: "table",
              idSession: et._id_session,
              idUser: et._id_user,
            });
            ok = !!lock && ok;
          } else {
            // only the owner ( or a free lock ) can be released :
            // a joining client can no longer clear someone else's batch lock
            ok = (await releaseLock(et._id_table, "table", et._id_session)) && ok;
          }
          break;
        case "geometry_edit_lock":
          if (update.action === "acquire") {
            ok = (await et.acquireGeometryEditLock(update)) && ok;
          }
          if (update.action === "release") {
            ok = (await et.releaseGeometryEditLock()) && ok;
            update.lock = null;
          }
          break;
      }
    }
    return ok;
  }

  async write(message) {
    const et = this;
    et.perf("write");
    const updates = message?.updates;
    if (isEmpty(updates)) {
      return;
    }
    const allowed = await et.isAllowed(message);
    if (!allowed) {
      et.error("Not allowed");
      return false;
    }
    await writeUpdates(et, message);
    et.perfEnd("write");
    return true;
  }

  async sendTable() {
    const et = this;
    et.perf("sendTable");
    try {
      et.progress({ init: true });
      const hasGeom = await columnExists(cols.geom, et._id_table);
      const validation = {};
      if (hasGeom) {
        Object.assign(
          validation,
          // id, useCache, autoCorrect, analyze, validate;
          await isLayerValid(et._id_table, true, false, false, false)
        );
      }
      const pgRes = await getSourceAttributeTable({
        id: et._id_table,
        fullTable: true,
        dateAsString: true,
        jsonAsString: true,
        arrayAsString: true,
      });
      const data = pgRes.rows;
      const nRow = pgRes.rowCount;
      if (hasGeom) {
        await addGeometryStatusToRows(et._id_table, data);
      }
      const attributes = pgRes.fields
        .map((f) => f.name)
        .filter((name) => name !== cols.geom_status);
      const types = await getColumnsTypesSimple(et._id_table, attributes, [
        cols.geom,
        cols.geom_status,
      ]);
      const title = await getLayerTitle(et._id_table);
      const locked = !!(await getLock(et._id_table, "table"));
      const geometryEditLock = await et.getGeometryEditLock();
      const columnsOrderSaved = await getMxSourceData(et._id_table, [
        "settings",
        "editor",
        "columns_order",
      ]);
      const columnsOrder = !columnsOrderSaved ? false : columnsOrderSaved;

      const table = {
        columnsOrder,
        hasGeom,
        geomType: hasGeom ? await getGeometryTypeSimple(et._id_table) : null,
        validation,
        types,
        title,
        locked,
        geometryEditLock,
      };

      const iL = Math.ceil(nRow / def.size_chunk);
      for (let i = 0; i < iL; i++) {
        if (et._destroyed) {
          return;
        }
        table.nParts = iL;
        table.part = i + 1;
        table.start = i === 0;
        table.end = i === iL - 1;
        table.data = data.splice(0, def.size_chunk);
        et.progress({ percent: table.part / table.nParts });
        et.emit(events.server_table_data, table);
      }

      et.perfEnd("sendTable");
    } catch (e) {
      console.error(e);
    } finally {
      et.progress({ percent: 0 });
    }
  }

  /**
   * Emit to user
   */
  emit(type, data) {
    const et = this;
    et._socket.emit(type, et.message_formater(data));
  }

  /**
   * Emit to other
   */
  emitRoom(type, data) {
    const et = this;
    et._socket.to(et._id_room).emit(type, et.message_formater(data));
  }

  /**
   * Emit to concurent table user
   */
  emitAll(type, data) {
    const et = this;
    et.emit(type, data);
    et.emitRoom(type, data);
  }

  /**
   * Emit to every client, even static, including sender
   * -> not limited to table editor session
   * -> coupled with wsHanders
   */
  emitSpread(type, data) {
    const et = this;
    et._socket.mx_emit_ws_global(type, data);
  }

  /**
   * Check if user is allowed to edit
   * @param {Object} message Optional message, as defined in message_formater
   * @param {Boolean} useCache = false, table rights check EACH TIME
   */
  async isAllowed(message) {
    const et = this;
    try {
      const idTable = message?.id_table || et._id_table;
      const isAuthenticated = et._is_authenticated;
      const idUser = et._id_user;
      const ttl = 15 * 60 * 1000; // 15 minutes;
      const now = Date.now();

      if (!isAuthenticated) {
        return false;
      }

      const validUntil = et._tables_allowed.get(idTable);
      if (validUntil && now < validUntil) {
        return true;
      }
      const allowed = await isUserAllowedToEditSource({
        idTable,
        isAuthenticated,
        idUser,
        rolesGroup: et._user_roles?.group || [],
      });
      if (allowed) {
        et._tables_allowed.set(idTable, now + ttl);
        return true;
      }
    } catch (e) {
      et.error("Error during authentication", e);
    }
    return false;
  }

  message_formater(data) {
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
    };
    return m;
  }

  async updateAltStyleClient(idTable) {
    const et = this;
    const socket = et._socket;
    if (!isSourceId(idTable)) {
      return;
    }
    /**
     * Update SLD + save
     */
    await ioUpdateDbViewsAltStyleBySource(socket, {
      idSource: idTable,
    });

    return true;
  }

}
