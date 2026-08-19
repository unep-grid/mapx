import { isAdmin } from "#mapx/authentication";
import { pgRead } from "#mapx/db";
import { getCheckableViews, runChecks } from "#mapx/tile_check";

/**
 * Tile check "run now" protocol events.
 * Client counterpart : app/src/js/project/tiles_check_channel.js
 */
export const events = {
  server_run_progress: "/server/project/tiles_check/run/progress",
  server_run_done: "/server/project/tiles_check/run/done",
  server_run_error: "/server/project/tiles_check/run/error",
};

/** One tile check run per project at a time (concurrent runs are merely
 * wasteful, not unsafe, but there's no reason to allow them). */
const runningProjects = new Set();

/**
 * Get stored tile-check results for the current project's 'rt' views.
 */
export async function ioProjectTilesCheckGet(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);
    if (!isUserAllowed) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    if (!idProject) {
      throw new Error("project_id_required");
    }

    const sql = `
      SELECT
        v.id AS id_view,
        v.data #>> '{title,en}' AS title,
        u.email AS editor_email,
        c.checked_at,
        c.valid,
        c.http_status,
        c.content_type,
        c.detail,
        c.tested_url
      FROM mx_views_latest v
      LEFT JOIN mx_views_tiles_check c ON c.id_view = v.id
      LEFT JOIN mx_users u ON u.id = v.editor
      WHERE v.type = 'rt'
      AND v.project = $1
      AND v.data #>> '{source,tiles,0}' IS NOT NULL
      ORDER BY (c.valid IS NOT FALSE), v.data #>> '{title,en}'
    `;
    const { rows } = await pgRead.query(sql, [idProject]);

    data.rows = rows;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Manually (re)run the tile check for the current project, so an admin can
 * validate the pipeline without waiting for the daily routine. Fire-and-
 * forget: acks with the view count immediately, then streams per-view
 * progress via socket.emit (events.server_run_progress/done/error),
 * mirroring api/modules/project/delete/session.js's ioProjectDeleteStart.
 */
export async function ioProjectTilesCheckRun(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);
    if (!isUserAllowed) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    if (!idProject) {
      throw new Error("project_id_required");
    }
    if (runningProjects.has(idProject)) {
      throw new Error("project_tiles_check_already_running");
    }
    runningProjects.add(idProject);

    let views;
    try {
      views = await getCheckableViews(idProject);
    } catch (e) {
      runningProjects.delete(idProject);
      throw e;
    }

    runChecks(views, {
      onStart: (view) => {
        socket.emit(events.server_run_progress, {
          id_project: idProject,
          id_view: view.id,
          state: "checking",
        });
      },
      onDone: (row) => {
        socket.emit(events.server_run_progress, {
          id_project: idProject,
          state: "done",
          ...row,
        });
      },
    })
      .then((results) => {
        socket.emit(events.server_run_done, {
          id_project: idProject,
          nChecked: results.length,
        });
      })
      .catch((e) => {
        socket.emit(events.server_run_error, {
          id_project: idProject,
          message: e?.message || String(e),
        });
      })
      .finally(() => {
        runningProjects.delete(idProject);
      });

    data.success = true;
    data.total = views.length;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}
