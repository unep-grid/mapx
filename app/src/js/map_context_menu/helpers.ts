import type {
  AnyRecord,
  MapContextMenuDependencies,
  MapContextMenuEvent,
  MapContextMenuItem,
  MapContextMenuMap,
  SourceSummary,
} from "./types";

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
  opt: Pick<
    MapContextMenuDependencies,
    "isNotEmpty" | "isNumeric" | "isSourceId" | "isView" | "settings"
  >,
) {
  return (
    !opt.settings.mode.static &&
    opt.isSourceId(item.idSource) &&
    opt.isNumeric(item.gid) &&
    opt.isView(item.view) &&
    item.view.type === "vt" &&
    opt.isNotEmpty(opt.settings?.user?.id)
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

export function buildFeatureFilename(
  item: MapContextMenuItem,
  opt: Pick<MapContextMenuDependencies, "isNotEmpty" | "makeSafeName">,
) {
  const title = opt.makeSafeName(item.title || item.idView) || item.idView;
  const gid = opt.isNotEmpty(item.gid) ? item.gid : "feature";
  return `${title}_${gid}.geojson`;
}

export function collectFeatureItems(opt: {
  event: MapContextMenuEvent;
  map: MapContextMenuMap;
  deps: Pick<
    MapContextMenuDependencies,
    | "clone"
    | "eventToPointBbox"
    | "getFeaturesAtBbox"
    | "getLayerNamesByPrefix"
    | "getView"
    | "getViewTitle"
    | "getViewsOrder"
    | "isView"
    | "path"
    | "setFeatureIdentityProperty"
    | "sortByOrder"
  >;
  maxItems?: number;
}) {
  const { event, map, deps } = opt;
  const maxItems = opt.maxItems || 3;
  const bbox = deps.eventToPointBbox(event);
  const idViews = deps.sortByOrder(
    deps.getLayerNamesByPrefix({
      base: true,
    }),
    deps.getViewsOrder(),
  );
  const seen = new Set<string>();
  const items: MapContextMenuItem[] = [];

  for (const idView of idViews) {
    const view = deps.getView(idView);
    if (!deps.isView(view) || !["vt", "gj"].includes(view.type)) {
      continue;
    }
    const features = deps.getFeaturesAtBbox(map, bbox, idView);
    for (const feature of features) {
      deps.setFeatureIdentityProperty(feature.properties, feature.id);
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
        idSource: deps.path(view, "data.source.layerInfo.name"),
        title: deps.getViewTitle(view),
        properties: deps.clone(feature.properties || {}),
        geometry: deps.clone(feature.geometry || null),
      });
      if (items.length >= maxItems) {
        return items;
      }
    }
  }
  return items;
}
