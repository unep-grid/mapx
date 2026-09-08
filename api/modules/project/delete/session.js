import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { getSourceRelationKind } from "../../source/relation.js";
import { quoteIdentifier } from "../../source/join/sql_builder.js";
import { events } from "./events.js";
import { assertProjectDeletable } from "./guards.js";
import { getProjectDeleteImpact } from "./impact.js";

export const def = {
  // how long an admin has to confirm the final commit before the
  // transaction is rolled back automatically ( holds one pgWrite
  // connection idle-in-transaction while waiting )
  await_commit_timeout_ms: 5 * 60 * 1000,
};

/**
 * One session per socket : a project-creator/root deletes at most one
 * project at a time.
 */
/**
 * Temporary per-socket reservation held while the start guard is pending.
 * @typedef {Object} ProjectDeleteStartReservation
 * @property {"starting"} kind
 * @property {boolean} stopRequested
 * @property {() => void} requestStop
 * @property {() => void} confirmCommit
 * @property {() => void} onDisconnect
 */

/** @type {Map<string, ProjectDeleteSession | ProjectDeleteStartReservation>} */
const sessions = new Map();

/**
 * Triggered by '/client/project/delete/start' in ../../../index.js
 */
export async function ioProjectDeleteStart(socket, data, cb) {
  const idProject = data?.id_project;
  if (sessions.has(socket.id)) {
    cb({ success: false, error: "project_delete_already_running" });
    return;
  }

  /** @type {ProjectDeleteStartReservation} */
  const reservation = {
    kind: "starting",
    stopRequested: false,
    requestStop: () => {
      reservation.stopRequested = true;
    },
    confirmCommit: () => {},
    onDisconnect: () => {
      reservation.stopRequested = true;
    },
  };
  sessions.set(socket.id, reservation);

  try {
    socket.on("disconnect", reservation.onDisconnect);
    // fail fast on obviously invalid requests before opening a
    // write transaction ; re-checked again inside the transaction
    await assertProjectDeletable(socket, idProject);
    if (reservation.stopRequested) {
      throw new Error("project_delete_stopped");
    }
    const session = new ProjectDeleteSession(socket, idProject);
    if (sessions.get(socket.id) !== reservation) {
      throw new Error("project_delete_already_running");
    }
    socket.off("disconnect", reservation.onDisconnect);
    sessions.set(socket.id, session);
    socket.on(events.client_stop, session.requestStop);
    socket.on(events.client_commit, session.confirmCommit);
    socket.on("disconnect", session.onDisconnect);
    session.run(); // not awaited : outcome streams via progress/done/error events
    cb({ success: true });
  } catch (error) {
    socket.off("disconnect", reservation.onDisconnect);
    if (sessions.get(socket.id) === reservation) {
      sessions.delete(socket.id);
    }
    cb({ success: false, error: error?.message || String(error) });
  }
}

export function ioProjectDeleteStop(socket, data, cb) {
  sessions.get(socket.id)?.requestStop();
  cb(true);
}

export function ioProjectDeleteCommit(socket, data, cb) {
  sessions.get(socket.id)?.confirmCommit();
  cb(true);
}

export class ProjectDeleteSession {
  constructor(socket, idProject) {
    const ds = this;
    ds._socket = socket;
    ds._id_project = idProject;
    ds._state = "running";
    ds._stop_requested = false;
    ds._disconnected = false;
    ds._resolve_commit = null;
    ds._reject_commit = null;
    ds._commit_timeout = null;
    ds._destroyed = false;
    ds.requestStop = ds.requestStop.bind(ds);
    ds.confirmCommit = ds.confirmCommit.bind(ds);
    ds.onDisconnect = ds.onDisconnect.bind(ds);
  }

  progress(payload) {
    const ds = this;
    ds._socket.emit(events.server_progress, {
      id_project: ds._id_project,
      ...payload,
    });
  }

  checkStop() {
    const ds = this;
    if (ds._stop_requested) {
      throw new Error("project_delete_stopped");
    }
  }

  requestStop() {
    const ds = this;
    ds._stop_requested = true;
    ds.clearCommitTimeout();
    ds._reject_commit?.(new Error("project_delete_stopped"));
  }

  onDisconnect() {
    const ds = this;
    ds._disconnected = true;
    ds.requestStop();
  }

  confirmCommit() {
    const ds = this;
    if (ds._state !== "awaiting_commit") {
      return;
    }
    ds.clearCommitTimeout();
    ds._resolve_commit?.();
  }

  clearCommitTimeout() {
    const ds = this;
    if (ds._commit_timeout) {
      clearTimeout(ds._commit_timeout);
      ds._commit_timeout = null;
    }
  }

  /**
   * Resolves once the client confirms the final commit gate,
   * rejects on stop/disconnect ( via requestStop ) or on timeout.
   */
  waitForCommitConfirmation() {
    const ds = this;
    return new Promise((resolve, reject) => {
      if (ds._stop_requested) {
        reject(new Error("project_delete_stopped"));
        return;
      }
      ds._resolve_commit = resolve;
      ds._reject_commit = reject;
      ds._commit_timeout = setTimeout(() => {
        reject(new Error("project_delete_commit_timeout"));
      }, def.await_commit_timeout_ms);
    });
  }

  async run() {
    const ds = this;
    let client;
    let removed = 0;
    try {
      client = await pgWrite.connect();
      await client.query("BEGIN");

      const { title } = await assertProjectDeletable(
        ds._socket,
        ds._id_project,
        { client },
      );

      const impact = await getProjectDeleteImpact(ds._id_project, null, client);

      const viewIds = [
        ...new Set([
          ...impact.views.map((v) => v.id),
          ...impact.viewsDependent.map((v) => v.id),
        ]),
      ];
      const sourceIds = [
        ...new Set([
          ...impact.sources.map((s) => s.id),
          ...impact.sourcesDependent.map((s) => s.id),
        ]),
      ];
      const themeIds = impact.themes.map((t) => t.id);

      ds.checkStop();
      ds.progress({ step: "views", total: viewIds.length });
      if (viewIds.length > 0) {
        await client.query(`DELETE FROM mx_views WHERE id = ANY($1::text[])`, [
          viewIds,
        ]);
      }
      removed += viewIds.length;

      for (let i = 0; i < sourceIds.length; i++) {
        ds.checkStop();
        const idSource = sourceIds[i];
        const typeRes = await client.query(
          `SELECT type FROM mx_sources_latest WHERE id = $1`,
          [idSource],
        );
        const kind = getSourceRelationKind(typeRes.rows[0]?.type);
        if (kind) {
          const cascade = kind === "TABLE" ? " CASCADE" : "";
          await client.query(
            `DROP ${kind} IF EXISTS ${quoteIdentifier(idSource)}${cascade}`,
          );
        }
        const del = await client.query(`DELETE FROM mx_sources WHERE id = $1`, [
          idSource,
        ]);
        if (del.rowCount < 1) {
          throw new Error(`project_delete_source_not_removed`);
        }
        removed++;
        ds.progress({
          step: "source",
          index: i + 1,
          total: sourceIds.length,
          id: idSource,
        });
      }

      ds.checkStop();
      // Keep every project's external-view references consistent with the
      // views removed by this transaction. Existing unrelated stale IDs are
      // intentionally left for a separate maintenance operation.
      if (viewIds.length > 0) {
        await client.query(templates.removeDeletedViewsExternal, [viewIds]);
      }

      if (themeIds.length > 0) {
        await client.query(`DELETE FROM mx_themes WHERE id_project = $1`, [
          ds._id_project,
        ]);
        removed += themeIds.length;
      }

      ds.checkStop();
      const projectDel = await client.query(
        `DELETE FROM mx_projects WHERE id = $1`,
        [ds._id_project],
      );
      if (projectDel.rowCount !== 1) {
        throw new Error("project_delete_project_not_removed");
      }
      removed++;

      /**
       * Final commit gate : every DROP/DELETE already ran, but the
       * transaction stays open until the client explicitly confirms.
       */
      ds._state = "awaiting_commit";
      // arm the resolve/reject callbacks before notifying the client,
      // so a same-tick stop/commit response can never be missed
      const commitConfirmation = ds.waitForCommitConfirmation();
      ds.progress({
        step: "awaiting_commit",
        project_title: title,
        removed: {
          views: viewIds.length,
          sources: sourceIds.length,
          themes: themeIds.length,
          total: removed,
        },
      });

      await commitConfirmation;

      await client.query("COMMIT");
      ds.progress({ step: "done" });
      ds._socket.emit(events.server_done, {
        id_project: ds._id_project,
        project_title: title,
        removed,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Project delete rollback failed", rollbackError);
        }
      }
      if (
        error?.message === "project_delete_stopped" ||
        error?.message === "project_delete_commit_timeout"
      ) {
        ds._socket.emit(events.server_rolled_back, {
          id_project: ds._id_project,
          reason: ds._disconnected
            ? "disconnected"
            : error.message === "project_delete_commit_timeout"
              ? "timeout"
              : "stopped",
        });
      } else {
        console.error("Project delete failed", error);
        ds._socket.emit(events.server_error, {
          id_project: ds._id_project,
          message: error?.message || String(error),
        });
      }
    } finally {
      ds.clearCommitTimeout();
      client?.release();
      ds.destroy();
    }
  }

  destroy() {
    const ds = this;
    if (ds._destroyed) {
      return;
    }
    ds._destroyed = true;
    ds._socket.off(events.client_stop, ds.requestStop);
    ds._socket.off(events.client_commit, ds.confirmCommit);
    ds._socket.off("disconnect", ds.onDisconnect);
    if (sessions.get(ds._socket.id) === ds) {
      sessions.delete(ds._socket.id);
    }
  }
}
