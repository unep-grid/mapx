import { ws } from "../../mx.js";
import { isEmpty, isString } from "../../is_test/index.js";
import { makeId } from "../../mx_helper_misc.js";

/**
 * Single source of truth for the table edit protocol on the client :
 * event names, room id format, message shape, join/exit handshake and
 * the lock heartbeat. Used by the full table editor and the quick
 * geometry edit session. Server counterpart : api/modules/source/
 * attribute_table/edit.js ( events const ).
 */
export const events = {
  /**
   * client to server
   */
  client_edit_start: "/client/source/edit/table",
  client_edit_status: "/client/source/edit/table/status",
  client_edit_updates: "/client/source/edit/table/update",
  client_exit: "/client/source/edit/table/exit",
  client_geom_validate: "/client/source/edit/table/geom/validate",
  client_value_validate: "/client/source/edit/table/value/validate",
  client_changes_sanitize: "/client/source/edit/table/changes/sanitize",
  client_lock_refresh: "/client/source/edit/table/lock/refresh",
  client_get: "/client/get",
  /**
   * server to client
   */
  server_joined: "/server/source/edit/table/joined",
  server_error: "/server/source/edit/table/error",
  server_new_member: "/server/source/edit/table/new_member",
  server_member_exit: "/server/source/edit/table/member_exit",
  server_table_data: "/server/source/edit/table/data",
  server_dispatch: "/server/source/edit/table/dispatch",
  server_progress: "/server/source/edit/table/progress",
};

export const defaults = {
  id_table: null,
  timeout_emit: 1e3 * 60,
  timeout_emit_short: 1e3,
  timeout_join: 5e3,
  heartbeat_interval: 1e3 * 60, // server lock TTL is 180s : 3 chances to refresh
};

export function roomId(idTable) {
  return `room/source/edit/table/${idTable}`;
}

/**
 * Periodic lock refresh. Keeps server-side owned locks alive during
 * long silent sessions ( e.g. thinking hours in the geometry editor ).
 * Emit errors are swallowed : a missed heartbeat is recoverable ( the
 * TTL allows several misses ) and the session does not always own a lock.
 * @param {Function} emit Async emit of the lock refresh event
 * @param {Number} interval Interval [ms]
 */
export function createLockHeartbeat(emit, interval = defaults.heartbeat_interval) {
  let id = null;
  return {
    start() {
      if (id) {
        return;
      }
      id = setInterval(() => {
        emit().catch(() => {});
      }, interval);
    },
    stop() {
      clearInterval(id);
      id = null;
    },
  };
}

export class EditChannel {
  /**
   * Non-blocking edit status, no room join
   */
  static async getStatus(idTable, timeout = defaults.timeout_emit) {
    return ws.emitAsync(
      events.client_edit_status,
      {
        id_table: idTable,
      },
      timeout,
    );
  }

  static isStatusLocked(status) {
    return !!status?.locked || !!status?.geometryEditLock?.locked;
  }

  constructor(config) {
    const ec = this;
    ec._config = Object.assign({}, defaults, config);
    ec._id = makeId();
    ec._id_table = ec._config.id_table;
    ec._id_room = roomId(ec._id_table);
    ec._id_session = null;
    ec._members = [];
    ec._socket = ws.socket;
    ec._heartbeat = createLockHeartbeat(
      () =>
        ws.emitAsync(
          events.client_lock_refresh,
          ec.message(),
          ec._config.timeout_emit_short,
        ),
      ec._config.heartbeat_interval,
    );
    ec.onJoined = ec.onJoined.bind(ec);
    ec.onServerError = ec.onServerError.bind(ec);
  }

  get id_session() {
    return this._id_session;
  }

  get id_table() {
    return this._id_table;
  }

  /**
   * Join the edit room : server creates the session
   * @param {Object} opt server session options
   * @param {Boolean} opt.send_table Receive the full table data
   * @param {Boolean} opt.lightweight Skip table dimension checks
   */
  async init(opt) {
    const ec = this;
    if (ec._initialized) {
      return true;
    }
    opt = Object.assign({}, { send_table: false, lightweight: true }, opt);
    ec._socket.on(events.server_joined, ec.onJoined);
    ec._socket.on(events.server_error, ec.onServerError);

    const joined = new Promise((resolve, reject) => {
      ec._resolve_joined = resolve;
      ec._reject_joined = reject;
    });

    await ws.emitAsync(
      events.client_edit_start,
      {
        id_table: ec._id_table,
        send_table: opt.send_table,
        lightweight: opt.lightweight,
      },
      ec._config.timeout_emit,
    );

    await Promise.race([
      joined,
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Edit session join timeout")),
          ec._config.timeout_join,
        );
      }),
    ]);
    ec._heartbeat.start();
    ec._initialized = true;
    return true;
  }

  async getFeature(gid) {
    const ec = this;
    return ec.emitGet({
      type: "feature",
      gid,
    });
  }

  async getTableViews() {
    const ec = this;
    return ec.emitGet({
      type: "table_views",
    });
  }

  async getGeometryEditLock() {
    const ec = this;
    return ec.emitGet({
      type: "geometry_edit_lock",
    });
  }

  async isGeometryEditLocked() {
    const ec = this;
    const lock = await ec.getGeometryEditLock();
    return !!lock?.locked && lock.id_session !== ec._id_session;
  }

  async acquireGeometryEditLock(gid) {
    const ec = this;
    return ec.emitUpdatesSingle(
      [
        {
          type: "geometry_edit_lock",
          action: "acquire",
          mode: "quick",
          gid,
        },
      ],
      { update_state: true },
    );
  }

  async releaseGeometryEditLock() {
    const ec = this;
    return ec.emitUpdatesSingle(
      [
        {
          type: "geometry_edit_lock",
          action: "release",
        },
      ],
      { update_state: true },
    );
  }

  async withGeometryEditLock(gid, callback) {
    const ec = this;
    await ec.assertEditable();
    const lockAccepted = await ec.acquireGeometryEditLock(gid);
    if (!lockAccepted) {
      throw new Error("This table is already being edited.");
    }

    let callbackError = null;
    try {
      return await callback();
    } catch (e) {
      callbackError = e;
      throw e;
    } finally {
      try {
        await ec.releaseGeometryEditLock();
      } catch (e) {
        console.error(e);
        if (!callbackError) {
          throw e;
        }
      }
    }
  }

  async isTableLocked() {
    const ec = this;
    return !!(await ec.emitGet({
      type: "lock_table",
    }));
  }

  hasConcurrentMembers() {
    const ec = this;
    return ec._members.length > 1;
  }

  async isEditLocked() {
    const ec = this;
    return (await ec.isTableLocked()) || (await ec.isGeometryEditLocked());
  }

  async assertEditable() {
    const ec = this;
    if (await ec.isEditLocked()) {
      throw new Error("This table is already being edited.");
    }
  }

  async updateGeometry(gid, geometry) {
    const ec = this;
    return ec.emitUpdatesSingle(
      [
        {
          type: "update_geom",
          id_table: ec._id_table,
          gid,
          geom: geometry,
        },
      ],
      { write_db: true },
    );
  }

  /**
   * Emit a single-part updates message
   * @param {Array} updates
   * @param {Object} opt Message flags e.g. {update_state: true} or {write_db: true}
   */
  async emitUpdatesSingle(updates, opt) {
    const ec = this;
    return ws.emitAsync(
      events.client_edit_updates,
      ec.message({
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        ...opt,
        updates,
      }),
      ec._config.timeout_emit,
    );
  }

  async emitGet(message) {
    const ec = this;
    return ws.emitAsync(
      events.client_get,
      ec.message(message),
      ec._config.timeout_emit,
    );
  }

  message(data) {
    const ec = this;
    if (isEmpty(data)) {
      data = {};
    }
    if (isString(data)) {
      data = { message: data };
    }
    return {
      id_table: ec._id_table,
      id_room: ec._id_room,
      id_session: ec._id_session,
      ...data,
    };
  }

  onJoined(message) {
    const ec = this;
    if (message.id_room !== ec._id_room || ec._id_session) {
      return;
    }
    ec._id_session = message.id_session;
    ec._members = message.members || [];
    ec._resolve_joined?.(message);
  }

  onServerError(message) {
    const ec = this;
    if (message.id_room !== ec._id_room) {
      return;
    }
    const err = new Error(message.message || "Edit session failed");
    err.detail = message.error;
    ec._reject_joined?.(err);
  }

  async destroy() {
    const ec = this;
    if (ec._destroyed) {
      return;
    }
    ec._destroyed = true;
    ec._heartbeat.stop();
    try {
      if (ec._id_session) {
        await ws.emitAsync(
          events.client_exit,
          ec.message(),
          ec._config.timeout_emit_short,
        );
      }
    } catch (e) {
      console.error(e);
    }
    ec._socket.off(events.server_joined, ec.onJoined);
    ec._socket.off(events.server_error, ec.onServerError);
  }
}
