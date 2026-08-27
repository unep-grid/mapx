import type {
  AnyRecord,
  MapContextMenuMapApi,
  MapContextMenuEditState,
  MapContextMenuEvent,
  MapContextMenuItem,
  MapContextMenuMap,
  SourceSummary,
} from "./types";
import { sortByOrder } from "../array_stat/index.js";
import { setFeatureIdentityProperty } from "../map_helpers/feature_identity.js";
import {
  isNotEmpty,
  isNumeric,
  isSourceId,
  isView,
  makeSafeName,
} from "../is_test/index.js";

const DEFAULT_BUFFER_PIXELS = 5;
export const EDIT_STATE_TIMEOUT_MS = 2500;

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function pathValue(obj: AnyRecord, path: string) {
  return path.split(".").reduce((out, key) => out?.[key], obj);
}

function eventToPointBbox(
  event: MapContextMenuEvent,
  buffer = DEFAULT_BUFFER_PIXELS,
) {
  const x = event.point?.x;
  const y = event.point?.y;
  if (typeof x !== "number" || typeof y !== "number") {
    throw new Error("Invalid event.point format. Coordinates must be numbers.");
  }
  return [
    [x - buffer, y - buffer],
    [x + buffer, y + buffer],
  ];
}

export function formatCoordinates(lngLat: { lng: number; lat: number }) {
  const lng = Number(lngLat.lng).toFixed(6);
  const lat = Number(lngLat.lat).toFixed(6);
  return `${lng}, ${lat}`;
}

export function getGeometryType(geometry?: AnyRecord | null) {
  const type = `${geometry?.type || ""}`.toLowerCase();
  if (type.includes("point")) {
    return "point";
  }
  if (type.includes("line")) {
    return "line";
  }
  return "polygon";
}

export function getRoleGroups(roles: AnyRecord = {}) {
  return []
    .concat(roles.groups || [], roles.group || [])
    .filter((value) => value !== undefined && value !== null && value !== "");
}

export function canAttemptEdit(
  item: MapContextMenuItem,
  settings: AnyRecord,
) {
  return (
    !settings?.mode?.static &&
    isSourceId(item.idSource) &&
    isNumeric(item.gid) &&
    isView(item.view) &&
    item.view.type === "vt" &&
    isNotEmpty(settings?.user?.id)
  );
}

export function canEditFromSummary(
  item: MapContextMenuItem,
  summary: SourceSummary,
  settings: AnyRecord,
) {
  const idUser = settings?.user?.id;
  const groups = getRoleGroups(settings?.user?.roles);
  const editor = summary?.roles?.editor;
  const editors = summary?.roles?.editors || [];
  const isEditable = ["vector", "tabular"].includes(summary?.type || "");
  const isProject = item.view?.project === settings?.project?.id;
  const isEditor = editor === idUser;
  const isAllowed = editors.some((role) => {
    return groups.includes(role) || role === idUser;
  });
  return isProject && isEditable && (isEditor || isAllowed);
}

export function getInitialEditState(
  item: MapContextMenuItem,
  settings: AnyRecord,
): MapContextMenuEditState {
  if (!canAttemptEdit(item, settings)) {
    return "hidden";
  }
  return "loading";
}

export function getResolvedEditState(opt: {
  item: MapContextMenuItem;
  summary: SourceSummary;
  settings: AnyRecord;
  editLocked: boolean;
}): MapContextMenuEditState {
  const { item, summary, settings, editLocked } = opt;
  if (!canEditFromSummary(item, summary, settings)) {
    return "unavailable";
  }
  if (settings?.user?.roles?.developer !== true) {
    return "restricted";
  }
  return editLocked ? "locked" : "enabled";
}

export function canFetchAuthoritativeFeature(
  editState: MapContextMenuEditState,
) {
  return ["enabled", "locked", "restricted"].includes(editState);
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = EDIT_STATE_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Edit status request timed out"));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

export async function resolveEditState(opt: {
  item: MapContextMenuItem;
  settings: AnyRecord;
  getSummary: () => Promise<SourceSummary>;
  isLocked: () => Promise<boolean>;
  timeoutMs?: number;
}): Promise<MapContextMenuEditState> {
  const { item, settings, getSummary, isLocked, timeoutMs } = opt;
  const initialState = getInitialEditState(item, settings);
  if (initialState !== "loading") {
    return initialState;
  }
  try {
    const started = Date.now();
    const summary = await withTimeout(getSummary(), timeoutMs);
    if (!canEditFromSummary(item, summary, settings)) {
      return "unavailable";
    }
    if (settings?.user?.roles?.developer !== true) {
      return "restricted";
    }
    const remainingTimeout = Math.max(
      1,
      (timeoutMs || EDIT_STATE_TIMEOUT_MS) - (Date.now() - started),
    );
    const editLocked = await withTimeout(isLocked(), remainingTimeout);
    return getResolvedEditState({ item, summary, settings, editLocked });
  } catch (_e) {
    return "unavailable";
  }
}

export function buildFeatureGeoJSON(
  item: MapContextMenuItem,
  row?: AnyRecord | null,
) {
  const properties = { ...((row || item.properties || {}) as AnyRecord) };
  const geometry = properties.geom || item.geometry || null;
  delete properties.geom;
  return {
    type: "Feature",
    properties,
    geometry,
  };
}

export function buildFeatureFilename(item: MapContextMenuItem) {
  const title = makeSafeName(item.title || item.idView) || item.idView;
  const gid = isNotEmpty(item.gid) ? item.gid : "feature";
  return `${title}_${gid}.geojson`;
}

export function collectFeatureItems(opt: {
  event: MapContextMenuEvent;
  map: MapContextMenuMap;
  api: MapContextMenuMapApi;
  maxItems?: number;
}) {
  const { event, map, api } = opt;
  const maxItems = opt.maxItems || 3;
  const bbox = eventToPointBbox(event);
  const idViews = sortByOrder(
    api.getLayerNamesByPrefix({
      base: true,
    }),
    api.getViewsOrder(),
  );
  const seen = new Set<string>();
  const items: MapContextMenuItem[] = [];

  for (const idView of idViews) {
    const view = api.getView(idView);
    if (!isView(view) || !["vt", "gj"].includes(view.type)) {
      continue;
    }
    const features = api.getFeaturesAtBbox(map, bbox, idView);
    for (const feature of features) {
      setFeatureIdentityProperty(feature.properties, feature.id);
      const gid = feature.properties?.gid;
      const identity = `${idView}:${gid ?? feature.id ?? items.length}`;
      if (seen.has(identity)) {
        continue;
      }
      seen.add(identity);
      items.push({
        idView,
        view,
        gid,
        idSource: pathValue(view, "data.source.layerInfo.name"),
        title: api.getViewTitle(view),
        properties: cloneValue(feature.properties || {}),
        geometry: cloneValue(feature.geometry || null),
      });
      if (items.length >= maxItems) {
        return items;
      }
    }
  }
  return items;
}
