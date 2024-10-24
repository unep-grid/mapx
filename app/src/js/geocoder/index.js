import { el, elButtonFa } from "../el_mapx";
import { settings } from "../settings";
import { mapboxgl } from "../mx";
import { getMap } from "../map_helpers";
import { modal } from "../mx_helper_modal";
import { spatialDataToView } from "../mx_helper_map_dragdrop";
import { isEmpty } from "../is_test";
import { shake } from "../elshake";
import { viewsListAddSingle } from "../views_list_manager";
import { getDictItem } from "../language";
import { isArrayOfNumber } from "../is_test";
import { debouncePromise } from "../mx_helper_misc";
import "./style.less";

const def_conf = {
  url: new URL("https://photon.komoot.io/"),
  limit: 50,
  elTarget: null,
  map: null,
  proximity: false,
  reverse: false,
  onLocationSelect: null,
  debounce_delay: 300,
  timeout_duration: 10000,
};

class MarkerLocation {
  constructor(marker, feature, markers) {
    this.marker = marker;
    this.feature = feature;
    this.markers = markers;
    this.markers.add(this);
    this.performSearch = debouncePromise(this.performSearch, 1000);
  }

  remove() {
    if (this.marker) {
      this.marker.remove();
      this.markers.delete(this);
    }
  }

  toGeoJSON() {
    return this.feature;
  }
}

export class GeocoderModal {
  constructor() {
    this.build().catch(console.warn);
  }

  async build() {
    const gcm = this;
    const elTarget = el("div");
    const map = getMap();
    gcm._gc = new Geocoder();

    gcm._modal = modal({
      title: getDictItem("gc_geocoder"),
      content: elTarget,
      onClose: () => {
        gcm._gc.destroy();
      },
    });

    await gcm._gc.init({
      map: map,
      elTarget: elTarget,
    });
  }
}

/**
 * Geocoder widget using Photon API
 * @class
 * @param {Object} [config] - Configuration object
 * @param {URL} [config.url=https://photon.komoot.io/] - Geocoding service URL
 * @param {number} [config.limit=10] - Max results
 * @param {HTMLElement} config.elTarget - Container element
 * @param {Object} config.map - Mapbox map instance
 * @param {boolean} [config.proximity=false] - Use map center for biasing results
 * @param {boolean} [config.reverse=false] - Reverse geocoding mode
 * @param {Function} [config.onLocationSelect] - Callback when location selected
 */
export class Geocoder {
  constructor() {
    this._markers = new Set();
  }

  get config() {
    return this._config;
  }

  async init(config = {}) {
    this._config = {
      ...def_conf,
      ...config,
    };
    this._elTarget = this.config.elTarget;
    if (!this._elTarget) {
      throw new Error("Geocoder : no target");
    }
    this._map = this.config.map;
    this._lastKnownLocation = null;
    this._results = [];

    await this.initUI();
  }

  async initUI() {
    this._elTarget.classList.add("gcm_container");
    // Create search container
    this._elSearchContainer = el("div", { class: "panel panel-default" });

    // Create panel body for search
    const panelBody = el("div", { class: "panel-body" });

    // Create input group
    const inputGroup = el("div", { class: "input-group" });

    this._elInput = el("input", {
      type: "text",
      class: "form-control",
      placeholder: await getDictItem("gc_search_placeholder"),
      on: [
        "keypress",
        () => {
          this.performSearch();
        },
      ],
    });

    const inputGroupBtn = el("span", { class: "input-group-btn" });

    this._elSearchBtn = elButtonFa("gc_btn_search", {
      icon: "search",
      mode: "icon-text",
      action: () => this.performSearch(),
    });

    inputGroupBtn.appendChild(this._elSearchBtn);
    inputGroup.appendChild(this._elInput);
    inputGroup.appendChild(inputGroupBtn);
    panelBody.appendChild(inputGroup);

    // Create results container
    this._elResultsList = el("div", { class: "list-group" });

    // Create buttons container
    const buttonsContainer = el("div", {
      class: ["btn-group"],
    });
    const elPanelFooter = el(
      "div",
      {
        class: ["panel-footer"],
      },
      [buttonsContainer],
    );

    // Add clear markers button
    this._elButtonClear = elButtonFa("gc_btn_clear", {
      icon: "trash",
      mode: "text_icon",
      action: () => this.clear(),
    });

    // Add save button
    this._elButtonSave = elButtonFa("gc_btn_save", {
      icon: "save",
      mode: "text_icon",
      action: () => this.saveToGeoJSON(),
    });

    // Add reset button
    this._elButtonBack = elButtonFa("gc_btn_back", {
      icon: "undo",
      mode: "text_icon",
      action: () => this.resetToLastKnownLocation(),
    });
    this._elButtonBack.disabled = true;

    buttonsContainer.appendChild(this._elButtonClear);
    buttonsContainer.appendChild(this._elButtonSave);
    buttonsContainer.appendChild(this._elButtonBack);

    // Assemble the components
    this._elSearchContainer.appendChild(panelBody);
    this._elSearchContainer.appendChild(this._elResultsList);
    this._elSearchContainer.appendChild(elPanelFooter);

    this._elTarget.appendChild(this._elSearchContainer);
  }

  destroy() {
    if (this._abord_ctrl) {
      this._abord_ctrl.abort();
    }
    this.clearAllMarkers();
  }

  get query() {
    return this._elInput.value.trim();
  }

  // Debounced search method
  async performSearch() {
    const query = this.query;

    // Clear existing timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    // Handle empty query
    if (!query) {
      this._elResultsList.innerHTML = "";
      this.setResetButtonState(false);
      return;
    }

    // Set up new debounced search
    return new Promise((resolve) => {
      this._debounceTimer = setTimeout(async () => {
        try {
          this.showLoading();
          const results = await this._executeSearch(query);
          this.displayResults(results);
          resolve(results);
        } catch (error) {
          this.handleSearchError(error);
          resolve(null);
        } finally {
          this.hideLoading();
        }
      }, this.config.debounce_delay);
    });
  }

  // Main search execution
  async _executeSearch(query) {
    // Abort any pending requests
    this.abortPendingRequest();

    try {
      const results = await this.fetchLocations(query);
      return results;
    } catch (error) {
      throw error;
    }
  }

  async fetchLocations(query) {
    try {
      const fc = await this.fetchGeoJSON(query);
      if (!fc) {
        return [];
      }
      return fc.features.map((feature) => ({
        feature,
        display_name: this.formatLocationString(feature.properties),
      }));
    } catch (error) {
      console.warn("Location fetch error:", error);
      throw error;
    }
  }

  async fetchGeoJSON(query) {
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    try {
      const url = this.buildSearchURL(query);
      const response = await this.makeRequest(url, signal);
      return response;
    } catch (error) {
      this.handleNetworkError(error);
    } finally {
      this._abortController = null;
    }
  }

  buildSearchURL(query) {
    const url = new URL(this.config.url);
    url.searchParams.set("q", query);
    url.searchParams.set("lang", settings.language);
    url.searchParams.set("limit", this.config.limit);
    url.pathname = this.config.reverse ? "/reverse" : "/api";

    if (this.config.proximity) {
      const center = this._map.getCenter();
      url.searchParams.set("lat", center.lat);
      url.searchParams.set("lon", center.lng);
    }

    return url;
  }

  async makeRequest(url, signal) {
    const timeoutId = setTimeout(() => {
      if (this._abortController) {
        this._abortController.abort("timeout");
      }
    }, this.config.timeout_duration);

    try {
      const response = await fetch(url, {
        signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  abortPendingRequest() {
    if (this._abortController) {
      this._abortController.abort("new query");
      this._abortController = null;
    }
  }

  handleSearchError(error) {
    if (error.name === "AbortError") {
      return; // Silently handle aborted requests
    }
    this.showError("Failed to fetch results. Please try again.");
    console.error("Search error:", error);
  }

  handleNetworkError(error) {
    if (error.name === "AbortError") {
      if (error.message === "timeout") {
        throw new Error("Request timed out");
      }
      return null; // Return null for aborted requests
    }
    throw error;
  }

  displayResults(results) {
    this._elResultsList.innerHTML = "";
    this._results = results;

    if (!results || results.length === 0) {
      const noResults = el("div", {
        class: "list-group-item text-center text-muted",
      });
      noResults.textContent = "No results found";
      this._elResultsList.appendChild(noResults);
      return;
    }

    results.forEach((result) => {
      const resultItem = this.createResultItem(result);
      this._elResultsList.appendChild(resultItem);
    });
  }

  createResultItem(result) {
    const item = el("a", {
      class: "list-group-item",
      href: "#",
      on: [
        "click",
        (e) => {
          e.preventDefault();
          this.handleLocationSelect(result);
        },
      ],
    });

    item.textContent = result.display_name;
    return item;
  }

  handleLocationSelect(result) {
    if (this.config.onLocationSelect) {
      return this.config.onLocationSelect(result);
    }

    this._lastKnownLocation = this._map.getBounds();
    const extent = result.feature.properties.extent;
    if (!extent) {
      this._newLocation = result.feature.geometry.coordinates;
    } else {
      this._newLocation = extent;
    }
    this.setResetButtonState(true);
    this.addMarker(result);
    this.zoomToLocation();
  }

  addMarker(result) {
    const { Marker } = mapboxgl;
    const marker = new Marker({
      color: "var(--mx_ui_link)",
    })
      .setLngLat(result.feature.geometry.coordinates)
      .addTo(this._map);

    const markerLocation = new MarkerLocation(
      marker,
      result.feature,
      this._markers,
    );

    marker.getElement().addEventListener("click", () => {
      this._markers.delete(markerLocation);
      markerLocation.remove();
      if (this._markers.size === 0) {
        this.setResetButtonState(false);
      }
    });

    return markerLocation;
  }

  clear() {
    this.clearResults();
    this.clearAllMarkers();
  }
  clearResults() {
    this._elResultsList.innerHTML = "";
    this._elInput.value = "";
  }
  clearAllMarkers() {
    this._markers.forEach((markerLocation) => markerLocation.remove());
    this._markers.clear();
    this.setResetButtonState(false);
  }

  async saveToGeoJSON() {
    const features = Array.from(this._markers).map((markerLocation) =>
      markerLocation.toGeoJSON(),
    );

    if (isEmpty(features)) {
      shake(this._elButtonSave);
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: features,
    };

    const view = await spatialDataToView({
      title: `Geocode Result ${new Date().toLocaleDateString()}`,
      fileName: "geocode_result",
      fileType: "geojson",
      data: geojson,
      save: true,
    });

    await viewsListAddSingle(view, {
      open: true,
    });

    console.log("Saved GeoJSON:", geojson);
    return geojson;
  }

  setResetButtonState(enabled) {
    this._elButtonBack.disabled = !enabled;
  }

  showLoading() {
    this._elResultsList.innerHTML = "";
    const loadingEl = el("div", { class: "list-group-item text-center" });
    loadingEl.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Searching...';
    this._elResultsList.appendChild(loadingEl);
  }

  hideLoading() {
    const loadingEl = this._elResultsList.querySelector(".fa-spinner");
    if (loadingEl) {
      loadingEl.closest(".list-group-item").remove();
    }
  }

  showError(message) {
    this._elResultsList.innerHTML = "";
    const errorEl = el("div", {
      class: "list-group-item text-center text-danger",
    });
    errorEl.textContent = message;
    this._elResultsList.appendChild(errorEl);
  }

  /**
   * Formats a place object into a readable address string
   * @param {Object} placeData - Object containing address components
   * @param {Object} [options={}] - Formatting options
   * @param {string} [options.separator=", "] - Separator between address components
   * @param {boolean} [options.includePostcode=true] - Whether to include postal code
   * @returns {string} Formatted address string
   */
  formatLocationString(placeData, options = {}) {
    const { separator = ", ", includePostcode = true } = options;

    const components = [];

    if (placeData.name) {
      components.push(placeData.name);
    }

    if (placeData.locality) {
      components.push(placeData.locality);
    } else if (placeData.city) {
      components.push(placeData.city);
    }

    if (placeData.county) {
      components.push(placeData.county);
    }

    if (placeData.state) {
      components.push(placeData.state);
    }

    if (includePostcode && placeData.postcode) {
      components.push(placeData.postcode);
    }

    if (placeData.country) {
      components.push(placeData.country);
    } else if (placeData.countrycode) {
      components.push(placeData.countrycode);
    }

    return components.filter(Boolean).join(separator).trim();
  }

  goTo(loc) {
    const isCoord = isArrayOfNumber(loc) && loc.length === 2;

    if (isCoord) {
      this._map.flyTo({
        center: { lng: loc[0], lat: loc[1] },
        zoom: 14,
      });
    } else {
      this._map.fitBounds(loc, {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        linear: false,
        duration: 2000,
      });
    }
  }

  zoomToLocation() {
    if (this._newLocation) {
      this.goTo(this._newLocation);
    }
  }

  resetToLastKnownLocation() {
    if (this._lastKnownLocation) {
      this.goTo(this._lastKnownLocation);
      this.setResetButtonState(false);
    }
  }
}
