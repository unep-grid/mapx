// @ts-check
import { ws } from "../../mx.js";
import { ElementCreator } from "../../el/src/index.js";
import { getMapxWindowManager } from "../../window/index.js";
import "./style.less";

const DEFAULT_CONFIG = {
  value: [],
  multiple: false,
  maxItems: 1,
  acceptedTypes: ["vector", "join"],
  requiredCapabilities: ["geometry"],
  geometryTypes: [],
  accessMode: "readable",
  excludeIds: [],
  viewId: null,
  language: "en",
  label: "Source",
};

let pickerCounter = 0;

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return value ? [String(value)] : [];
}

function sourceIconClass(type) {
  return (
    {
      vector: "fa fa-clone",
      join: "fa fa-link",
      tabular: "fa fa-table",
      raster: "fa fa-picture-o",
      image: "fa fa-picture-o",
      pmtiles: "fa fa-map-o",
      document: "fa fa-file-text-o",
    }[type] || "fa fa-database"
  );
}

function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function numberLabel(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
        number,
      )
    : "";
}

function dimensionLabel(item) {
  const parts = [];
  const rows = numberLabel(item?.row_estimate);
  const columns = numberLabel(item?.column_count);
  if (rows) parts.push(`~${rows} rows`);
  if (columns) parts.push(`${columns} fields`);
  return parts.join(" · ");
}

/**
 * Compact source field that opens a source-kind-neutral browser.
 *
 * Configure with the `config` property or a JSON `data-config` attribute.
 * Changes emit `mx-source-picker-change` with `{ value, items }`.
 */
export class MxSourcePickerElement extends HTMLElement {
  constructor() {
    super();
    this._config = { ...DEFAULT_CONFIG };
    this.selectedItems = new Map();
    this.searchState = {
      query: "",
      geometryTypes: [],
      tags: [],
      sort: "relevance",
    };
    this.searchGeneration = 0;
    this.selectionHydrationGeneration = 0;
    this.controlId = `mx-source-picker-control-${++pickerCounter}`;
    this.onBrowserInput = debounce(() => this.loadResults(), 180);
  }

  get elements() {
    if (this.elementCreator?.document !== this.ownerDocument) {
      this.elementCreator = new ElementCreator({
        document: this.ownerDocument,
      });
    }
    return this.elementCreator;
  }

  set config(value) {
    const config = value && typeof value === "object" ? value : {};
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      value: arrayValue(config.value),
      excludeIds: arrayValue(config.excludeIds),
    };
    this._config.maxItems = this._config.multiple
      ? Math.max(1, Number(this._config.maxItems) || 1)
      : 1;
    if (this.isConnected) this.renderField();
  }

  get config() {
    return this._config;
  }

  get value() {
    const values = [...this.selectedItems.keys()];
    return this.config.multiple ? values : values[0] || null;
  }

  set value(value) {
    this.selectionHydrationGeneration += 1;
    const excludedIds = new Set(this.config.excludeIds);
    const values = arrayValue(value)
      .filter((id) => !excludedIds.has(id))
      .slice(0, this.config.maxItems);
    this.selectedItems = new Map(
      values.map((id) => [id, { id, title: id, type: "vector" }]),
    );
    if (this.isConnected) this.renderField();
  }

  connectedCallback() {
    if (!this._initialized) {
      const attributeConfig = this.dataset.config;
      if (attributeConfig) {
        try {
          this.config = JSON.parse(attributeConfig);
        } catch (error) {
          console.warn("Invalid mx-source-picker config", error);
        }
      }
      this.value = this.config.value;
      this.addEventListener("click", (event) => this.onFieldClick(event));
      this._initialized = true;
      queueMicrotask(() => {
        if (this.isConnected) {
          this.commit();
          this.hydrateSelectedItems();
        }
      });
    }
    this.renderField();
  }

  disconnectedCallback() {
    this.invalidateSearch();
    this.selectionHydrationGeneration += 1;
    if (this.browserWindow?.isConnected) {
      this.browserWindow.close("picker-disconnected");
    }
  }

  /**
   * Update exclusions and clear selections that are no longer valid.
   *
   * @param {unknown} ids
   * @param {{emit?: boolean}} [options]
   * @returns {boolean} whether the selection changed
   */
  setExcludedIds(ids, { emit = true } = {}) {
    const excludeIds = arrayValue(ids);
    this._config = { ...this._config, excludeIds };
    const excluded = new Set(excludeIds);
    let selectionChanged = false;
    for (const id of this.selectedItems.keys()) {
      if (excluded.has(id)) {
        this.selectedItems.delete(id);
        selectionChanged = true;
      }
    }
    for (const id of this.pendingSelectedItems?.keys() || []) {
      if (excluded.has(id)) this.pendingSelectedItems.delete(id);
    }
    if (selectionChanged && emit) this.commit();
    else if (this.isConnected) this.renderField();
    if (this.refs?.browser?.isConnected) {
      this.updateConfirmButton();
      this.loadResults();
    }
    return selectionChanged;
  }

  invalidateSearch() {
    this.searchGeneration += 1;
    this.previewToken = null;
  }

  async hydrateSelectedItems() {
    const selectedIds = [...this.selectedItems.keys()];
    if (!selectedIds.length) return;
    const generation = ++this.selectionHydrationGeneration;
    let response;
    try {
      response = await ws.emitAsync(
        "/client/source/search",
        {
          selectedIds,
          acceptedTypes: this.config.acceptedTypes,
          language: this.config.language,
          viewId: this.config.viewId,
          limit: Math.min(20, selectedIds.length),
        },
        15000,
      );
    } catch {
      return;
    }
    if (
      generation !== this.selectionHydrationGeneration ||
      response?.error ||
      !Array.isArray(response?.items)
    ) {
      return;
    }
    for (const item of response.items) {
      if (this.selectedItems.has(item.id)) this.selectedItems.set(item.id, item);
      if (this.pendingSelectedItems?.has(item.id)) {
        this.pendingSelectedItems.set(item.id, item);
      }
      if (this.activeItem?.id === item.id) this.activeItem = item;
    }
    if (this.isConnected) this.renderField();
    this.renderBrowserSelection();
    if (this.activeItem && this.refs?.previewMeta) {
      this.showPreview(this.activeItem);
    }
  }

  renderField() {
    const { el } = this.elements;
    const values = [...this.selectedItems.values()];
    const hasSelection = values.length > 0;
    const title = hasSelection
      ? values.map((item) => item.title).join(", ")
      : "Choose source layer…";
    const group = el("div", { class: "form-group mx-source-picker__group" });
    const label = el(
      "label",
      {
        class: "control-label mx-source-picker__label",
        for: this.controlId,
      },
      this.config.label,
    );
    const control = el("div", { class: "mx-source-picker__control" });
    const open = el(
      "button",
      {
        id: this.controlId,
        type: "button",
        class: "mx-source-picker__value",
        dataset: { action: "open" },
        title,
      },
      hasSelection
        ? el("i", {
            class: sourceIconClass(values[0].type),
            "aria-hidden": "true",
          })
        : null,
      el(
        "span",
        {
          class: hasSelection
            ? "mx-source-picker__selected-title"
            : "mx-source-picker__placeholder",
        },
        title,
      ),
    );
    const endAction = el(
      "button",
      {
        type: "button",
        class: "btn btn-default mx-source-picker__end-action",
        dataset: { action: hasSelection ? "remove" : "open" },
        "aria-label": hasSelection ? `Remove ${title}` : "Browse sources",
        title: hasSelection ? `Remove ${title}` : "Browse sources",
      },
      el("i", {
        class: hasSelection ? "fa fa-times" : "fa fa-clone",
        "aria-hidden": "true",
      }),
    );
    control.append(open, endAction);
    group.append(label, control);
    this.replaceChildren(group);
  }

  onFieldClick(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "open") this.open();
    if (action === "remove") {
      this.selectedItems.clear();
      this.commit();
    }
  }

  open() {
    this.pendingSelectedItems = new Map(this.selectedItems);
    this.activeItem = [...this.pendingSelectedItems.values()][0] || null;
    this.buildBrowser();
    this.browserWindow = getMapxWindowManager(this.ownerDocument.body).open({
      key: `source-picker-${this.id || "default"}`,
      title: this.config.multiple ? "Select sources" : "Select source",
      content: this.refs.browser,
      footerEnd: this.refs.confirm,
      modal: true,
      alwaysOnTop: true,
      draggable: true,
      resizable: true,
      collapsible: true,
      snappable: true,
      geometry: { width: 640, height: 520 },
      onClose: () => {
        this.invalidateSearch();
        this.pendingSelectedItems = null;
        this.activeItem = null;
        this.browserWindow = null;
      },
    });
    this.loadResults();
  }

  buildBrowser() {
    const { el } = this.elements;
    const browser = el("div", { class: "mx-source-browser" });
    const preview = el("section", { class: "mx-source-browser__preview" });
    const previewCanvas = el("div", {
      class: "mx-source-browser__preview-canvas",
    });
    const previewMeta = el("div", { class: "mx-source-browser__preview-meta" });
    preview.append(previewCanvas, previewMeta);
    const toolbar = el("div", { class: "mx-source-browser__toolbar" });
    const searchWrap = el("label", {
      class: "mx-source-browser__search-wrap",
    });
    searchWrap.append(
      el("i", { class: "fa fa-search", "aria-hidden": "true" }),
    );
    const search = el("input", {
      type: "search",
      class: "form-control mx-source-browser__search",
      placeholder: "Search sources…",
      "aria-label": "Search sources",
    });
    searchWrap.append(search);
    const filtersButton = el(
      "button",
      {
        type: "button",
        class:
          "btn btn-default btn-circle btn-circle-medium mx-source-browser__filters-button",
        dataset: { action: "toggle-filters" },
        "aria-label": "Source filters",
        "aria-expanded": "false",
        "aria-haspopup": "dialog",
      },
      el("i", { class: "fa fa-sliders", "aria-hidden": "true" }),
    );
    const filters = el("div", {
      class: "mx-source-browser__filters",
      role: "dialog",
      "aria-label": "Source filters",
    });
    filters.hidden = true;
    const geometry = el("select", {
      class: "form-control",
      "aria-label": "Filter by geometry type",
    });
    geometry.append(
      el("option", { value: "" }, "All geometries"),
      ...[
        ["point", "Point"],
        ["line", "Line"],
        ["polygon", "Polygon"],
        ["unspecified", "Mixed or unspecified"],
      ].map(([value, label]) => el("option", { value }, label)),
    );
    const tag = el("select", {
      class: "form-control",
      "aria-label": "Filter by metadata tag",
    });
    tag.append(el("option", { value: "" }, "All tags"));
    const sort = el("select", {
      class: "form-control",
      "aria-label": "Sort sources",
    });
    for (const [value, text] of [
      ["relevance", "Relevance"],
      ["modified", "Last modified"],
      ["uploaded", "Upload date"],
      ["editor", "Editor email"],
      ["title", "Title"],
    ]) {
      sort.append(el("option", { value }, text));
    }
    const clearFilters = el(
      "button",
      {
        type: "button",
        class: "btn btn-link mx-source-browser__clear-filters",
        dataset: { action: "clear-filters" },
      },
      "Clear filters",
    );
    const wrapFilter = (label, control) => {
      const wrapper = el("label", { class: "mx-source-browser__filter" });
      wrapper.append(el("span", {}, label), control);
      return wrapper;
    };
    filters.append(
      wrapFilter("Geometry", geometry),
      wrapFilter("Metadata tag", tag),
      wrapFilter("Sort by", sort),
      clearFilters,
    );
    toolbar.append(searchWrap, filtersButton, filters);
    const summary = el("p", { class: "mx-source-browser__summary" });
    const results = el("div", {
      class: "mx-source-browser__results",
      role: "listbox",
      "aria-multiselectable": String(this.config.multiple),
    });
    const confirm = el(
      "button",
      {
        type: "button",
        class: "btn btn-primary mx-source-browser__confirm",
        dataset: { action: "confirm" },
      },
      "Select",
    );
    browser.append(toolbar, preview, summary, results);
    this.refs = {
      browser,
      previewCanvas,
      previewMeta,
      search,
      filtersButton,
      filters,
      geometry,
      tag,
      sort,
      clearFilters,
      summary,
      results,
      confirm,
    };
    search.addEventListener("input", this.onBrowserInput);
    search.addEventListener("keydown", (event) =>
      this.onSearchKeydown(event),
    );
    for (const control of [geometry, tag, sort]) {
      control.addEventListener("change", () => {
        this.updateFilterState();
        this.loadResults();
      });
    }
    filtersButton.addEventListener("click", () => this.toggleFilters());
    clearFilters.addEventListener("click", () => this.clearFilters());
    confirm.addEventListener("click", () => this.confirmSelection());
    results.addEventListener("click", (event) => this.onResultAction(event));
    results.addEventListener("keydown", (event) =>
      this.onResultsKeydown(event),
    );
    browser.addEventListener("click", (event) => {
      if (
        !filters.hidden &&
        !event.target.closest(".mx-source-browser__filters") &&
        !event.target.closest(".mx-source-browser__filters-button")
      ) {
        this.toggleFilters(false);
      }
    });
    this.updateFilterState();
    this.updateConfirmButton();
    if (this.activeItem) this.showPreview(this.activeItem);
    else this.renderNeutralPreview();
  }

  async loadResults() {
    const refs = this.refs;
    if (!refs) return;
    const generation = ++this.searchGeneration;
    this.previewToken = null;
    refs.results.setAttribute("aria-busy", "true");
    refs.summary.textContent = "Loading…";
    let response;
    try {
      response = await ws.emitAsync(
        "/client/source/search",
        {
          query: refs.search.value,
          acceptedTypes: this.config.acceptedTypes,
          geometryTypes: refs.geometry.value
            ? [refs.geometry.value]
            : this.config.geometryTypes,
          tags: refs.tag.value ? [refs.tag.value] : [],
          access: this.config.accessMode === "editable" ? ["editable"] : [],
          sort: refs.sort.value,
          language: this.config.language,
          viewId: this.config.viewId,
          limit: 50,
        },
        15000,
      );
    } catch {
      response = { error: "source_search_failed" };
    }
    if (generation !== this.searchGeneration || refs !== this.refs) return;
    if (response?.error) {
      refs.summary.textContent = "Unable to load sources";
      refs.results.replaceChildren();
      refs.results.setAttribute("aria-busy", "false");
      return;
    }
    this.items = (response.items || []).filter(
      (item) => !this.config.excludeIds.includes(item.id),
    );
    for (const item of this.items) {
      if (this.selectedItems.has(item.id))
        this.selectedItems.set(item.id, item);
      if (this.pendingSelectedItems?.has(item.id))
        this.pendingSelectedItems.set(item.id, item);
    }
    this.renderField();
    this.updateTagFacet(response.facets?.tags || []);
    refs.summary.textContent = `${response.total || 0} matching sources`;
    refs.results.replaceChildren(
      ...this.items.map((item, index) => this.buildResult(item, index)),
    );
    refs.results.setAttribute("aria-busy", "false");
    const activeId = this.activeItem?.id;
    this.activeItem =
      this.items.find((item) => item.id === activeId) ||
      this.items.find((item) => this.pendingSelectedItems?.has(item.id)) ||
      this.items[0] ||
      null;
    this.renderBrowserSelection();
    this.updateConfirmButton();
    if (this.activeItem) this.showPreview(this.activeItem);
    else {
      refs.previewMeta.replaceChildren();
      this.renderNeutralPreview();
    }
  }

  updateTagFacet(tags) {
    const current = this.refs.tag.value;
    this.refs.tag.replaceChildren(
      this.elements.el("option", { value: "" }, "All tags"),
      ...tags.map(({ value, count }) =>
        this.elements.el("option", { value }, `${value} (${count})`),
      ),
    );
    this.refs.tag.value = current;
  }

  toggleFilters(force) {
    const open =
      typeof force === "boolean" ? force : this.refs.filters.hidden === true;
    this.refs.filters.hidden = !open;
    this.refs.filtersButton.setAttribute("aria-expanded", String(open));
    if (open) this.refs.geometry.focus();
    else if (force === false) this.refs.filtersButton.focus();
  }

  clearFilters() {
    this.refs.geometry.value = "";
    this.refs.tag.value = "";
    this.refs.sort.value = "relevance";
    this.updateFilterState();
    this.toggleFilters(false);
    this.loadResults();
  }

  updateFilterState() {
    if (!this.refs?.filtersButton) return;
    const active =
      Boolean(this.refs.geometry.value) ||
      Boolean(this.refs.tag.value) ||
      this.refs.sort.value !== "relevance";
    this.refs.filtersButton.classList.toggle("is-active", active);
    this.refs.filtersButton.setAttribute(
      "aria-label",
      active ? "Source filters: filters active" : "Source filters",
    );
  }

  updateConfirmButton() {
    if (!this.refs?.confirm) return;
    this.refs.confirm.disabled = !this.pendingSelectedItems?.size;
  }

  buildResult(item, index = 0) {
    const { el } = this.elements;
    const selected = this.pendingSelectedItems?.has(item.id) === true;
    const active = this.activeItem?.id === item.id;
    const row = el("button", {
      type: "button",
      class: `mx-source-browser__row${selected ? " is-selected" : ""}${
        active ? " is-active" : ""
      }`,
      dataset: { sourceId: item.id },
      id: `${this.controlId}-option-${index}`,
      role: "option",
      "aria-selected": String(selected),
      tabindex: "-1",
    });
    const icon = el("i", {
      class: `${sourceIconClass(item.type)} mx-source-browser__source-icon`,
      "aria-hidden": "true",
    });
    const text = el("span", { class: "mx-source-browser__row-text" });
    text.append(
      el("span", { class: "mx-source-browser__title" }, item.title),
      el(
        "span",
        { class: "mx-source-browser__meta" },
        [
          item.type,
          item.geometry_types?.join(", ") || "no geometry",
          dimensionLabel(item),
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    row.append(
      icon,
      text,
      el("i", {
        class: selected
          ? "fa fa-check mx-source-browser__check"
          : "fa fa-circle-o mx-source-browser__check",
        "aria-hidden": "true",
      }),
    );
    return row;
  }

  onResultAction(event) {
    const id = event.target.closest("[data-source-id]")?.dataset.sourceId;
    const item = this.items?.find((candidate) => candidate.id === id);
    if (!item) return;
    this.activateItem(item, { select: true });
  }

  activateItem(item, { select = false, focus = false } = {}) {
    this.activeItem = item;
    if (select) this.updatePendingSelection(item);
    this.renderBrowserSelection();
    this.updateConfirmButton();
    this.showPreview(item);
    if (focus) {
      const row = [...this.refs.results.children].find(
        (candidate) => candidate.dataset.sourceId === item.id,
      );
      row?.focus();
      row?.scrollIntoView?.({ block: "nearest" });
    }
  }

  updatePendingSelection(item) {
    const id = item.id;
    if (this.config.multiple) {
      if (this.pendingSelectedItems.has(id))
        this.pendingSelectedItems.delete(id);
      else if (this.pendingSelectedItems.size < this.config.maxItems)
        this.pendingSelectedItems.set(id, item);
    } else {
      this.pendingSelectedItems = new Map([[id, item]]);
    }
  }

  /** @param {number | "first" | "last"} direction */
  moveActive(direction) {
    if (!this.items?.length) return;
    const current = this.items.findIndex(
      (item) => item.id === this.activeItem?.id,
    );
    const start =
      current >= 0 ? current : typeof direction === "number" && direction < 0
        ? this.items.length
        : -1;
    const next =
      direction === "first"
        ? 0
        : direction === "last"
          ? this.items.length - 1
          : Math.min(
              this.items.length - 1,
              Math.max(0, start + direction),
            );
    this.activateItem(this.items[next], {
      select: !this.config.multiple,
      focus: true,
    });
  }

  onSearchKeydown(event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const selectedIndex = this.items?.findIndex((item) =>
      this.pendingSelectedItems?.has(item.id),
    );
    const start =
      selectedIndex >= 0
        ? selectedIndex
        : event.key === "ArrowUp"
          ? (this.items?.length || 1) - 1
          : 0;
    const item = this.items?.[start];
    if (item) {
      this.activateItem(item, {
        select: !this.config.multiple,
        focus: true,
      });
    }
  }

  onResultsKeydown(event) {
    const row = event.target.closest("[data-source-id]");
    if (!row) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.moveActive(event.key === "Home" ? "first" : "last");
      return;
    }
    if (event.key === " " && this.config.multiple) {
      event.preventDefault();
      const item = this.items.find(
        (candidate) => candidate.id === row.dataset.sourceId,
      );
      if (item) this.activateItem(item, { select: true, focus: true });
      return;
    }
    if (event.key === "Enter" && !this.refs.confirm.disabled) {
      event.preventDefault();
      this.confirmSelection();
    }
  }

  renderBrowserSelection() {
    if (!this.refs?.results) return;
    for (const row of this.refs.results.children) {
      const selected =
        this.pendingSelectedItems?.has(row.dataset.sourceId) === true;
      const active = this.activeItem?.id === row.dataset.sourceId;
      row.classList.toggle("is-selected", selected);
      row.classList.toggle("is-active", active);
      row.setAttribute("aria-selected", String(selected));
      row.tabIndex = active ? 0 : -1;
      const check = row.querySelector(".mx-source-browser__check");
      if (check) {
        check.className = `${
          selected ? "fa fa-check" : "fa fa-circle-o"
        } mx-source-browser__check`;
      }
    }
  }

  confirmSelection() {
    if (!this.pendingSelectedItems?.size) return;
    this.selectedItems = new Map(this.pendingSelectedItems);
    this.commit();
    this.browserWindow?.close("selected");
  }

  async showPreview(item) {
    const token = (this.previewToken = Symbol("preview"));
    this.refs.previewMeta.replaceChildren(
      this.elements.el("strong", {}, item.title),
      this.elements.el(
        "span",
        {},
        `${item.type} · ${item.geometry_types?.join(", ") || "no geometry"}`,
      ),
      this.elements.el(
        "span",
        {},
        [
          item.editor_email || "unknown editor",
          item.date_modified
            ? `Modified ${dateLabel(item.date_modified)}`
            : "",
          dimensionLabel(item),
          Number(item.view_count) > 0
            ? `Used by ${numberLabel(item.view_count)} views`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    this.renderNeutralPreview(item);
    if (item.type !== "vector") return;
    let response;
    try {
      response = await ws.emitAsync(
        "/client/source/preview/get",
        { idSource: item.id, viewId: this.config.viewId },
        10000,
      );
    } catch {
      return;
    }
    if (token !== this.previewToken || !response?.preview) return;
    this.renderPreview(response.preview);
  }

  renderNeutralPreview(item = null) {
    this.refs.previewCanvas.replaceChildren(
      this.elements.el("i", {
        class: sourceIconClass(item?.type),
        "aria-hidden": "true",
      }),
    );
  }

  renderPreview(preview) {
    if (preview.kind !== "vector") {
      this.renderNeutralPreview();
      return;
    }
    const { svg } = this.elements;
    const graphic = svg("svg", {
      viewBox: `0 0 ${preview.width} ${preview.height}`,
      role: "img",
      "aria-label": "Source geometry preview",
    });
    for (const layer of preview.layers || []) {
      if (layer.kind === "bins") {
        const max = Math.max(1, ...layer.cells.map((cell) => cell.count));
        for (const cell of layer.cells) {
          graphic.append(
            svg("rect", {
              x: cell.x,
              y: cell.y,
              width: layer.size || 1,
              height: layer.size || 1,
              opacity: 0.2 + 0.8 * Math.sqrt(cell.count / max),
            }),
          );
        }
      }
      if (layer.kind === "coverage") {
        for (const cell of layer.cells || []) {
          graphic.append(
            svg("rect", {
              x: cell.x,
              y: cell.y,
              width: layer.size || 1,
              height: layer.size || 1,
              opacity: 0.7,
            }),
          );
        }
      }
      if (layer.kind === "path" && layer.d) {
        const group = svg("g", {
          transform: `translate(0 ${preview.height})`,
        });
        group.append(svg("path", { d: layer.d }));
        graphic.append(group);
      }
    }
    this.refs.previewCanvas.replaceChildren(graphic);
  }

  commit() {
    this.selectionHydrationGeneration += 1;
    this.renderField();
    const items = [...this.selectedItems.values()];
    this.dispatchEvent(
      new CustomEvent("mx-source-picker-change", {
        bubbles: true,
        detail: { value: this.value, items },
      }),
    );
  }
}

if (!customElements.get("mx-source-picker")) {
  customElements.define("mx-source-picker", MxSourcePickerElement);
}
