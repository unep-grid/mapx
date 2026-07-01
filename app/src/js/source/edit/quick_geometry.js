import { ws } from "../../mx.js";
import { isEmpty, isString } from "../../is_test/index.js";
import { makeId } from "../../mx_helper_misc.js";

const events = {
  server_joined: "/server/source/edit/table/joined",
  server_error: "/server/source/edit/table/error",
  client_get: "/client/get",
  client_edit_start: "/client/source/edit/table",
  client_edit_status: "/client/source/edit/table/status",
  client_edit_updates: "/client/source/edit/table/update",
  client_exit: "/client/source/edit/table/exit",
};

const defaults = {
  id_table: null,
  timeout_emit: 1e3 * 60,
  timeout_emit_short: 1e3,
};

export class QuickGeometryEditSession {
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
    const qg = this;
    qg._config = Object.assign({}, defaults, config);
    qg._id = makeId();
    qg._id_table = qg._config.id_table;
    qg._id_room = `room/source/edit/table/${qg._id_table}`;
    qg._id_session = null;
    qg._members = [];
    qg._socket = ws.socket;
    qg.onJoined = qg.onJoined.bind(qg);
    qg.onServerError = qg.onServerError.bind(qg);
  }

  async init() {
    const qg = this;
    if (qg._initialized) {
      return true;
    }
    qg._socket.on(events.server_joined, qg.onJoined);
    qg._socket.on(events.server_error, qg.onServerError);

    const joined = new Promise((resolve, reject) => {
      qg._resolve_joined = resolve;
      qg._reject_joined = reject;
    });

    await ws.emitAsync(
      events.client_edit_start,
      {
        id_table: qg._id_table,
        send_table: false,
        lightweight: true,
      },
      qg._config.timeout_emit,
    );

    await Promise.race([
      joined,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Quick edit session timeout")), 5000);
      }),
    ]);
    qg._initialized = true;
    return true;
  }

  async getFeature(gid) {
    const qg = this;
    return qg.emitGet({
      type: "feature",
      gid,
    });
  }

  async getTableViews() {
    const qg = this;
    return qg.emitGet({
      type: "table_views",
    });
  }

  async getGeometryEditLock() {
    const qg = this;
    return qg.emitGet({
      type: "geometry_edit_lock",
    });
  }

  async isGeometryEditLocked() {
    const qg = this;
    const lock = await qg.getGeometryEditLock();
    return !!lock?.locked && lock.id_session !== qg._id_session;
  }

  async acquireGeometryEditLock(gid) {
    const qg = this;
    return ws.emitAsync(
      events.client_edit_updates,
      qg.message({
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        update_state: true,
        updates: [
          {
            type: "geometry_edit_lock",
            action: "acquire",
            mode: "quick",
            gid,
          },
        ],
      }),
      qg._config.timeout_emit,
    );
  }

  async releaseGeometryEditLock() {
    const qg = this;
    return ws.emitAsync(
      events.client_edit_updates,
      qg.message({
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        update_state: true,
        updates: [
          {
            type: "geometry_edit_lock",
            action: "release",
          },
        ],
      }),
      qg._config.timeout_emit,
    );
  }

  async withGeometryEditLock(gid, callback) {
    const qg = this;
    await qg.assertEditable();
    const lockAccepted = await qg.acquireGeometryEditLock(gid);
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
        await qg.releaseGeometryEditLock();
      } catch (e) {
        console.error(e);
        if (!callbackError) {
          throw e;
        }
      }
    }
  }

  async isTableLocked() {
    const qg = this;
    return !!(await qg.emitGet({
      type: "lock_table",
    }));
  }

  hasConcurrentMembers() {
    const qg = this;
    return qg._members.length > 1;
  }

  async isEditLocked() {
    const qg = this;
    return (await qg.isTableLocked()) || (await qg.isGeometryEditLocked());
  }

  async assertEditable() {
    const qg = this;
    if (await qg.isEditLocked()) {
      throw new Error("This table is already being edited.");
    }
  }

  async updateGeometry(gid, geometry) {
    const qg = this;
    return ws.emitAsync(
      events.client_edit_updates,
      qg.message({
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        write_db: true,
        updates: [
          {
            type: "update_geom",
            id_table: qg._id_table,
            gid,
            geom: geometry,
          },
        ],
      }),
      qg._config.timeout_emit,
    );
  }

  async emitGet(message) {
    const qg = this;
    return ws.emitAsync(
      events.client_get,
      qg.message(message),
      qg._config.timeout_emit,
    );
  }

  message(data) {
    const qg = this;
    if (isEmpty(data)) {
      data = {};
    }
    if (isString(data)) {
      data = { message: data };
    }
    return {
      id_table: qg._id_table,
      id_room: qg._id_room,
      id_session: qg._id_session,
      ...data,
    };
  }

  onJoined(message) {
    const qg = this;
    if (message.id_room !== qg._id_room || qg._id_session) {
      return;
    }
    qg._id_session = message.id_session;
    qg._members = message.members || [];
    qg._resolve_joined?.(message);
  }

  onServerError(message) {
    const qg = this;
    if (message.id_room !== qg._id_room) {
      return;
    }
    const err = new Error(message.message || "Quick edit session failed");
    err.detail = message.error;
    qg._reject_joined?.(err);
  }

  async destroy() {
    const qg = this;
    if (qg._destroyed) {
      return;
    }
    qg._destroyed = true;
    try {
      if (qg._id_session) {
        await ws.emitAsync(
          events.client_exit,
          qg.message(),
          qg._config.timeout_emit_short,
        );
      }
    } catch (e) {
      console.error(e);
    }
    qg._socket.off(events.server_joined, qg.onJoined);
    qg._socket.off(events.server_error, qg.onServerError);
  }
}
