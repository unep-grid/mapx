import { ws } from "../mx.js";

/**
 * Tile check "run now" protocol events, client side.
 * Server counterpart : api/modules/project/tiles_check.js
 */
export const events = {
  client_run: "/client/project/tiles_check/run",
  server_progress: "/server/project/tiles_check/run/progress",
  server_done: "/server/project/tiles_check/run/done",
  server_error: "/server/project/tiles_check/run/error",
};

const defaults = {
  timeout_emit: 30 * 1000,
};

/**
 * Streams per-view progress for a "run check now" pass, mirroring
 * app/src/js/project/delete_channel.js but without stop/commit : a tile
 * check is read-only and idempotent, there's nothing to cancel or roll
 * back.
 */
export class TilesCheckChannel {
  /**
   * @param {Object} config
   * @param {(message: Object) => void} [config.onProgress]
   * @param {(message: Object) => void} [config.onDone]
   * @param {(message: Object) => void} [config.onError]
   */
  constructor(config = {}) {
    const tc = this;
    tc._socket = ws.socket;
    tc._id_project = null;
    tc._destroyed = false;
    tc._onProgress = config.onProgress;
    tc._onDone = config.onDone;
    tc._onError = config.onError;
    tc.onProgress = tc.onProgress.bind(tc);
    tc.onDone = tc.onDone.bind(tc);
    tc.onError = tc.onError.bind(tc);
  }

  /**
   * Start a run. Progress streams via onProgress until a terminal event
   * (done or error) fires.
   * @param {String} idProject
   * @returns {Promise<{total: Number}>}
   */
  async start(idProject) {
    const tc = this;
    tc._id_project = idProject;
    tc._socket.on(events.server_progress, tc.onProgress);
    tc._socket.on(events.server_done, tc.onDone);
    tc._socket.on(events.server_error, tc.onError);
    const response = await ws.emitAsync(
      events.client_run,
      {},
      defaults.timeout_emit,
    );
    if (!response?.success) {
      tc.destroy();
      throw new Error(response?.error || "tiles_check_run_failed");
    }
    return { total: response.total || 0 };
  }

  onProgress(message) {
    const tc = this;
    if (message?.id_project !== tc._id_project) {
      return;
    }
    tc._onProgress?.(message);
  }

  onDone(message) {
    const tc = this;
    if (message?.id_project !== tc._id_project) {
      return;
    }
    tc._onDone?.(message);
    tc.destroy();
  }

  onError(message) {
    const tc = this;
    if (message?.id_project !== tc._id_project) {
      return;
    }
    tc._onError?.(message);
    tc.destroy();
  }

  destroy() {
    const tc = this;
    if (tc._destroyed) {
      return;
    }
    tc._destroyed = true;
    tc._socket.off(events.server_progress, tc.onProgress);
    tc._socket.off(events.server_done, tc.onDone);
    tc._socket.off(events.server_error, tc.onError);
  }
}
