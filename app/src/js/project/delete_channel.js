import { ws } from "../mx.js";

/**
 * Project delete protocol events, client side.
 * Server counterpart : api/modules/project/delete/events.js
 */
export const events = {
  client_analyze: "/client/project/delete/analyze",
  client_start: "/client/project/delete/start",
  client_stop: "/client/project/delete/stop",
  client_commit: "/client/project/delete/commit",
  server_progress: "/server/project/delete/progress",
  server_rolled_back: "/server/project/delete/rolled_back",
  server_error: "/server/project/delete/error",
  server_done: "/server/project/delete/done",
};

const defaults = {
  timeout_emit: 30 * 1000,
  timeout_emit_short: 5 * 1000,
};

export class ProjectDeleteChannel {
  /**
   * Stateless, read-only preview of what deleting a project would remove.
   */
  static async analyze(idProject, language, timeout = defaults.timeout_emit) {
    return ws.emitAsync(
      events.client_analyze,
      { id_project: idProject, language },
      timeout,
    );
  }

  /**
   * @param {Object} config
   * @param {(message: Object) => void} [config.onProgress]
   * @param {(message: Object) => void} [config.onRolledBack]
   * @param {(message: Object) => void} [config.onError]
   * @param {(message: Object) => void} [config.onDone]
   */
  constructor(config = {}) {
    const dc = this;
    dc._socket = ws.socket;
    dc._id_project = null;
    dc._destroyed = false;
    dc._onProgress = config.onProgress;
    dc._onRolledBack = config.onRolledBack;
    dc._onError = config.onError;
    dc._onDone = config.onDone;
    dc.onProgress = dc.onProgress.bind(dc);
    dc.onRolledBack = dc.onRolledBack.bind(dc);
    dc.onError = dc.onError.bind(dc);
    dc.onDone = dc.onDone.bind(dc);
  }

  /**
   * Start the actual delete session. Progress streams via the onProgress
   * /onRolledBack/onError/onDone callbacks until one of the terminal
   * events ( rolled_back, error, done ) fires.
   */
  async start(idProject) {
    const dc = this;
    dc._id_project = idProject;
    dc._socket.on(events.server_progress, dc.onProgress);
    dc._socket.on(events.server_rolled_back, dc.onRolledBack);
    dc._socket.on(events.server_error, dc.onError);
    dc._socket.on(events.server_done, dc.onDone);
    const response = await ws.emitAsync(
      events.client_start,
      { id_project: idProject },
      defaults.timeout_emit,
    );
    if (!response?.success) {
      dc.destroy();
      throw new Error(response?.error || "project_delete_start_failed");
    }
    return true;
  }

  /** Abort ( mid-progress Stop or Cancel at the final commit gate ) */
  async stop() {
    const dc = this;
    return ws.emitAsync(
      events.client_stop,
      { id_project: dc._id_project },
      defaults.timeout_emit_short,
    );
  }

  /** Confirm the final commit gate */
  async commit() {
    const dc = this;
    return ws.emitAsync(
      events.client_commit,
      { id_project: dc._id_project },
      defaults.timeout_emit_short,
    );
  }

  onProgress(message) {
    const dc = this;
    if (message?.id_project !== dc._id_project) {
      return;
    }
    dc._onProgress?.(message);
  }

  onRolledBack(message) {
    const dc = this;
    if (message?.id_project !== dc._id_project) {
      return;
    }
    dc._onRolledBack?.(message);
    dc.destroy();
  }

  onError(message) {
    const dc = this;
    if (message?.id_project !== dc._id_project) {
      return;
    }
    dc._onError?.(message);
    dc.destroy();
  }

  onDone(message) {
    const dc = this;
    if (message?.id_project !== dc._id_project) {
      return;
    }
    dc._onDone?.(message);
    dc.destroy();
  }

  destroy() {
    const dc = this;
    if (dc._destroyed) {
      return;
    }
    dc._destroyed = true;
    dc._socket.off(events.server_progress, dc.onProgress);
    dc._socket.off(events.server_rolled_back, dc.onRolledBack);
    dc._socket.off(events.server_error, dc.onError);
    dc._socket.off(events.server_done, dc.onDone);
  }
}
