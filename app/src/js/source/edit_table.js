import { modalSimple } from "./../mx_helper_modal.js";
import { el } from "./../el/src/index.js";
import { moduleLoad } from "./../modules_loader_async";
import { getDictItem } from "./../language";
import {
  typeConverter,
  getHandsonLanguageCode,
} from "./../handsontable/utils.js";
import {
  isSourceId,
  isNotEmpty,
  isEmpty,
  isString,
} from "./../is_test/index.js";
import { bindAll } from "./../bind_class_methods";
const defaults = {
  id_table: null,
  ht_license: "non-commercial-and-evaluation",
  routes: {
    server_joined: "/server/edit_table/joined",
    server_new_member: "/server/edit_table/new_member",
    server_full_table: "/server/edit_table/full_table",
    server_dispatch: "/server/edit_table/dispatch",
    client_edit_start: "/client/edit_table/start",
    client_edit_updates: "/client/edit_table/update",
  },
};

export class EditTableSessionClient {
  constructor(socket, config) {
    const et = this;
    et._config = Object.assign({}, defaults, config);
    et._socket = socket;
    et._on_destroy = [];
    bindAll(et);
  }

  async init() {
    const et = this;
    const r = et._config.routes;
    if (et._initialized) {
      return;
    }
    et._initialized = true;
    et._id_table = et._config?.id_table;
    const valid = isSourceId(et._id_table);
    if (!valid) {
      throw new Error("Invalid table id");
    }
    /**
     * ⚠️ ALL INSTANCE WILL LISTEN TO ALL action
     *  -> test in callback and discard unmatched. e.g.
     *     <msg>.id_table != this._id_table
     *  Alternative :
     *   - use name space
     *   - distinct socket
     *   - sync event ID between server and client
     */
    et._socket.on(r.server_joined, et.onJoined);
    et._socket.on(r.server_new_member, et.onNewMember);
    et._socket.on(r.server_full_table, et.initTable);
    et._socket.on(r.server_dispatch, et.onDispatch);
    et._socket.emit(
      r.client_edit_start,
      et.message_formater({ id_table: et._id_table })
    );
    await et.build();
  }

  destroy() {
    const et = this;
    if (et._destroyed) {
      return;
    }
    et._destroyed = true;
    console.log("Edit table : destroy");
    const r = et._config.routes;
    et._modal?.close();
    et._socket.off(r.server_joined, et.onJoined);
    et._socket.off(r.server_new_member, et.onNewMember);
    et._socket.off(r.server_full_table, et.initTable);
    for (const cb of et._on_destroy) {
      cb();
    }
  }

  async build() {
    const et = this;
    et._el_table = el("div", {
      style: {
        width: "100%",
        height: "350px",
        minHeight: "350px",
        minWidth: "100px",
        overflow: "hidden",
        backgroundColor: "var(--mx_ui_shadow)",
      },
    });
    et._el_content = el("div", { class: "mx_handsontable" }, et._el_table);
    et._modal = modalSimple({
      title: "Edit table",
      content: et._el_content,
      addBackground: false,
      onClose: () => {
        et.destroy();
      },
    });
  }

  async initTable(table) {
    const et = this;

    if (table.id_table !== et._id_table) {
      return;
    }

    const handsontable = await moduleLoad("handsontable");
    const columns = table.types || [];
    const labels = table.types.map((t) => t.id);

    /**
     * Convert col format
     */
    for (const col of columns) {
      col.type = typeConverter(col.value);
      col.data = col.id;
      col.readOnly = co.id === "gid" ? true : false;
      delete col.value;
      delete col.id;
    }

    et._ht = new handsontable(et._el_table, {
      columns: columns,
      data: table.data,
      rowHeaders: true,
      columnSorting: true,
      colHeaders: labels,
      licenseKey: et._config.ht_license,
      dropdownMenu: [
        "filter_by_condition",
        "filter_operators",
        "filter_by_condition2",
        "filter_action_bar",
      ],
      filters: true,
      language: getHandsonLanguageCode(),
      afterFilter: null,
      afterChange: et.onChange,
      renderAllRows: false,
      height: function () {
        const r = et._el_table.getBoundingClientRect();
        return r.height - 30;
      },
      disableVisualSelection: false,
    });
  }

  onJoined(message) {
    const et = this;
    if (et._id_session) {
      return;
    }
    console.log("Joined", message);
    et._id_table = message.id_table;
    et._id_room = message.id_room;
    et._id_session = message.id_session;
  }

  onNewMember(message) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    console.log("New member joined", message);
  }

  onDispatch(message) {
    const et = this;
    if (message.id_table !== et._id_table) {
      return;
    }
    if (isNotEmpty(message.updates)) {
      for (const update of message.updates) {
        switch (update.type) {
          case "update_cell":
            {
              const idRow = et._ht.getDataAtProp("gid").indexOf(update.gid);
              et._ht.setDataAtRowProp(idRow, update.column, update.new_value);
            }
            break;
          default:
            console.log(message);
        }
      }
    }
  }

  addDestroyCb(cb) {
    const et = this;
    et._on_destroy.push(cb);
  }

  onChange(changes) {
    if (isEmpty(changes)) {
      return;
    }
    const et = this;
    const updates = [];
    for (const change of changes) {
      /* [row, prop, oldValue, newValue] */
      if (change[2] === change[3]) {
        continue;
      }
      const idRow = et._ht.toPhysicalRow(change[0]);
      const row = et._ht.getSourceDataAtRow(idRow);
      const gid = row?.gid;
      const update = {
        type: "update_cell",
        column: change[1],
        new_value: change[3],
        gid: gid,
      };
      updates.push(update);
    }
    et.emitUpdates(updates);
  }

  emitUpdates(updates) {
    const et = this;
    const r = et._config.routes;
    const message = et.message_formater({
      updates,
    });
    et._socket.emit(r.client_edit_updates, message);
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
