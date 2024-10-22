import { el, elButtonFa } from "../el_mapx";
import { settings } from "../settings";
import { mapboxgl } from "../mx";
import { getMap } from "../map_helpers";
import { modal } from "../mx_helper_modal";

const def_conf = {
  url: new URL("https://photon.komoot.io/"),
  limit: 10,
  elTarget: null,
  idTarget: null,
  map: null,
  proximity: false,
  reverse: false,
  onLocationSelect: null,
};

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
      title: "Geocoder",
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

export class Geocoder {
  constructor() {}

  get config() {
    return this._config;
  }

  async init(config = {}) {
    this._config = {
      ...def_conf,
      ...config,
    };
    this._elTarget =
      this.config.elTarget || document.getElementById(this.config.idTarget);
    if (!this._elTarget) {
      console.warn("Geocoder : no target");
      return;
    }
    this._map = this.config.map;
    this._lastKnownLocation = null;
    this._results = [];

    this.initUI();
  }

  initUI() {
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
      placeholder: "Type a place name...",
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

    this._elSearchBtn = elButtonFa("ngc_btn_search", {
      icon: "search",
      mode: "icon",
      class: "btn btn-primary",
      action: () => this.performSearch(),
    });

    inputGroupBtn.appendChild(this._elSearchBtn);
    inputGroup.appendChild(this._elInput);
    inputGroup.appendChild(inputGroupBtn);
    panelBody.appendChild(inputGroup);

    // Create results container
    this._elResultsList = el("div", { class: "list-group" });

    // Create reset button container
    const resetContainer = el("div", { class: "panel-footer text-right" });

    this._elButtonReset = elButtonFa("ngc_btn_reset", {
      icon: "undo",
      mode: "icon",
      class: "btn btn-default",
      action: () => this.resetToLastKnownLocation(),
    });
    this._elButtonReset.disabled = true;

    resetContainer.appendChild(this._elButtonReset);

    // Assemble the components
    this._elSearchContainer.appendChild(panelBody);
    this._elSearchContainer.appendChild(this._elResultsList);
    this._elSearchContainer.appendChild(resetContainer);

    this._elTarget.appendChild(this._elSearchContainer);
  }

  destroy() {
    if (this._abord_ctrl) {
      this._abord_ctrl.abort();
    }
    if (this._marker) {
      delete this._marker;
      this._marker.remove();
    }
  }

  async performSearch() {
    const query = this._elInput.value.trim();

    if (!query) {
      this._elResultsList.innerHTML = "";
      this.setResetButtonState(false);
      return;
    }

    // Abort previous request if exists
    if (this._abord_ctrl) {
      this._abord_ctrl.abort("new query");
    }

    this.showLoading();

    try {
      const results = await this.fetchLocations(query);
      this.displayResults(results);
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      this.showError("Failed to fetch results. Please try again.");
    } finally {
      this.hideLoading();
    }
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
      return this.config.onLocationSelect(select);
    }

    this._lastKnownLocation = this._map.getCenter();
    const coordinates = result.feature.geometry.coordinates;
    this._newLocation = { lng: coordinates[0], lat: coordinates[1] };

    this.setResetButtonState(true);
    this.zoomToLocation();
  }

  setResetButtonState(enabled) {
    this._elButtonReset.disabled = !enabled;
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

  async fetchGeoJSON(query) {
    const lang = settings.language;
    const url = this.config.url;

    if (this._abord_ctrl) {
      this._abord_ctrl.abort("new query");
    }

    this._abord_ctrl = new AbortController();
    const { signal } = this._abord_ctrl;

    try {
      url.searchParams.set("q", query);
      url.searchParams.set("lang", lang);
      url.searchParams.set("limit", this.config.limit);
      url.pathname = this.config.reverse ? "/reverse" : "/api";

      if (this.config.proximity) {
        const center = this._map.getCenter();
        url.searchParams.set("lat", center.lat);
        url.searchParams.set("lon", center.lng);
      }

      const timeoutId = setTimeout(() => {
        this._abord_ctrl.abort("timeout");
      }, 10000);

      const response = await fetch(url, {
        signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (err) {
      if (err === "new query") {
        return null;
      }
      console.warn("Geocoder fetch error:", err);
      throw new Error("Failed to fetch location data");
    } finally {
      this._abord_ctrl = null;
    }
  }

  async fetchLocations(query) {
    try {
      const fc = await this.fetchGeoJSON(query);
      if (!fc) {
        return;
      }
      return fc.features.map((feature) => {
        return {
          feature: feature,
          display_name: this.formatLocationString(feature.properties),
        };
      });
    } catch (e) {
      console.warn(e);
    }
  }

  formatLocationString(location, options = {}) {
    const { separator = ", ", includePostcode = true } = options;
    const components = [];

    if (location.name) components.push(location.name);
    if (location.locality) components.push(location.locality);
    else if (location.city) components.push(location.city);
    if (location.county) components.push(location.county);
    if (location.state) components.push(location.state);
    if (includePostcode && location.postcode)
      components.push(location.postcode);
    if (location.country) components.push(location.country);
    else if (location.countrycode) components.push(location.countrycode);

    return components.filter(Boolean).join(separator).trim();
  }

  zoomToLocation() {
    if (this._newLocation) {
      this.displayMarker(this._newLocation);
      this._map.flyTo({
        center: this._newLocation,
        zoom: 14,
      });
    }
  }

  resetToLastKnownLocation() {
    if (this._lastKnownLocation) {
      if (this._marker) {
        this._marker.remove();
      }
      this._map.flyTo({
        center: this._lastKnownLocation,
        zoom: 10,
      });
      this.setResetButtonState(false);
    }
  }

  displayMarker(pos) {
    const { Marker } = mapboxgl;
    if (this._marker) {
      this._marker.remove();
    }
    this._marker = new Marker({
      color: "var(--mx_ui_link)",
    })
      .setLngLat(pos)
      .addTo(this._map);

    this._marker.getElement().addEventListener("click", () => {
      this._marker.remove();
      this._marker = null;
      this.setResetButtonState(false);
    });
  }
}
