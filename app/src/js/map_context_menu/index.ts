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
  MapContextMenuMapApi,
  MapContextMenuEvent,
  MapContextMenuItem,
  MapContextMenuMap,
} from "./types";
import { downloadJSON } from "../download/index.js";
import { el } from "../el_mapx";
import { isEmpty, isView } from "../is_test/index.js";
import { draw, panels, settings } from "../mx.js";
import { copyToClipboard, makeId } from "../mx_helper_misc.js";
import { modalDialog } from "../mx_helper_modal.js";
import { QuickGeometryEditSession } from "../source/edit/quick_geometry.js";
import "./style.less";

let activeMenu: MapContextMenu | null = null;
let activeToken: string | null = null;

export async function handleMapContextMenuEvent(
  event: MapContextMenuEvent,
  map: MapContextMenuMap,
  api: MapContextMenuMapApi,
) {
  event.preventDefault?.();
  event.originalEvent?.preventDefault?.();

  const token = makeId();
  activeToken = token;
  destroyMapContextMenu();

  const features = collectFeatureItems({ event, map, api });
  if (activeToken !== token) {
    return;
  }

  await Promise.all(features.map((item) => addEditState(item, api)));
  if (activeToken !== token) {
    return;
  }

  activeMenu = new MapContextMenu({
    event,
    map,
    features,
    api,
  });
}

function destroyMapContextMenu() {
  activeMenu?.destroy();
  activeMenu = null;
}

async function addEditState(
  item: MapContextMenuItem,
  api: MapContextMenuMapApi,
) {
  item.canEdit = false;
  if (!canAttemptEdit(item, settings)) {
    return item;
  }
  try {
    const summary = await api.getViewSourceSummary(item.view.id, {
      stats: ["base", "roles"],
      useCache: false,
    });
    item.canEdit = canEditFromSummary(item, summary, settings);
  } catch (e) {
    console.error(e);
  }
  return item;
}

async function startQuickEdit(
  item: MapContextMenuItem,
  api: MapContextMenuMapApi,
) {
  const session = new QuickGeometryEditSession({
    id_table: item.idSource,
  });
  let mainPanelWasVisible = false;
  let tableLockAcquired = false;
  try {
    await session.init();
    if (await session.isTableLocked()) {
      throw new Error("This table is already being edited.");
    }
    const lockAccepted = await session.setTableLock(true);
    if (!lockAccepted) {
      throw new Error("Table lock was not accepted.");
    }
    tableLockAcquired = true;
    const feature = await session.getFeature(item.gid);
    if (!feature) {
      throw new Error("Feature not found");
    }
    mainPanelWasVisible =
      panels.idExists("main_panel") && panels.isVisible("main_panel");
    if (panels.idExists("main_panel")) {
      panels.hide("main_panel");
    }
    const geometry = feature.geom || item.geometry || null;
    const result = await draw.startEditSession({
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
      await refreshTableViews(session, api);
    }
  } catch (e: any) {
    console.error(e);
    await modalDialog({
      title: "Quick edit failed",
      content: e.message || "The feature could not be edited.",
    });
  } finally {
    if (mainPanelWasVisible && panels.idExists("main_panel")) {
      panels.show("main_panel");
    }
    if (tableLockAcquired) {
      try {
        await session.setTableLock(false);
      } catch (e) {
        console.error(e);
      }
    }
    await session.destroy();
  }
}

async function refreshTableViews(
  session: AnyRecord,
  api: MapContextMenuMapApi,
) {
  const tableViews = await session.getTableViews();
  if (!tableViews) {
    return false;
  }
  const views = tableViews
    .map((row: AnyRecord) => api.getView(row.id))
    .filter((view: AnyRecord) => isView(view));
  if (isEmpty(views)) {
    return false;
  }
  return api.viewsReplace(views);
}

async function downloadFeature(
  item: MapContextMenuItem,
  api: MapContextMenuMapApi,
) {
  let row = null;
  if (item.canEdit) {
    const session = new QuickGeometryEditSession({
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

  await downloadJSON(
    buildFeatureGeoJSON(item, row),
    buildFeatureFilename(item),
  );
}

class MapContextMenu {
  event: MapContextMenuEvent;
  map: MapContextMenuMap;
  features: MapContextMenuItem[];
  api: MapContextMenuMapApi;
  top: number;
  left: number;
  coordinates: string;
  el: HTMLElement;
  _destroyed = false;

  constructor(opt: {
    event: MapContextMenuEvent;
    map: MapContextMenuMap;
    features: MapContextMenuItem[];
    api: MapContextMenuMapApi;
  }) {
    this.event = opt.event;
    this.map = opt.map;
    this.features = opt.features || [];
    this.api = opt.api;
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
    return el(
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
    return el(
      "div",
      { class: "mx-map-context-menu__group" },
      el("div", { class: "mx-map-context-menu__header" }, "Coordinates"),
      el("div", { class: "mx-map-context-menu__coords" }, this.coordinates),
      this.button("Copy coordinates", () =>
        copyToClipboard(this.coordinates),
      ),
    );
  }

  buildFeatureGroup(item: MapContextMenuItem) {
    const label = item.gid ? `${item.title} #${item.gid}` : item.title;
    const buttons = [
      this.button("Download feature as GeoJSON", () => {
        return downloadFeature(item, this.api);
      }),
    ];
    if (item.canEdit) {
      buttons.unshift(
        this.button("Edit geometry", () => startQuickEdit(item, this.api)),
      );
    }
    return el(
      "div",
      { class: "mx-map-context-menu__group" },
      el("div", { class: "mx-map-context-menu__header" }, label),
      buttons,
    );
  }

  button(label: string, action: () => Promise<any>) {
    return el(
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
