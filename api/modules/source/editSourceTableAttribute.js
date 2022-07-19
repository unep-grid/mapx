import { getColumnsTypesSimple } from "#mapx/db-utils";
import { getSourceAttributeTable } from "#mapx/source";
import { randomString } from "#mapx/helpers";
import { isEmpty, isString } from "@fxi/mx_valid";

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

class EditTableSession {
  constructor(socket, config) {
    const et = this;
    et._socket = socket;
    et._config = config;
    et.onUpdate = et.onUpdate.bind(et);
    et.onExit = et.onExit.bind(et);
  }

  async init() {
    const et = this;
    /**
     * Setup session
     */
    et._id_session = randomString("mx_edit_table");
    et._id_table = et._config.id_table;
    et._id_room = `room/edit_table/${et._id_table}`;
    et._socket.join(et._id_room);

    /**
     * Listen for events
     */
    et._socket.on("/client/edit_table/update", et.onUpdate);
    et._socket.on("/client/edit_table/exit", et.onExit);

    /**
     * Signal join
     */
    et.emit("/server/edit_table/joined", { id_room: et._id_room });
    et.emitRoom("/server/edit_table/new_member", {
      id_socket: et._socket.id,
      roles: et._socket._mx_user_roles,
    });

    /*
     * Initial table send
     */
    await et.sendTable();
  }

  destroy() {
    const et = this;
    et._socket.off("/client/edit_table/update", et.onUpdate);
    et._socket.off("/client/edit_table/exit", et.onExit);
    et._socket.leave(et._id_room);
  }

  dispatch(message) {
    const et = this;
    et.emitRoom("/server/edit_table/dispatch", et.message_formater(message));
  }

  onExit(message) {
    const et = this;
    if (message.id_session !== et._id_session) {
      return;
    }
    et.destroy();
    console.log(message);
  }

  onUpdate(message) {
    const et = this;
    if (message.id_session !== et._id_session) {
      return;
    }
    et.dispatch(message);
    et.write(message);
  }

  write(message) {
    console.log("Write to postgres", message);
  }

  async sendTable() {
    const et = this;
    const pgRes = await getSourceAttributeTable({
      id: et._id_table,
      fullTable: true,
    });
    const data = pgRes.rows;
    const attributes = pgRes.fields.map((f) => f.name);
    const types = await getColumnsTypesSimple(et._id_table, attributes);

    const table = {
      types,
      data,
    };

    et.emit("/server/edit_table/full_table", et.message_formater(table));
  }

  emit(type, data) {
    const et = this;
    et._socket.emit(type, et.message_formater(data));
  }

  emitRoom(type, data) {
    const et = this;
    et._socket.to(et._id_room).emit(type, et.message_formater(data));
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
      id_table: et._id_table,
      id_room: et._id_room,
      id_session: et._id_session,
      ...data,
    };
    return m;
  }
}
