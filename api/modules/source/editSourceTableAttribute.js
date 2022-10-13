import {
  tableExists,
  columnExists,
  getTableDimension,
  getColumnsTypesSimple,
  getLayerTitle,
  isLayerValid,
} from "#mapx/db-utils";
import { getSourceAttributeTable, getSourceEditors } from "#mapx/source";
import { randomString } from "#mapx/helpers";
import {
  isEmpty,
  isNumeric,
  isString,
  isSourceId,
  isSafeName,
} from "@fxi/mx_valid";
import { parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { pgWrite, redisSetJSON, redisGetJSON } from "#mapx/db";
import { getUserEmail } from "#mapx/authentication";

/**
 * Triggered by '/client/source/edit/table' in ..api/modules/io/mw_handlers.js
 */
export async function ioEditSource(socket, options) {
  try {
    const et = new EditTableSession(socket, options);
    await et.init();
  } catch (e) {
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

const def = {
  log_perf: false,
  max_rows: 1e6,
  max_columns: 200,
  //threshold_chunk: 1e3,
  threshold_chunk: 20,
  size_chunk: 1e3,
  col_geom: "geom",
};

class EditTableSession {
  constructor(socket, config) {
    const et = this;
    et._socket = socket;
    et._io = et._socket.server;
    et._config = config;
    et._perf = {};
    et._tables = [];
    et._is_authenticated = socket._mx_user_authenticated || false;
    et._id_user = socket._id_user;
    et._id_project = socket._id_project;
    et._user_roles = socket._mx_user_roles || {};
    et.onUpdate = et.onUpdate.bind(et);
    et.onExit = et.onExit.bind(et);
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

    const dim = await getTableDimension(et._id_table);

    if (dim.nrow > def.max_rows) {
      et.error(`Full table: too much rows. ${dim.nrow} > ${def.max_rows} `);
      return;
    }

    if (dim.ncol > def.max_columns) {
      et.error(
        `Full table: too much columns. ${dim.ncol} > ${def.max_columns} `
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
    et._socket.on("/client/source/edit/table/update", et.onUpdate);
    et._socket.on("/client/source/edit/table/exit", et.onExit);

    /*
     * Get list of current members
     */
    const members = await et.getMembers();

    /**
     * Signal join
     */
    et.emit("/server/source/edit/table/joined", {
      id_room: et._id_room,
      id_session: et._id_session,
      members: members,
    });
    et.emitRoom("/server/source/edit/table/new_member", {
      id_socket: et._socket.id,
      roles: et._user_roles,
      members: members,
    });

    if (et._config.send_table) {
      /*
       * Initial table send
       */
      await et.sendTable();
    }
  }

  error(txt, err) {
    const et = this;
    et.emit("/server/source/edit/table/error", {
      message: txt,
      id_room: et._id_room,
    });
    console.error(txt, err);
  }

  async getMembers() {
    const et = this;
    const sockets = await et._io.in(et._id_room).fetchSockets();
    const members = [];
    for (const s of sockets) {
      const member = {
        id: s._id_user,
        email: await getUserEmail(s._id_user),
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

    et.emitRoom("/server/source/edit/table/member_exit", {
      id_socket: et._socket.id,
      roles: et._user_roles,
      members: members,
    });

    et._socket.off("/client/source/edit/table/update", et.onUpdate);
    et._socket.off("/client/source/edit/table/exit", et.onExit);
  }

  dispatch(message) {
    const et = this;
    et.emitRoom("/server/source/edit/table/dispatch", message);
  }

  onExit(message) {
    const et = this;
    if (message.id_session !== et._id_session) {
      return;
    }
    et.destroy();
  }

  onUpdate(message) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    et.dispatch(message);
    if (message.write_db) {
      et.write(message);
    }
    if (message.update_state) {
      et.updateState(message);
    }
  }

  updateState(message) {
    const et = this;
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

  write(message) {
    const et = this;
    et.perf("write");
    const updates = message?.updates;
    if (isEmpty(updates)) {
      return;
    }
    const allowed = et.isAllowed(message);
    if (!allowed) {
      et.error("Not allowed");
      return;
    }
    writePostgres(updates)
      .then(() => {
        et.perfEnd("write");
      })
      .catch((e) => {
        et.error("Update failed. Check logs", e);
      });
  }

  async sendTable() {
    const et = this;
    et.perf("sendTable");
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
    });
    const data = pgRes.rows;
    const nRow = pgRes.rowCount;
    const attributes = pgRes.fields.map((f) => f.name);
    const types = await getColumnsTypesSimple(et._id_table, attributes);
    const title = await getLayerTitle(et._id_table);
    const locked = await et.getState("lock_table");
    const table = {
      hasGeom,
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
      et.emit("/server/source/edit/table/data", table);
    }

    et.perfEnd("sendTable");
  }

  emit(type, data) {
    /**
     * This could be huge.. Compress ?
     */
    const et = this;
    et._socket.emit(type, et.message_formater(data));
  }

  emitRoom(type, data) {
    /**
     * This should be small : updates, test message...
     */
    const et = this;
    et._socket.to(et._id_room).emit(type, et.message_formater(data));
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
}

async function writePostgres(updates) {
  if (isEmpty(updates)) {
    return;
  }
  const client = await pgWrite.connect();
  await client.query("BEGIN");
  try {
    for (const update of updates) {
      const { id_table, column_name, column_name_new } = update;

      if (!isSourceId(id_table) || !isSafeName(column_name)) {
        throw new Error("Invalid update table or column");
      }
      const colExists = await columnExists(column_name, id_table);

      switch (update.type) {
        case "update_cell":
          {
            const { gid, value_new } = update;
            const valid = isNumeric(gid);
            if (valid && colExists) {
              const qSql = parseTemplate(templates.updateTableCellByGid, {
                id_table,
                gid,
                column_name,
              });
              const res = await client.query(qSql, [value_new]);
              if (res.rowCount != 1) {
                throw new Error("Error during update_cell : row affected =! 1");
              }
            }
          }
          break;
        case "add_column":
          {
            /** ALTER TABLE products ADD COLUMN description text; **/
            const { column_type } = update;

            if (!colExists) {
              const qSql = parseTemplate(templates.updateTableAddColumn, {
                id_table,
                column_name,
                column_type,
              });
              const res = await client.query(qSql);
              if (res.rowCount) {
                throw new Error(
                  "Error during add_column : rows affected is not null"
                );
              }
            }
          }
          break;
        case "remove_column":
          {
            if (colExists) {
              /** ALTER TABLE products remove COLUMN description text; **/
              const qSql = parseTemplate(templates.updateTableRemoveColumn, {
                id_table,
                column_name,
              });

              const res = await client.query(qSql);
              if (res.rowCount) {
                throw new Error(
                  "Error during remove_column : rows affected is not null"
                );
              }
            }
          }
          break;
        case "rename_column":
          {
            const colNewExists = await columnExists(column_name_new, id_table);
            if (colExists && !colNewExists) {
              /** ALTER TABLE products remove COLUMN description text; **/
              const qSql = parseTemplate(templates.updateTableRenameColumn, {
                id_table,
                column_name,
                column_name_new,
              });

              const res = await client.query(qSql);
              if (res.rowCount) {
                throw new Error(
                  "Error during remove_column : rows affected is not null"
                );
              }
            }
          }
          break;

        default:
          throw new Error(`Error during write: unknow method: ${update.type}`);
      }
    }

    /**
     * Update done. Commit.
     */
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
