import { el, elButtonFa } from "../el_mapx";
import { mapboxgl } from "../mx";
import { modal } from "../mx_helper_modal";
import { isEmpty } from "../is_test";
import { shake } from "../elshake";
import { getDictItem } from "../language";
import { isArrayOfNumber } from "../is_test";
import "./style.less";

const def_conf = {
  url: new URL("https://photon.komoot.io/"),
  limit: 10,
  elTarget: null,
  map: null,
  proximity: false,
  language: "en",
  reverse: false,
  onLocationSelect: null,
  onGeoJSONSave: null,
  debounce_delay: 1000,
  timeout_duration: 10000,
  errors: {
    abord_new_query: "Abord query, new one requested",
    abord_timeout: "Abord query, timeout",
  },
  fit_padding: { top: 10, bottom: 10, left: 10, right: 10 },
};

class MarkerLocation {
  constructor(marker, feature, markers) {
    this.marker = marker;
    this.feature = feature;
    this.markers = markers;
    this.markers.add(this);
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
  constructor(config = {}) {
    this._config = {
      ...def_conf,
      ...config,
    };
    this.build().catch(console.warn);
  }

  async build() {
    const gcm = this;
    gcm._config.elTarget = el("div");
    gcm._gc = new Geocoder();

    gcm._modal = modal({
      title: getDictItem("gc_geocoder"),
      content: gcm._config.elTarget,
      onClose: () => {
        gcm._gc.destroy();
      },
    });

    await gcm._gc.init(gcm._config);
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
 * @param {Function} [config.onGeoJSONSave] - Callback when GeoJSON is saved
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
        (e) => {
          if (e.key === "Enter") {
            this.performSearch();
          }
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
    this.clear();
  }

  get query() {
    return this._elInput.value.trim();
  }

  // Debounced search method
  async performSearch() {
    const gc = this;
    const query = gc.query;

    // Handle empty query
    if (!query) {
      gc.clear();
      return;
    }
    try {
      gc.showLoading();
      const results = await gc._executeSearch(query);
      gc.displayResults(results);
    } catch (error) {
      gc.handleSearchError(error);
    } finally {
      gc.hideLoading();
    }
  }

  // Main search execution
  async _executeSearch(query) {
    // Abort any pending requests
    this.abortPendingRequest("abord_new_query");

    try {
      const results = await this.fetchLocations(query);
      return results;
    } catch (error) {
      throw error;
    }
  }

  async fetchLocations(query) {
    const fc = await this.fetchGeoJSON(query);
    if (!fc) {
      return [];
    }
    return fc.features.map((feature) => ({
      feature,
      display_name: this.formatLocationString(feature.properties),
      icon_class: this.osmNodeToIconClass(feature.properties),
    }));
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
    url.searchParams.set("lang", this.config.language);
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
      this.abortPendingRequest("abord_timeout");
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

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  abortPendingRequest(idMessage) {
    if (this._abortController) {
      this._abortController.abort(this.config.errors[idMessage] || "abord");
      this._abortController = null;
    }
  }

  handleSearchError(error) {
    const gc = this;
    gc.showError("Failed to fetch results. Please try again.");
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
    const elIcon = el("i", { class: result.icon_class });
    const elText = el("span", `${result.display_name}`);
    const elLabel = el("div", { class: "gcm--icon-container" }, [
      elIcon,
      elText,
    ]);
    const elItem = el(
      "a",
      {
        class: "list-group-item",
        href: "#",
        on: [
          "click",
          (e) => {
            e.preventDefault();
            this.handleLocationSelect(result);
          },
        ],
      },
      elLabel,
    );

    return elItem;
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

    if (this.config.onGeoJSONSave) {
      await this.config.onGeoJSONSave(geojson);
    }

    return geojson;
  }

  setResetButtonState(enabled) {
    this._elButtonBack.disabled = !enabled;
  }

  showLoading() {
    this.enable(false);
    this._elResultsList.innerHTML = "";
    this._elLoading = el(
      "div",
      { class: "list-group-item text-center" },
      el("span", "Searching"),
    );
    this._elResultsList.appendChild(this._elLoading);
  }

  enable(enable) {
    this._elSearchBtn.disabled = !enable;
    this._elInput.disabled = !enable;
  }

  hideLoading() {
    if (this._elLoading) {
      this._elLoading.remove();
      delete this._elLoading;
    }
    this.enable(true);
  }

  showError(message) {
    this._elResultsList.innerHTML = "";
    const errorEl = el(
      "div",
      {
        class: "list-group-item text-center text-danger",
      },
      message,
    );
    this._elResultsList.appendChild(errorEl);
  }

  osmNodeToIconClass(data) {
    switch (data.osm_type) {
      case "N":
        return "gcm--node";
      case "R":
        return "gcm--relation";
      case "W":
        return "gcm--way";
      default:
        return "gcm--way";
    }
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
        padding: this.config.fit_padding,
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
