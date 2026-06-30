import {
  tableExists,
  columnExists,
  columnsExist,
  getColumnsTypesSimple,
  getLayerTitle,
  getLayerUsedAttributes,
  getTableDimension,
  isLayerValid,
  sanitizeUpdates,
  renameTableColumn,
  duplicateTableColumn,
  removeTableColumn,
  addTableColumn,
  setMxSourceData,
  getMxSourceData,
  updateMxSourceTimestamp,
  // update metadata
  renameColumnMetadata,
  addColumnMetadata,
  getColumnCells,
  duplicateColumnMetadata,
  removeColumnMetadata,
  updateTableCellByGid,
  updateViewsAttributeBatch,
  deleteRowByGid,
  updateLayerExtentMeta,
} from "#mapx/db_utils";
import {
  getSourceAttributeTable,
  getSourceEditors,
  updateJoinColumnsNames,
} from "#mapx/source";
import { randomString } from "#mapx/helpers";
import {
  isEmpty,
  isNumeric,
  isString,
  isSourceId,
  isSafeName,
} from "@fxi/mx_valid";
import { pgWrite, redisSetJSON, redisGetJSON } from "#mapx/db";
import { toPgColumn } from "#mapx/helpers";
import {
  ioUpdateDbViewsAltStyleBySource,
  getViewsTableBySource,
} from "#mapx/view";

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

const def = {
  start_percent: 0.001, //initial progress value ( 0 remove it )
  log_perf: false,
  max_rows: 1e5,
  max_columns: 1000, // should match client
  size_chunk: 1e3,
  col_geom: "geom",
  col_gid: "gid",
  col_geom_status: "__mx_geom_status",
};

export const events = {
  /**
   * from client
   */
  client_edit_updates: "/client/source/edit/table/update",
  client_exit: "/client/source/edit/table/exit",
  client_geom_validate: "/client/source/edit/table/geom/validate",
  client_value_validate: "/client/source/edit/table/value/validate",
  client_changes_sanitize: "/client/source/edit/table/changes/sanitize",
  client_get: "/client/get",
  /**
   * from here server
   */
  server_joined: "/server/source/edit/table/joined",
  server_error: "/server/source/edit/table/error",
  server_new_member: "/server/source/edit/table/new_member",
  server_member_exit: "/server/source/edit/table/member_exit",
  server_table_data: "/server/source/edit/table/data",
  server_dispatch: "/server/source/edit/table/dispatch",
  server_progress: "/server/source/edit/table/progress",
  /**
   *
   * server broaddcast / spread
   */
  server_spread_views_update: "/server/spread/views/update",
  server_spread_join_editor_update: "/server/spread/join_editor/update",
};

function quoteId(id) {
  return `"${id}"`;
}

function normalizeGeometry(geometry) {
  if (isEmpty(geometry)) {
    return null;
  }
  if (geometry?.type === "Feature") {
    return geometry.geometry || null;
  }
  return geometry;
}

function toGeomTypeSimple(type) {
  const t = `${type || ""}`.toLowerCase();
  if (t.includes("point")) {
    return "point";
  }
  if (t.includes("line")) {
    return "line";
  }
  if (t.includes("polygon")) {
    return "polygon";
  }
  return null;
}

async function getGeometryColumnInfo(idTable, client = pgWrite) {
  const res = await client.query(
    `
    SELECT type, srid
    FROM geometry_columns
    WHERE f_table_schema = 'public'
      AND f_table_name = $1
      AND f_geometry_column = $2
    LIMIT 1
    `,
    [idTable, def.col_geom]
  );
  const row = res.rows[0] || {};
  return {
    type: row.type || "GEOMETRY",
    srid: row.srid || 4326,
    simpleType: toGeomTypeSimple(row.type),
  };
}

async function getGeometryTypeSimple(idTable, client = pgWrite) {
  const columnInfo = await getGeometryColumnInfo(idTable, client);
  if (columnInfo.simpleType) {
    return columnInfo.simpleType;
  }
  const res = await client.query(
    `
    SELECT ST_GeometryType(${quoteId(def.col_geom)}) AS geom_type
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(def.col_geom)} IS NOT NULL
      AND NOT ST_IsEmpty(${quoteId(def.col_geom)})
    LIMIT 1
    `
  );
  return toGeomTypeSimple(res.rows[0]?.geom_type) || "polygon";
}

function getGeomSqlExpression(type) {
  const t = `${type || ""}`.toUpperCase();
  const base = `ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)`;
  if (t.startsWith("MULTI")) {
    return `ST_Multi(${base})`;
  }
  return base;
}

function getGeomStatusSql() {
  return `
    CASE
      WHEN ${quoteId(def.col_geom)} IS NULL THEN 'null'
      WHEN ST_IsEmpty(${quoteId(def.col_geom)}) THEN 'empty'
      ELSE 'present'
    END AS ${quoteId(def.col_geom_status)}
  `;
}

async function getFeatureByGid(idTable, gid, client = pgWrite) {
  if (!isSourceId(idTable) || !isNumeric(gid)) {
    throw new Error("Invalid feature request");
  }
  const columns = await getColumnsTypesSimple(idTable, null, [def.col_geom]);
  const names = columns
    .map((c) => c.column_name)
    .filter((name) => name !== def.col_geom_status);
  const selectColumns = toPgColumn(names);
  const hasGeom = await columnExists(def.col_geom, idTable, client);
  const geomSelect = hasGeom
    ? `,
      ${getGeomStatusSql()},
      ST_AsGeoJSON(${quoteId(def.col_geom)})::json AS geom`
    : "";
  const res = await client.query(
    `
    SELECT ${selectColumns}${geomSelect}
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(def.col_gid)} = $1
    LIMIT 1
    `,
    [gid]
  );
  if (res.rowCount !== 1) {
    throw new Error("Feature not found");
  }
  return res.rows[0];
}

async function addGeometryStatusToRows(idTable, rows, client = pgWrite) {
  if (isEmpty(rows)) {
    return rows;
  }
  const gids = rows.map((row) => row[def.col_gid]).filter(isNumeric);
  if (isEmpty(gids)) {
    return rows;
  }
  const res = await client.query(
    `
    SELECT ${quoteId(def.col_gid)}, ${getGeomStatusSql()}
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(def.col_gid)} = ANY($1::int[])
    `,
    [gids]
  );
  const statusByGid = new Map(
    res.rows.map((row) => [row[def.col_gid], row[def.col_geom_status]])
  );
  for (const row of rows) {
    row[def.col_geom_status] = statusByGid.get(row[def.col_gid]) || "null";
  }
  return rows;
}

async function insertTableRow(idTable, geometry, client = pgWrite) {
  if (!isSourceId(idTable)) {
    throw new Error("Invalid table");
  }
  const hasGeom = await columnExists(def.col_geom, idTable, client);
  const columnsSql = [];
  const valuesSql = [];
  const params = [];

  const geom = normalizeGeometry(geometry);
  if (hasGeom && !isEmpty(geom)) {
    const columnInfo = await getGeometryColumnInfo(idTable, client);
    columnsSql.push(quoteId(def.col_geom));
    params.push(JSON.stringify(geom));
    valuesSql.push(getGeomSqlExpression(columnInfo.type).replaceAll("$1", `$${params.length}`));
  }

  let res;
  if (columnsSql.length === 0) {
    res = await client.query(
      `INSERT INTO ${quoteId(idTable)} DEFAULT VALUES RETURNING ${quoteId(def.col_gid)}`
    );
  } else {
    res = await client.query(
      `
      INSERT INTO ${quoteId(idTable)} (${columnsSql.join(", ")})
      VALUES (${valuesSql.join(", ")})
      RETURNING ${quoteId(def.col_gid)}
      `,
      params
    );
  }

  const gid = res.rows[0]?.[def.col_gid];
  return getFeatureByGid(idTable, gid, client);
}

async function updateFeatureGeometry(idTable, gid, geometry, client = pgWrite) {
  if (!isSourceId(idTable) || !isNumeric(gid)) {
    throw new Error("Invalid geometry update");
  }
  const hasGeom = await columnExists(def.col_geom, idTable, client);
  if (!hasGeom) {
    throw new Error("Table has no geometry column");
  }
  const geom = normalizeGeometry(geometry);
  if (isEmpty(geom)) {
    await client.query(
      `
      UPDATE ${quoteId(idTable)}
      SET ${quoteId(def.col_geom)} = NULL
      WHERE ${quoteId(def.col_gid)} = $1
      `,
      [gid]
    );
  } else {
    const columnInfo = await getGeometryColumnInfo(idTable, client);
    const geomSql = getGeomSqlExpression(columnInfo.type);
    await client.query(
      `
      UPDATE ${quoteId(idTable)}
      SET ${quoteId(def.col_geom)} = ${geomSql}
      WHERE ${quoteId(def.col_gid)} = $2
      `,
      [JSON.stringify(geom), gid]
    );
  }
  return getFeatureByGid(idTable, gid, client);
}

class EditTableSession {
  constructor(socket, config) {
    const et = this;
    const session = socket.session;
    et._socket = socket;
    et._io = et._socket.server;
    et._config = config;
    et._perf = {};
    et._tables = [];
    et._is_authenticated = session.user_authenticated || false;
    et._is_busy = false;
    et._id_user = session.user_id;
    et._id_project = session.project_id;
    et._user_roles = session.user_roles;
    et.onUpdate = et.onUpdate.bind(et);
    et.onExit = et.onExit.bind(et);
    et.onValidate = et.onValidate.bind(et);
    et.onSanitize = et.onSanitize.bind(et);
    et.onGet = et.onGet.bind(et);
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

  async setState(key, value) {
    const et = this;
    try {
      const id = `${et._id_table}:state:${key}`;
      await redisSetJSON(id, value);
    } catch (err) {
      et.error("Set state error", err);
    }
  }
  async getState(key) {
    const et = this;
    try {
      const id = `${et._id_table}:state:${key}`;
      return redisGetJSON(id);
    } catch (err) {
      et.error("Set state error", err);
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
    et._socket.join(et._id_room);

    /**
     * Listen for events
     */
    et._socket.on(events.client_exit, et.onExit);
    et._socket.on(events.client_edit_updates, et.onUpdate);
    et._socket.on(events.client_geom_validate, et.onValidate);
    et._socket.on(events.client_changes_sanitize, et.onSanitize);
    et._socket.on(events.client_get, et.onGet);

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

  async destroy() {
    const et = this;
    if (et._destroyed) {
      return;
    }
    et._destroyed = true;
    et._socket.leave(et._id_room);
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
      if (message.id_table !== et._id_table) {
        callback(false);
        return;
      }
      if (message.id_session && message.id_session !== et._id_session) {
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
        et.updateState(message);
      }

      et.dispatch(message);
    } catch (e) {
      callback(false);
      et.error("Update error", e);
      return;
    }
    callback(true);
  }

  updateState(message) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    const updates = message?.updates;
    if (isEmpty(updates)) {
      return;
    }
    for (const update of updates) {
      switch (update.type) {
        case "lock_table":
          et.setState("lock_table", !!update.lock);
          break;
      }
    }
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
    await et.writePostgres(message);
    et.perfEnd("write");
    return true;
  }

  async sendTable() {
    const et = this;
    et.perf("sendTable");
    try {
      et.progress({ init: true });
      const hasGeom = await columnExists(def.col_geom, et._id_table);
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
        .filter((name) => name !== def.col_geom_status);
      const types = await getColumnsTypesSimple(et._id_table, attributes, [
        "geom",
        def.col_geom_status,
      ]);
      const title = await getLayerTitle(et._id_table);
      const locked = await et.getState("lock_table");
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
      let isGroupMember = false;

      if (!isAuthenticated) {
        return false;
      }

      if (et._tables.includes(idTable) && now < et._table_cache_time_limit) {
        return true;
      }
      const sourceData = await getSourceEditors(idTable);
      const isEditor = sourceData.editor === idUser;
      const rolesGroup = et._user_roles?.group;
      for (const group of sourceData.editors) {
        if (!isGroupMember) {
          isGroupMember = rolesGroup.includes(group);
        }
      }
      if (isEditor || isGroupMember) {
        et._tables.push(idTable);
        et._table_cache_time_limit = now + ttl;
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

  async writePostgres(message) {
    const et = this;
    const { updates } = message;
    if (isEmpty(updates)) {
      return;
    }
    const postScripts = new Map();
    const tables_update = new Set();
    const client = await pgWrite.connect();
    await client.query("BEGIN");

    try {
      for (const update of updates) {
        const { id_table, column_name, column_name_new } = update;

        if (!isSourceId(id_table)) {
          throw new Error("Invalid update table or column");
        }

        switch (update.type) {
          case "order_columns":
            {
              const { columns_order } = update;

              const colsExist = await columnsExist(
                columns_order,
                id_table,
                client
              );

              if (!colsExist) {
                console.warn("Invalid columns", columns_order);
                return;
              }

              await setMxSourceData(
                id_table,
                ["settings", "editor", "columns_order"],
                columns_order
              );
            }
            break;
          case "update_cell":
            {
              const { gid, column_type } = update;

              if (!isSafeName(column_name)) {
                throw new Error("Invalid update column");
              }

              let { value_new } = update;
              const valid = isNumeric(gid);
              const colExists = await columnExists(
                column_name,
                id_table,
                client
              );

              if (valid && colExists) {
                await updateTableCellByGid(
                  id_table,
                  gid,
                  column_name,
                  column_type,
                  value_new,
                  client
                );

                tables_update.add(id_table);
              }
            }
            break;
          case "add_column":
            {
              const { column_type, is_identity } = update;
              const colExists = await columnExists(
                column_name,
                id_table,
                client
              );

              if (!isSafeName(column_name)) {
                throw new Error("Invalid update column");
              }

              if (!colExists) {
                await addTableColumn(
                  id_table,
                  column_name,
                  column_type,
                  is_identity,
                  client
                );

                await addColumnMetadata(id_table, column_name, client);

                tables_update.add(id_table);

                if (is_identity) {
                  update._column_config = {
                    type: await getColumnsTypesSimple(id_table, column_name),
                    rows: await getColumnCells(id_table, column_name, client),
                  };
                  message._include_sender = true;
                }
              }
            }
            break;
          case "remove_column":
            {
              const colExists = await columnExists(
                column_name,
                id_table,
                client
              );

              if (colExists) {
                await removeTableColumn(id_table, column_name, client);
                await removeColumnMetadata(id_table, column_name, client);
                tables_update.add(id_table);
              }
            }
            break;
          case "duplicate_column":
            {
              await duplicateTableColumn(
                id_table,
                column_name,
                column_name_new,
                client
              );

              await duplicateColumnMetadata(
                id_table,
                column_name,
                column_name_new
              );

              tables_update.add(id_table);
            }
            break;
          case "rename_column":
            {
              /**
               * Table and metadata
               */
              await renameTableColumn(
                id_table,
                column_name,
                column_name_new,
                client
              );

              await renameColumnMetadata(
                id_table,
                column_name,
                column_name_new,
                client
              );
              tables_update.add(id_table);

              /**
               * Update joins
               */
              const updates = await updateJoinColumnsNames(
                id_table,
                column_name,
                column_name_new,
                client
              );

              /**
               * Update views's attribute
               * considering source update and join updates
               */
              const updateSourceViews = {
                id_source: id_table,
                old_column: column_name,
                new_column: column_name_new,
              };
              updates.push(updateSourceViews);

              const views = await updateViewsAttributeBatch(updates, client);

              postScripts.set(
                `${id_table}_update_views_rename_rename`,
                async () => {
                  et.emitSpread(events.server_spread_views_update, {
                    views,
                  });
                  et.emitSpread(events.server_spread_join_editor_update, {
                    source_columns_rename: updates,
                  });
                  await et.updateAltStyleClient(id_table);
                  return;
                }
              );
            }
            break;
          case "remove_rows":
            {
              const { id_rows } = update;
              await deleteRowByGid(id_table, id_rows);
              await updateLayerExtentMeta(id_table);
              tables_update.add(id_table);
            }
            break;
          case "add_row":
            {
              const row = await insertTableRow(
                id_table,
                update.geom,
                client
              );
              update.row = row;
              update.gid = row.gid;
              message._include_sender = true;
              postScripts.set(`${id_table}_update_extent_add_row`, async () => {
                try {
                  await updateLayerExtentMeta(id_table);
                } catch (e) {
                  console.warn("Unable to update layer extent", e.message);
                }
              });
              tables_update.add(id_table);
            }
            break;
          case "update_geom":
            {
              const row = await updateFeatureGeometry(
                id_table,
                update.gid,
                update.geom,
                client
              );
              update.row = row;
              update[def.col_geom_status] = row[def.col_geom_status];
              message._include_sender = true;
              postScripts.set(`${id_table}_update_extent_update_geom`, async () => {
                try {
                  await updateLayerExtentMeta(id_table);
                } catch (e) {
                  console.warn("Unable to update layer extent", e.message);
                }
              });
              tables_update.add(id_table);
            }
            break;

          default:
            throw new Error(
              `Error during write: unknow method: ${update.type}`
            );
        }
      }

      /**
       * Update table date_modifed
       */
      for (const id_table of tables_update) {
        await updateMxSourceTimestamp(id_table, client);
      }

      /**
       * Update done. Commit.
       */

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(e);
    } finally {
      client.release();
    }

    /**
     * Scripts that require to be launched after the commit
     * ( i.e. require updated views, source, meta )
     */
    if (postScripts.size) {
      for (const [key, script] of postScripts.entries()) {
        await script(key);
      }
    }
  }
}
