import { getParamsValidator } from "#mapx/route_validation";
import {
  validateTokenHandler,
  validateRoleSuperUserHandler,
} from "#mapx/authentication";

import { settings } from "#root/settings";
import { getProjectsIdAll } from "#mapx/project";
import { getViewsGeoserver } from "#mapx/view";
import { timeStep, sendError } from "#mapx/helpers";
import { isEmpty, isNotEmpty } from "@fxi/mx_valid";
import { setViewStyleAlt } from "#mapx/view";
import { geoserver as grc } from "#mapx/db";

const db = settings.db;
const ns = "http://geoserver";

const validateParamsHandler = getParamsValidator({
  required: ["idUser", "token"],
  expected: ["idSocket", "overwriteStyle"],
});

export const mwGeoserverRebuild = [
  validateParamsHandler,
  validateTokenHandler,
  validateRoleSuperUserHandler,
  handlerRebuildGeoserver,
];

//const grc = new GeoServerRestClient(url, user, pw);

/**
 * Update handler
 */
const state = { running: false };
export async function handlerRebuildGeoserver(req, res) {
  try {
    if (state.running) {
      sendError("Geoserver rebuild already runnning");
      return;
    }
    state.running = true;
    await rebuild(req.query, res);
    state.running = false;
  } catch (e) {
    state.running = false;
    await res.notifyInfoError("job_state", {
      message: e.message,
    });
    await res.notifyInfoError("job_state", {
      message: e.stack,
    });
  }
  res.end();
}

/**
 * Rebuild method
 * TODO:
 * - rebuild single project => query.idProject
 * - recreate single layer => query.idLayer
 */
async function rebuild(query, res) {
  const start = Date.now();
  const overwriteStyle = !!query.overwriteStyle;

  const out = {
    ok: false,
  };

  await res.notifyInfoMessage("job_state", {
    message: `Geoserver update started`,
  });

  await res.notifyProgress("job_state", {
    idMerge: "update_geoserver_progress",
    type: "progress",
    message: `Extracting projects info...]`,
    value: 0,
  });

  const ids_db = await getProjectsIdAll();
  const ids_ns = await getNamespaceIdAll();
  const ids_ns_keep = ["it.geosolutions"];

  await res.notifyProgress("job_state", {
    idMerge: "update_geoserver_progress",
    type: "progress",
    message: `Workspaces...`,
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
    prom_rm.push(grc.workspaces.delete(id, true));
  }
  const resWorkspaceRemoved = await Promise.all(prom_rm);

  /**
   * Add new
   */
  const prom_add = [];
  for (const id of ids_db) {
    const ns_uri = `${ns}/${id}`;
    prom_add.push(grc.namespaces.create(id, ns_uri));
  }
  const resWorkspaceAdded = await Promise.all(prom_add);

  /**
   * Create datastore for all
   */
  await res.notifyProgress("job_state", {
    idMerge: "update_geoserver_progress",
    type: "progress",
    message: `Datastores...`,
    value: 30,
  });

  const prom_ds = [];
  for (const id of ids_db) {
    prom_ds.push(createDatastore(id));
  }
  const resDatastore = await Promise.all(prom_ds);

  /**
   * Update layers and style
   * NOTE: Two distinct loops, in case of errors in style,
   * we do not lose every layers
   */
  await res.notifyProgress("job_state", {
    idMerge: "update_geoserver_progress",
    type: "progress",
    message: `Layers..`,
    value: 80,
  });
  const prom_layers = [];
  const layers = await getViewsGeoserver();
  for (const layer of layers) {
    prom_layers.push(createLayer(layer, res, overwriteStyle));
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

  await res.notifyProgress("job_state", {
    idMerge: "update_geoserver_progress",
    type: "progress",
    message: `Done in ${timeStep(start) / 1000} [s]`,
    value: 100,
  });

  await res.notifyInfoSuccess("job_state", {
    message: `Geoserver update finished in ${timeStep(start)}`,
    data: out,
  });
  return out;
}

/**
 * Helpers
 */
async function createLayer(layer, res, overwriteStyle) {
  const ws = layer.id_project;
  const ds = `PG_${ws}`;
  const idStyle = layer.id;
  const wsStyle = ws;

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

  const recalc =
    isEmpty(layer.style_mapbox) || isEmpty(layer.style_sld) || overwriteStyle;
  
  if (recalc) {
    const data = await res.clientJobRequest("style_from_view", {
      idView: layer.id,
    });
    const valid = isNotEmpty(data?.mapbox) && isNotEmpty(data?.sld);
    if (valid) {
      layer.style_mapbox = data.mapbox;
      layer.style_sld = data.sld;
      await setViewStyleAlt(layer.id, data);
    }
  }

  const styleToPublish = layer.style_sld;
  const hasStyle = isNotEmpty(styleToPublish);

  if (hasStyle) {
    await grc.styles.publish(ws, layer.id, styleToPublish);
    await grc.styles.assignStyleToLayer(ws, layer.id, wsStyle, idStyle, true);
  }

  return true;
}

async function createDatastore(ws) {
  const ns_uri = `${ns}/${ws}`;
  const ds_id = `PG_${ws}`;

  /* workspace, namespaceUri, dataStore, pgHost, pgPort, pgUser, pgPassword, pgSchema, pgDb, exposePk  */
  return grc.datastores.createPostgisStore(
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
}

async function getNamespaceIdAll() {
  const res = await grc.namespaces.getAll();
  const namespaces = res.namespaces?.namespace || [];
  const ids_ns = namespaces.map((w) => w.name);
  return ids_ns;
}
