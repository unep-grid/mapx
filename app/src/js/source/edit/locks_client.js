import { isNotEmpty } from "./../../is_test/index.js";

/**
 * Client lock state : table batch lock, geometry lock, UI lock/enable.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const locksClientMixin = {
  /**
   * Handler of lock update message
   * @param {Object} update Update object
   * @param {Object} message Container message
   */
  async handlerUpdateLock(update, message) {
    const et = this;
    if (update.lock) {
      et._lock_table_by_user_id = message.id_user;
    } else {
      et._lock_table_by_user_id = null;
    }
    et.updateLockedState();
  },

  async handlerUpdateGeometryLock(update) {
    const et = this;
    const lock = update.lock;
    if (lock?.locked && lock.id_session !== et._id_session) {
      et._geometry_lock_by_session = lock.id_session;
    } else {
      et._geometry_lock_by_session = null;
    }
    et.updateLockedState();
  },

  /**
   * Disable the tool
   */
  disable() {
    const et = this;
    et._disabled = true;
    et._el_overlay?.classList?.add("edit-table--disabled");
    et.setReadOnly(true);
  },

  /**
   * Enable the tool
   */
  enable() {
    const et = this;
    et._disabled = false;
    et._el_overlay?.classList?.remove("edit-table--disabled");
    et.setReadOnly(false);
  },

  /**
   * Lock the tool
   */
  lock() {
    const et = this;
    et.disable();
    et._locked = true;
    et._el_overlay?.classList?.add("edit-table--locked");
  },

  /**
   * Unlock the tool
   */
  unlock() {
    const et = this;
    et._disconnected = false;
    et._el_overlay?.classList?.remove("edit-table--locked");
    et._locked = false;
    et.enable();
  },

  updateLockedState() {
    const et = this;
    if (et._lock_table_by_user_id || et._geometry_lock_by_session) {
      et.lock();
    } else {
      et.unlock();
    }
  },

  /**
   * Send lock event to other concurent user
   * @param {Boolean} lock Enable/disable lock for other. If empty, use _auto_save state
   */
  async lockTableConcurrent(lock) {
    const et = this;
    et._lock_table_concurrent = isNotEmpty(lock) ? lock : !et._auto_save;
    const update = {
      type: "lock_table",
      lock: et._lock_table_concurrent,
    };
    await et.emitUpdatesState([update]);
  },

  async acquireGeometryEditLock(gid) {
    const et = this;
    const update = {
      type: "geometry_edit_lock",
      action: "acquire",
      mode: "table",
      gid,
    };
    return et.emitUpdatesState([update]);
  },

  async releaseGeometryEditLock() {
    const et = this;
    const update = {
      type: "geometry_edit_lock",
      action: "release",
    };
    return et.emitUpdatesState([update], true);
  },

  async lockAll() {
    const et = this;
    await et.lockTableConcurrent(true);
    et.lock();
  },

  async unlockAll() {
    const et = this;
    await et.lockTableConcurrent(!et._auto_save);
    et.unlock();
  },

  /**
   * Lock all wrapper ( for dialogs )
   * @param {Function} cb
   * @returns
   */
  _l(cb) {
    const et = this;
    return async function () {
      let res;
      if (et.locked) {
        console.warn("locked");
        return;
      }
      try {
        await et.lockTableConcurrent(true);
        res = await cb();
      } catch (e) {
        console.error(e);
      } finally {
        await et.lockTableConcurrent();
      }
      return res;
    };
  },
};
