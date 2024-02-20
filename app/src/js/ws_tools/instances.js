import { EditTableSessionClient } from "./../source/edit/index.js";
import { GeometryTools } from "./../source/geometry/index.js";
import { Uploader } from "./../uploader";

/**
 * Single instance manager, ws tools that requires single instance.
 * TODO: check if this would be more usefull as a multi-instance manager
 * - Create callbacks
 * - Remove old instance(s)
 * - Start instance
 * - Handle destroy callback
 * - ...
 */
export class WsToolsInstances {
  constructor(ws) {
    const wst = this;
    wst._ws = ws;
    wst._store = {};
  }

  /**
   * Remove everything
   * e.g. project change
   */
  async clear() {
    const wst = this;
    for (const type in wst._store) {
      await wst.remove(type);
    }
  }

  /**
   * Create a callback
   */
  getCb(type) {
    const wst = this;
    return async (config) => {
      try {
        return wst.start(type, config);
      } catch (e) {
        await wst.remove(type);
      }
    };
  }

  /**
   * Get instance
   */
  get(type) {
    const wst = this;
    let instance = wst._store[type];
    return instance;
  }

  /**
   * Start instance
   */
  async start(type, config) {
    try {
      const wst = this;
      const oldInstance = wst.get(type);

      if (oldInstance && !oldInstance._destroyed) {
        return oldInstance;
      }
      await wst.remove(type);
      const instance = wst.resolver(type, config);
      wst._store[type] = instance;
      if (instance?.addDestroyCb) {
        instance.addDestroyCb(async () => {
          await wst.remove(type);
        });
      }
      await instance.init();
      return instance;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  /**
   * Remove / destroy instance
   */
  async remove(type) {
    try {
      const wst = this;
      const instance = wst.get(type);
      if (instance) {
        await instance.destroy();
      }
      delete wst._store[type];
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Get socket
   */
  get socket() {
    return this._ws.socket;
  }

  /**
   * Resolve instance type
   */
  resolver(type, config) {
    const wst = this;
    let instance;
    switch (type) {
      case "geometry_tools":
        instance = new GeometryTools(wst.socket, config);
        break;
      case "edit_table":
        instance = new EditTableSessionClient(wst.socket, config);
        break;
      case "uploader":
        instance = new Uploader(config);
        break;

      default:
        null;
    }
    return instance;
  }
}
