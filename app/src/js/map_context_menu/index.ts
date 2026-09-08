import {
  canFetchAuthoritativeFeature,
  collectFeatureItems,
  EDIT_STATE_TIMEOUT_MS,
  formatCoordinates,
  getInitialEditState,
  resolveEditState,
  buildFeatureFilename,
  buildFeatureGeoJSON,
} from "./helpers.ts";
import type {
  MapContextMenuEditState,
  MapContextMenuMapApi,
  MapContextMenuEvent,
  MapContextMenuItem,
  MapContextMenuMap,
} from "./types";
import { downloadJSON } from "../download/index.js";
import { el } from "../el_mapx";
import { settings } from "../mx.js";
import { getDictItem } from "../language";
import { copyToClipboard, makeId } from "../mx_helper_misc.js";
import { modalDialog } from "../mx_helper_modal.js";
import { editFeatureGeometry } from "../source/edit/geometry_flow.js";
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

  features.forEach(initEditState);

  const menu = new MapContextMenu({
    event,
    map,
    features,
    api,
  });
  activeMenu = menu;
  features.forEach((item) => updateEditStateAsync(item, api, menu, token));
}

function destroyMapContextMenu() {
  activeMenu?.destroy();
  activeMenu = null;
}

function initEditState(item: MapContextMenuItem) {
  setEditState(item, getInitialEditState(item, settings));
}

function setEditState(
  item: MapContextMenuItem,
  editState: MapContextMenuEditState,
) {
  item.editState = editState;
  item.canEdit = canFetchAuthoritativeFeature(editState);
  item.editLocked = editState === "locked";
}

async function updateEditStateAsync(
  item: MapContextMenuItem,
  api: MapContextMenuMapApi,
  menu: MapContextMenu,
  token: string,
) {
  if (item.editState !== "loading") {
    return;
  }
  let editState: MapContextMenuEditState = "unavailable";
  try {
    editState = await resolveEditState({
      item,
      settings,
      timeoutMs: EDIT_STATE_TIMEOUT_MS,
      getSummary: () =>
        api.getViewSourceSummary(item.view.id, {
          stats: ["base", "roles"],
          useCache: false,
        }),
      isLocked: () => isQuickEditLocked(item, EDIT_STATE_TIMEOUT_MS),
    });
  } catch (e) {
    console.error(e);
  }
  if (activeToken !== token || activeMenu !== menu || menu.destroyed) {
    return;
  }
  setEditState(item, editState);
  menu.updateEditButton(item);
}

async function isQuickEditLocked(
  item: MapContextMenuItem,
  timeout = EDIT_STATE_TIMEOUT_MS,
) {
  const status = await QuickGeometryEditSession.getStatus(
    item.idSource,
    timeout,
  );
  return !status || QuickGeometryEditSession.isStatusLocked(status);
}

async function startQuickEdit(
  item: MapContextMenuItem,
  api: MapContextMenuMapApi,
) {
  const session = new QuickGeometryEditSession({
    id_table: item.idSource,
  });
  try {
    await session.init();
    await session.withGeometryEditLock(item.gid, async () => {
      await editFeatureGeometry({
        session,
        gid: item.gid,
        geometry: item.geometry || null,
        viewsApi: api,
      });
    });
  } catch (e: any) {
    console.error(e);
    await modalDialog({
      title: "Quick edit failed",
      content: e.message || "The feature could not be edited.",
    });
  } finally {
    await session.destroy();
  }
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
  editButtons = new Map<MapContextMenuItem, HTMLButtonElement>();
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
      this.button("Copy coordinates", () => copyToClipboard(this.coordinates)),
    );
  }

  buildFeatureGroup(item: MapContextMenuItem) {
    const label = item.gid ? `${item.title} #${item.gid}` : item.title;
    const buttons = [
      this.button("Download feature as GeoJSON", () => {
        return downloadFeature(item, this.api);
      }),
    ];
    const editButton = this.buildEditButton(item);
    if (editButton) {
      buttons.unshift(editButton);
    }
    return el(
      "div",
      { class: "mx-map-context-menu__group" },
      el("div", { class: "mx-map-context-menu__header" }, label),
      buttons,
    );
  }

  buildEditButton(item: MapContextMenuItem) {
    if (item.editState === "hidden" || !item.editState) {
      return null;
    }
    const button = this.button(
      getEditButtonLabel(item.editState),
      () => startQuickEdit(item, this.api),
      {
        disabled: item.editState !== "enabled",
        tooltipKey:
          item.editState === "restricted" ? "action_not_allowed_dev" : null,
      },
    );
    this.editButtons.set(item, button);
    return button;
  }

  updateEditButton(item: MapContextMenuItem) {
    if (this._destroyed) {
      return;
    }
    const button = this.editButtons.get(item);
    if (!button || item.editState === "hidden" || !item.editState) {
      return;
    }
    button.textContent = getEditButtonLabel(item.editState);
    button.disabled = item.editState !== "enabled";
    this.adjustPosition();
  }

  button(
    label: string,
    action: () => Promise<any>,
    opt: { disabled?: boolean; tooltipKey?: string | null } = {},
  ): HTMLButtonElement {
    const button = el(
      "button",
      {
        class: "mx-map-context-menu__button",
        type: "button",
        ...(opt.disabled ? { disabled: true } : {}),
        ...(opt.tooltipKey
          ? {
              dataset: {
                lang_key: opt.tooltipKey,
                lang_type: "tooltip",
              },
            }
          : {}),
        on: {
          click: async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if ((event.currentTarget as HTMLButtonElement).disabled) {
              return;
            }
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
    ) as HTMLButtonElement;
    if (opt.tooltipKey) {
      getDictItem(opt.tooltipKey).then((tooltip) => {
        button.title = tooltip;
      });
    }
    return button;
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

  get destroyed() {
    return this._destroyed;
  }
}

function getEditButtonLabel(editState: MapContextMenuEditState) {
  switch (editState) {
    case "restricted":
      return "Edit geometry unavailable";
    case "loading":
      return "Edit geometry (loading)";
    case "locked":
      return "Edit geometry (locked)";
    case "unavailable":
      return "Edit geometry unavailable";
    case "enabled":
    default:
      return "Edit geometry";
  }
}
