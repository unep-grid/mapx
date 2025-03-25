import { redisGetJSON, redisSetJSON } from "#mapx/db";
import { getParamsValidator } from "#mapx/route_validation";
import {
  validateTokenHandler,
  validateRoleSuperUserHandler,
} from "#mapx/authentication";

import { settings } from "#root/settings";
import { getProjectsIdAll } from "#mapx/project";
import { getViewsGeoserver } from "#mapx/view";
import { timeStep, randomString } from "#mapx/helpers";
import { isNotEmpty, isNumericRange, isObject } from "@fxi/mx_valid";
import { ioUpdateDbViewAltStyle } from "#mapx/view";
import { geoserver as grc } from "#mapx/db";
import { mwNotify } from "#mapx/io";

const validateParamsHandler = getParamsValidator({
  required: ["idUser", "token"],
  expected: ["idSocket", "overwriteStyle"],
});

const db = settings.db;
const ns = "http://geoserver";
const state_key = "geoserver_update_state";
const state = { running: false, success: false };
/* Reset state at start */
redisSetJSON(state_key, state);

const mwUpdateGeoserver = [
  validateParamsHandler,
  validateTokenHandler,
  validateRoleSuperUserHandler,
  mwUpdateGeoserverHandler,
];

/**
 * Exports : io + mw
 */

export { ioUpdateGeoserver, mwUpdateGeoserver, updateGeoserver };

/**
 * Update handler
 */
async function ioUpdateGeoserver(socket, options) {
  const session = socket?.session;
  const allowed = session?.user_roles.root;
  if (!allowed) {
    await socket.notifyInfoError({
      message: "Geoserver rebuild : not allowed",
    });
    return;
  }
  await rebuildHandler(socket, options);
}

/**
 * Express mw
 */
async function mwUpdateGeoserverHandler(req, res) {
  const options = req.query || req.body || {};
  /**
   * Express mw : no overwrite possible
   */
  if (options.overwriteStyle) {
    options.overwriteStyle = false;
  }
  await rebuildHandler(res, options);
  res.end();
}

/**
 * Routine
 */
async function updateGeoserver() {
  const options = {
    overwriteStyle: false,
  };
  const socket = {};
  // Fake notify, use console.log;
  mwNotify({}, socket, () => {});
  const out = await rebuildHandler(socket, options);
  return out;
}

/**
 * Take care of state
 */
async function rebuildHandler(socket, options) {
  const stateGlobal = state;
  /**
   * Quit early if already running
   */
  try {
    const stateSaved = await redisGetJSON(state_key);
    Object.assign(stateGlobal, stateSaved);

    if (stateGlobal.running) {
      await socket.notifyInfoError({
        message: "Geoserver rebuild already runnning",
      });
      return;
    }
  } catch (e) {
    console.error(e);
  }

  /**
   * Launch process
   * - save state = running
   * - rebuild
   * - error => notify
   * - finally => save state = not running
   */
  try {
    const ok = await grc.about.exists();

    if (!ok) {
      throw new Error("Geoserver not available");
    }

    stateGlobal.running = true;
    await redisSetJSON(state_key, stateGlobal);
    await rebuild(socket, options);
    stateGlobal.success = true;
  } catch (e) {
    stateGlobal.success = false;
    console.error(e);
    await socket.notifyInfoError({
      message: e.message || e,
      data: e.stack,
    });
  } finally {
    stateGlobal.running = false;
    await redisSetJSON(state_key, stateGlobal);
  }
  return stateGlobal;
}

/**
 * Rebuild method
 */
async function rebuild(socket, options) {
  const start = Date.now();
  const idGroup = randomString("update_geoserver");
  const idProgress = randomString("progress");

  const clientStyle = !!options.overwriteStyle && !!socket?.connected;

  const out = {
    ok: false,
  };

  await socket.notifyInfoMessage({
    idGroup: idGroup,
    message: `Geoserver update started`,
  });

  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: `Extracting projects info...`,
    value: 1,
  });

  const ids_db = await getProjectsIdAll();
  const ids_ns = await getNamespaceIdAll();
  const ids_ns_keep = ["it.geosolutions"]; // ws that can't be deleted...

  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: "Workspaces...",
    value: 10,
  });

  /**
   * Remove all
   */
  const prom_rm = [];
  for (const id of ids_ns) {
    const skip = ids_ns_keep.includes(id);
    if (skip) {
      continue;
    }
    prom_rm.push(deleteWorkspace(socket, id, idGroup, idProgress));
  }
  const resWorkspaceRemoved = await Promise.all(prom_rm);

  /**
   * Add new
   */
  const prom_add = [];
  for (const id of ids_db) {
    const ns_uri = `${ns}/${id}`;
    prom_add.push(addWorkspace(socket, id, ns_uri, idGroup, idProgress));
  }
  const resWorkspaceAdded = await Promise.all(prom_add);

  /**
   * Create datastore for all
   */
  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    type: "progress",
    message: `Datastores...`,
    value: 20,
  });

  const prom_ds = [];
  for (const id of ids_db) {
    prom_ds.push(createDatastore(socket, id, idGroup, idProgress));
  }
  const resDatastore = await Promise.all(prom_ds);

  /**
   * Update layers and style
   */
  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    type: "progress",
    message: `Layers...`,
    value: 80,
  });
  const prom_layers = [];
  const layers = await getViewsGeoserver();
  for (const layer of layers) {
    prom_layers.push(
      createLayer(socket, layer, clientStyle, idGroup, idProgress)
    );
  }
  const resLayers = await Promise.all(prom_layers);

  /**
   * Summary
   */
  const ok = [
    ...resWorkspaceRemoved,
    ...resWorkspaceAdded,
    ...resDatastore,
    ...resLayers,
  ].reduce((a, c) => a && c);

  out.timing = timeStep(start);
  out.ok = ok;
  out.n_workspaces_removed = resWorkspaceRemoved.length;
  out.n_workspaces = resWorkspaceAdded.length;
  out.n_datastores = resDatastore.length;
  out.n_layers = resLayers.length;

  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    type: "progress",
    message: `Done`,
    value: 100,
  });

  await socket.notifyInfoSuccess({
    idGroup: idGroup,
    message: `Geoserver update finished in ${timeStep(start) / 1000} [s]`,
    data: out,
  });
  return out;
}

function isBboxGeoserver(item) {
  return (
    isObject(item) &&
    isNumericRange(item.lat1, -90, 90) &&
    isNumericRange(item.lat2, -90, 90) &&
    isNumericRange(item.lng1, -180, 180) &&
    isNumericRange(item.lng2, -180, 180)
  );
}

/**
 * Helpers
 */
async function createLayer(socket, layer, clientStyle, idGroup, idProgress) {
  const ws = layer.id_project;
  const ds = `PG_${ws}`;
  const idStyle = layer.id;
  const wsStyle = ws;

  if (!isBboxGeoserver(layer.bbox_source)) {
    layer.bbox_source = {
      minx: -180,
      miny: -90,
      maxx: 180,
      maxy: 90,
      crs: { "@class": "projected", $: "EPSG:4326" },
    };
  }

  await grc.layers.publishFeatureType(
    ws,
    ds,
    layer.id_source,
    layer.id,
    layer.title,
    "EPSG:4326",
    true,
    layer.abstract,
    layer.bbox_source
  );

  const hasCustomStyle = !!layer.style_custom;
  const requestStyle = clientStyle && !hasCustomStyle;

  if (requestStyle) {
    const result = await ioUpdateDbViewAltStyle(socket, { idView: layer.id });
    if (result.valid) {
      layer.style_mapbox = result.mapbox;
      layer.style_sld = result.sld;
    }
  }

  if (hasCustomStyle) {
    /**
     * Case style_sld has been previously defined:
     * if there is a custom style, we dont want that.
     */
    delete layer.style_sld;
  }

  const styleToPublish = layer.style_sld;
  const hasStyle = isNotEmpty(styleToPublish);

  if (hasStyle) {
    await grc.styles.publish(ws, layer.id, styleToPublish);
    await grc.styles.assignStyleToLayer(ws, layer.id, wsStyle, idStyle, true);
  }

  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: `Layer created for: ${idStyle}`,
  });

  return true;
}

async function addWorkspace(socket, id, ns_uri, idGroup, idProgress) {
  const out = await grc.namespaces.create(id, ns_uri);
  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: `Workspace created: ${id}`,
  });
  return out;
}

async function deleteWorkspace(socket, id, idGroup, idProgress) {
  const out = await grc.workspaces.delete(id, true);
  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: `Workspace deleted: ${id}`,
  });
  return out;
}

async function createDatastore(socket, ws, idGroup, idProgress) {
  const ns_uri = `${ns}/${ws}`;
  const ds_id = `PG_${ws}`;

  /* workspace, namespaceUri, dataStore, pgHost, pgPort, pgUser, pgPassword, pgSchema, pgDb, exposePk  */
  const out = await grc.datastores.createPostgisStore(
    ws,
    ns_uri,
    ds_id,
    db.host,
    db.port,
    db.read.user,
    db.read.password,
    db.schema,
    db.name
  );

  await socket.notifyProgress({
    idGroup: idGroup,
    idMerge: idProgress,
    message: `Datastore created: ${ds_id}`,
  });
  return out;
}

async function getNamespaceIdAll() {
  const res = await grc.namespaces.getAll();
  const namespaces = res.namespaces?.namespace || [];
  const ids_ns = namespaces.map((w) => w.name);
  return ids_ns;
}
