import { isViewId, isString } from "@fxi/mx_valid";
import { isAdmin, isPublisher } from "#mapx/authentication";
import { pgRead } from "#mapx/db";
import {
  getCheckableViews,
  runChecks,
  buildTestUrl,
  checkUrl,
  checkRasterUrls,
} from "#mapx/tile_check";
import { setViewRasterConfig, setViewTilesUrl } from "#mapx/view";

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

function normalizeRasterConfig(value) {
  const config = value || {};
  if (!isString(config.tiles)) {
    throw new Error("invalid_params");
  }
  if (config.legend != null && !isString(config.legend)) {
    throw new Error("invalid_params");
  }
  const tileSize = config.tileSize == null ? 512 : config.tileSize;
  if (!Number.isInteger(tileSize) || ![256, 512].includes(tileSize)) {
    throw new Error("invalid_params");
  }
  const useMirror = config.useMirror == null ? false : config.useMirror;
  if (typeof useMirror !== "boolean") {
    throw new Error("invalid_params");
  }
  return {
    tiles: config.tiles,
    legend: config.legend || null,
    tileSize,
    useMirror,
  };
}

async function getRasterView(idProject, idView) {
  const { rows } = await pgRead.query(
    `SELECT
       id,
       project,
       data #>> '{source,tiles,0}' AS tile_url,
       data #>> '{source,legend}' AS legend_url,
       data #> '{source,bounds}' AS bounds
     FROM mx_views_latest
     WHERE id = $1 AND project = $2 AND type = 'rt'`,
    [idView, idProject],
  );
  return rows[0];
}

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
        v.data #>> '{source,tiles,0}' AS tile_url,
        v.data #>> '{source,legend}' AS legend_url,
        u.email AS editor_email,
        c.checked_at,
        c.valid,
        c.detail,
        c.tested_url,
        c.tile_valid,
        c.tile_http_status,
        c.tile_content_type,
        c.tile_detail,
        c.tile_tested_url,
        c.legend_configured,
        c.legend_valid,
        c.legend_http_status,
        c.legend_content_type,
        c.legend_detail,
        c.legend_tested_url
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

/** Check one view immediately, used by the report's health action. */
export async function ioProjectTilesCheckRunOne(socket, data, cb) {
  try {
    if (!isPublisher(socket)) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    if (!idProject || !isViewId(data.idView)) {
      throw new Error("invalid_params");
    }
    const view = await getRasterView(idProject, data.idView);
    if (!view) {
      throw new Error("view_not_found");
    }
    const [row] = await runChecks([view]);
    data.row = row;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Test an (unsaved) tile URL template, for the tiles report's quick-edit
 * window. Same substitute+fetch path as the stored-view check, just without
 * reading/writing mx_views_tiles_check.
 */
export async function ioViewTilesUrlTest(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);
    if (!isUserAllowed) {
      throw new Error("project_tiles_check_access_denied");
    }
    const testUrl = buildTestUrl(data.url);
    data.result = testUrl
      ? await checkUrl(testUrl)
      : { valid: false, detail: "no_tile_template", tested_url: null };
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Save a view's tile URL template from the tiles report's quick-edit
 * window, then immediately re-check it so mx_views_tiles_check (and the
 * report row) reflects the new URL without waiting for a full "Run".
 */
export async function ioViewTilesUrlSave(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);
    if (!isUserAllowed) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    if (!idProject) {
      throw new Error("project_id_required");
    }
    const { idView, url } = data;
    if (!isViewId(idView) || !isString(url)) {
      throw new Error("invalid_params");
    }

    await setViewTilesUrl(idView, url, idProject);

    const [row] = await runChecks([
      { id: idView, project: idProject, tile_url: url },
    ]);
    data.row = row;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/** Return the current raster source values for the Shiny configurator. */
export async function ioViewRasterConfigGet(socket, data, cb) {
  try {
    if (!isPublisher(socket) || !isViewId(data.idView)) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    const { rows } = await pgRead.query(
      `SELECT
         id AS id_view,
         data #>> '{source,tiles,0}' AS tiles,
         data #>> '{source,legend}' AS legend,
         data #>> '{source,tileSize}' AS tile_size,
         data #>> '{source,useMirror}' AS use_mirror,
         c.checked_at,
         c.valid,
         c.tile_valid,
         c.tile_detail,
         c.legend_configured,
         c.legend_valid,
         c.legend_detail
       FROM mx_views_latest
       LEFT JOIN mx_views_tiles_check c ON c.id_view = mx_views_latest.id
       WHERE id = $1 AND project = $2 AND type = 'rt'`,
      [data.idView, idProject],
    );
    if (!rows[0]) {
      throw new Error("view_not_found");
    }
    data.config = {
      idView: rows[0].id_view,
      tiles: rows[0].tiles || "",
      legend: rows[0].legend || "",
      tileSize: Number(rows[0].tile_size) || 512,
      useMirror: rows[0].use_mirror === "true",
      health: rows[0].checked_at
        ? {
            checked_at: rows[0].checked_at,
            valid: rows[0].valid,
            tile_valid: rows[0].tile_valid,
            tile_detail: rows[0].tile_detail,
            legend_configured: rows[0].legend_configured,
            legend_valid: rows[0].legend_valid,
            legend_detail: rows[0].legend_detail,
          }
        : null,
    };
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/** Test unsaved tile and legend URLs without changing the view. */
export async function ioViewRasterConfigTest(socket, data, cb) {
  try {
    if (!isPublisher(socket) || !isViewId(data.idView)) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    const { rowCount } = await pgRead.query(
      `SELECT 1 FROM mx_views_latest
       WHERE id = $1 AND project = $2 AND type = 'rt'`,
      [data.idView, idProject],
    );
    if (!rowCount) throw new Error("view_not_found");
    const config = normalizeRasterConfig(data);
    const result = await checkRasterUrls({
      tile_url: config.tiles,
      legend_url: config.legend || "",
    });
    data.result = result;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/** Save and immediately check a complete raster URL configuration. */
export async function ioViewRasterConfigSave(socket, data, cb) {
  try {
    if (!isPublisher(socket) || !isViewId(data.idView)) {
      throw new Error("project_tiles_check_access_denied");
    }
    const idProject = socket.session.project_id;
    const config = normalizeRasterConfig(data.config);
    const view = await setViewRasterConfig(data.idView, config, idProject);
    if (!view) throw new Error("view_not_found");
    const [row] = await runChecks([view]);
    data.row = row;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}
