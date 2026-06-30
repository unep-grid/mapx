import {
  collectFeatureItems,
  canAttemptEdit,
  canEditFromSummary,
  formatCoordinates,
  getGeometryType,
  buildFeatureFilename,
  buildFeatureGeoJSON,
} from "./helpers.ts";
import type {
  AnyRecord,
  MapContextMenuDependencies,
  MapContextMenuEvent,
  MapContextMenuItem,
  MapContextMenuMap,
} from "./types";
import "./style.less";

let activeMenu: MapContextMenu | null = null;
let activeToken: string | null = null;

export async function handleMapContextMenuEvent(
  event: MapContextMenuEvent,
  map: MapContextMenuMap,
  deps: MapContextMenuDependencies,
) {
  event.preventDefault?.();
  event.originalEvent?.preventDefault?.();

  const token = deps.makeId();
  activeToken = token;
  destroyMapContextMenu();

  const features = collectFeatureItems({ event, map, deps });
  if (activeToken !== token) {
    return;
  }

  await Promise.all(features.map((item) => addEditState(item, deps)));
  if (activeToken !== token) {
    return;
  }

  activeMenu = new MapContextMenu({
    event,
    map,
    features,
    deps,
  });
}

function destroyMapContextMenu() {
  activeMenu?.destroy();
  activeMenu = null;
}

async function addEditState(
  item: MapContextMenuItem,
  deps: MapContextMenuDependencies,
) {
  item.canEdit = false;
  if (!canAttemptEdit(item, deps)) {
    return item;
  }
  try {
    const summary = await deps.getViewSourceSummary(item.view.id, {
      stats: ["base", "roles"],
      useCache: false,
    });
    item.canEdit = canEditFromSummary(item, summary, deps.settings);
  } catch (e) {
    console.error(e);
  }
  return item;
}

async function startQuickEdit(
  item: MapContextMenuItem,
  deps: MapContextMenuDependencies,
) {
  const session = new deps.QuickGeometryEditSession({
    id_table: item.idSource,
  });
  let mainPanelWasVisible = false;
  try {
    await session.init();
    const feature = await session.getFeature(item.gid);
    if (!feature) {
      throw new Error("Feature not found");
    }
    mainPanelWasVisible =
      deps.panels.idExists("main_panel") && deps.panels.isVisible("main_panel");
    if (deps.panels.idExists("main_panel")) {
      deps.panels.hide("main_panel");
    }
    const geometry = feature.geom || item.geometry || null;
    const result = await deps.draw.startEditSession({
      type: getGeometryType(geometry),
      feature: {
        type: "Feature",
        properties: {
          gid: feature.gid,
        },
        geometry,
      },
      minZoom: 12,
      singleFeature: true,
      onSave: async ({ geometry }: { geometry: AnyRecord | null }) => {
        const saved = await session.updateGeometry(feature.gid, geometry);
        if (!saved) {
          throw new Error("Geometry update was not accepted");
        }
      },
    });
    if (result?.status === "saved") {
      await refreshTableViews(session, deps);
    }
  } catch (e: any) {
    console.error(e);
    await deps.modalDialog({
      title: "Quick edit failed",
      content: e.message || "The feature could not be edited.",
    });
  } finally {
    if (mainPanelWasVisible && deps.panels.idExists("main_panel")) {
      deps.panels.show("main_panel");
    }
    await session.destroy();
  }
}

async function refreshTableViews(
  session: AnyRecord,
  deps: MapContextMenuDependencies,
) {
  const tableViews = await session.getTableViews();
  if (!tableViews) {
    return false;
  }
  const views = tableViews
    .map((row: AnyRecord) => deps.getView(row.id))
    .filter((view: AnyRecord) => deps.isView(view));
  if (deps.isEmpty(views)) {
    return false;
  }
  return deps.viewsReplace(views);
}

async function downloadFeature(
  item: MapContextMenuItem,
  deps: MapContextMenuDependencies,
) {
  let row = null;
  if (item.canEdit) {
    const session = new deps.QuickGeometryEditSession({
      id_table: item.idSource,
    });
    try {
      await session.init();
      row = await session.getFeature(item.gid);
    } catch (e) {
      console.error(e);
    } finally {
      await session.destroy();
    }
  }

  await deps.downloadJSON(
    buildFeatureGeoJSON(item, row),
    buildFeatureFilename(item, deps),
  );
}

class MapContextMenu {
  event: MapContextMenuEvent;
  map: MapContextMenuMap;
  features: MapContextMenuItem[];
  deps: MapContextMenuDependencies;
  top: number;
  left: number;
  coordinates: string;
  el: HTMLElement;
  _destroyed = false;

  constructor(opt: {
    event: MapContextMenuEvent;
    map: MapContextMenuMap;
    features: MapContextMenuItem[];
    deps: MapContextMenuDependencies;
  }) {
    this.event = opt.event;
    this.map = opt.map;
    this.features = opt.features || [];
    this.deps = opt.deps;
    const rect = opt.map.getContainer().getBoundingClientRect();
    this.top =
      opt.event.originalEvent?.clientY || rect.top + (opt.event.point?.y || 0);
    this.left =
      opt.event.originalEvent?.clientX || rect.left + (opt.event.point?.x || 0);
    this.coordinates = formatCoordinates(opt.event.lngLat);
    this.destroy = this.destroy.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.el = this.build();
    document.body.appendChild(this.el);
    this.adjustPosition();
    this.startListen();
  }

  build() {
    const groups = [
      this.buildCoordinatesGroup(),
      ...this.features.map((item) => this.buildFeatureGroup(item)),
    ];
    return this.deps.el(
      "div",
      {
        class: "mx-map-context-menu",
        style: {
          top: `${this.top}px`,
          left: `${this.left}px`,
        },
      },
      groups,
    );
  }

  buildCoordinatesGroup() {
    return this.deps.el(
      "div",
      { class: "mx-map-context-menu__group" },
      this.deps.el("div", { class: "mx-map-context-menu__header" }, "Coordinates"),
      this.deps.el("div", { class: "mx-map-context-menu__coords" }, this.coordinates),
      this.button("Copy coordinates", () =>
        this.deps.copyToClipboard(this.coordinates),
      ),
    );
  }

  buildFeatureGroup(item: MapContextMenuItem) {
    const label = item.gid ? `${item.title} #${item.gid}` : item.title;
    const buttons = [
      this.button("Download feature as GeoJSON", () => {
        return downloadFeature(item, this.deps);
      }),
    ];
    if (item.canEdit) {
      buttons.unshift(
        this.button("Edit geometry", () => startQuickEdit(item, this.deps)),
      );
    }
    return this.deps.el(
      "div",
      { class: "mx-map-context-menu__group" },
      this.deps.el("div", { class: "mx-map-context-menu__header" }, label),
      buttons,
    );
  }

  button(label: string, action: () => Promise<any>) {
    return this.deps.el(
      "button",
      {
        class: "mx-map-context-menu__button",
        type: "button",
        on: {
          click: async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            try {
              await action();
            } catch (e) {
              console.error(e);
            } finally {
              this.destroy();
            }
          },
        },
      },
      label,
    );
  }

  adjustPosition() {
    const rect = this.el.getBoundingClientRect();
    const margin = 12;
    if (rect.right > window.innerWidth - margin) {
      this.el.style.left = `${window.innerWidth - rect.width - margin}px`;
    }
    if (rect.bottom > window.innerHeight - margin) {
      this.el.style.top = `${window.innerHeight - rect.height - margin}px`;
    }
  }

  startListen() {
    setTimeout(() => {
      if (this._destroyed) {
        return;
      }
      window.addEventListener("mousedown", this.handleMouseDown);
      window.addEventListener("keydown", this.handleKeyDown);
      this.map.on("movestart", this.destroy);
      this.map.on("zoomstart", this.destroy);
    }, 0);
  }

  stopListen() {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.map.off("movestart", this.destroy);
    this.map.off("zoomstart", this.destroy);
  }

  handleMouseDown(event: MouseEvent) {
    if (!this.el.contains(event.target as Node)) {
      this.destroy();
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.code === "Escape") {
      this.destroy();
    }
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this.stopListen();
    this.el.remove();
    if (activeMenu === this) {
      activeMenu = null;
    }
  }
}
