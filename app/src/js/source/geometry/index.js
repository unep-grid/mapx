import { isSourceId } from "./../../is_test/index.js";
import { modalSelectSource } from "../../select_auto/index.js";

const defaults = {
  id_table: null,
  routes: {
    server_result: "/server/source/validate/geometry/result",
    client_request: "/client/source/validate/geometry/request",
  },
};

export class GeometryTools {
  constructor(socket, config) {
    const gt = this;
    gt._config = Object.assign({}, defaults, config);
    gt._socket = socket;
    gt.init().catch(console.error);
  }

  async init() {
    const gt = this;
    try {
      if (gt._initialized) {
        return;
      }
      gt._initialized = true;
      gt._id_table = await gt.dialogSelectTable();
      gt._socket.on(r.server_result, gt.onResult);

      if (!isSourceId(gt._id_table)) {
        gt.destroy();
        return;
      }
      if (isFunction(gt._config.on_destroy)) {
        gt.addDestroyCb(gt._config.on_destroy);
      }
    } catch (e) {
      gt.destroy();
      return e;
    }
  }

  async destroy() {
    const gt = this;
    try {
      const r = gt._config.routes;
      if (gt._destroyed) {
        return;
      }
      gt._destroyed = true;
      gt._modal?.close();
      gt._socket.off(r.server_result, gt.onResult);
      await gt.fire("destroy");
    } catch (e) {
      console.error(e);
    }
  }

  async build() {}
  async validate() {}
  async fix() {}
  async removeCache() {}

  /**
   * Display a dialog with source selection
   * - built with tom select, in select_auto module
   */
  async dialogSelectTable() {
    const res = await modalSelectSource({
      types: ["vector"],
    });
    return res;
  }

  /**
   * Add callback that will be used once after destroy event
   * @param {Function} Callback
   */
  addDestroyCb(cb) {
    const gt = this;
    gt._on_cb.add({ once: true, cb: cb, type: "destroy", resolve: null });
  }

  /*
   * Events : once handler
   */
  once(type, cb, timeout) {
    const gt = this;
    return new Promise((resolve, reject) => {
      const item = { once: true, cb: cb, type: type, resolve: resolve };
      if (timeout) {
        setTimeout(() => {
          gt._on_cb.delete(item);
          reject(`Timeout for ${type}`);
        }, timeout);
      }
      gt._on_cb.add(item);
    });
  }

  /*
   * Events : fire handler
   */
  async fire(type, data) {
    const gt = this;
    const res = [];
    for (const item of gt._on_cb) {
      if (item.type === type) {
        if (item.cb) {
          res.push(await item.cb(data));
        }
        if (item.resolve) {
          item.resolve(data);
        }
        if (item.once) {
          gt._on_cb.delete(item);
        }
      }
    }
    return res;
  }
}
