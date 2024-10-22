import { el, elButtonFa } from "../el_mapx";
import { moduleLoad } from "../modules_loader_async";
import { settings } from "../settings";
import "./style.less";
import { mapboxgl } from "../mx";
import { getMap } from "../map_helpers";
import { modal } from "../mx_helper_modal";

const def_conf = {
  url: new URL("https://photon.komoot.io/"),
  limit: 10,
  elTarget: null,
  idTarget: null,
  map: null,
  throttle: 100,
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

    this.initUI();
    await this.initTomSelect();
  }

  // Initialize the UI
  initUI() {
    // Create input group: [Tom Select dropdown][Zoom Button][Reset Button]
    this._elSearch = el("input", {
      type: "text",
      placeholder: "Type a place name...",
    });
    this._elButtonZoom = elButtonFa("gc_btn_zoom", {
      icon: "search-plus",
      mode: "icon",
      action: () => {
        this.zoomToLocation();
      },
    });
    this._elButtonReset = elButtonFa("gc_btn_reset", {
      icon: "undo",
      mode: "icon",
      action: () => {
        this.resetToLastKnownLocation();
      },
    });

    this._elTarget.classList.add("gc_container");

    // Append elements to the container
    this._elTarget.appendChild(this._elSearch);
    this._elTarget.appendChild(this._elButtonZoom);
    this._elTarget.appendChild(this._elButtonReset);
  }

  destroy() {
    if (this._ts) {
      this._ts.destroy();
      delete this._ts;
    }
    if (this._marker) {
      this._marker.remove();
      delete this._marker;
    }
  }

  async initTomSelect() {
    const TomSelect = await moduleLoad("tom-select");
    const gc = this;
    this.enableZoom(false);
    gc._ts = new TomSelect(this._elSearch, {
      create: false,
      closeAfterSelect: true,
      maxItems: 1,
      valueField: "display_name",
      labelField: "display_name",
      searchField: "display_name",
      dropdownParent: "body",
      onDropdownClose: () => {
        gc._ts.blur();
      },
      load: async (query, callback) => {
        if (!query.length) {
          return callback();
        }

        try {
          const results = await this.fetchLocations(query);
          callback(results);
        } catch (error) {
          console.warn(error);
          callback();
        }
      },
      render: {},
      loadThrottle: this.config.throttle,
      onChange: (value) => {
        if (!value) {
          this._newLocation = null;
          this.enableZoom(false);
          return;
        }
        const { feature } = gc._ts.options[value];
        const { coordinates } = feature?.geometry;

        this._lastKnownLocation = this._map.getCenter();
        this._newLocation = { lng: coordinates[0], lat: coordinates[1] };
        this.enableZoom(true);
      },
    });
  }

  displayMarker(pos) {
    const { Marker } = mapboxgl;
    // Remove existing marker if there is one
    if (this._marker) {
      this._marker.remove();
    }
    this._marker = new Marker({
      color: "var(--mx_ui_link)",
    })
      .setLngLat(pos)
      .addTo(this._map);

    // Add click event to remove the marker when clicked
    this._marker.getElement().addEventListener("click", () => {
      this._marker.remove();
      this._marker = null;
    });
  }
  enableZoom(enable = true) {
    if (enable) {
      this._elButtonZoom.classList.remove("disabled");
      this._elButtonReset.classList.remove("disabled");
    } else {
      this._elButtonZoom.classList.add("disabled");
      this._elButtonReset.classList.add("disabled");
    }
  }

  // Fetch locations from Nominatim
  async fetchGeoJSON(query) {
    const lang = settings.language;
    const url = this.config.url;

    url.searchParams.set("q", query);
    url.searchParams.set("lang", lang);
    url.searchParams.set("limit", this.config.limit);
    url.pathname = this._reverse ? "/reverse" : "/api";

    if (!this._reverse) {
      const center = this._map.getCenter();
      url.searchParams.set("lat", center.lat);
      url.searchParams.set("lon", center.lng);
    }

    const response = await fetch(url);
    return response.json();
  }

  async fetchLocations(query) {
    const fc = await this.fetchGeoJSON(query);

    return fc.features.map((feature) => {
      return {
        feature: feature,
        display_name: this.formatLocationString(feature.properties),
      };
    });
  }

  /**
   * Formats location data into a readable string
   * @param {Object} location - Location data object
   * @param {Object} options - Formatting options
   * @param {string} options.separator - Separator between elements (default: ', ')
   * @param {boolean} options.includePostcode - Whether to include postcode (default: true)
   * @returns {string} Formatted location string
   */
  formatLocationString(location, options = {}) {
    const { separator = ", ", includePostcode = true } = options;

    // Define components to include in order of preference
    const components = [];

    // Add street name if available
    if (location.name) {
      components.push(location.name);
    }

    // Add locality or city
    if (location.locality) {
      components.push(location.locality);
    } else if (location.city) {
      components.push(location.city);
    }

    // Add county if available
    if (location.county) {
      components.push(location.county);
    }

    // Add state if available
    if (location.state) {
      components.push(location.state);
    }

    // Add postcode if enabled and available
    if (includePostcode && location.postcode) {
      components.push(location.postcode);
    }

    // Add country if available (using country code if full name not available)
    if (location.country) {
      components.push(location.country);
    } else if (location.countrycode) {
      components.push(location.countrycode);
    }

    // Filter out empty strings and join with separator
    return components.filter(Boolean).join(separator).trim();
  }

  // Zoom to the selected location
  zoomToLocation() {
    if (this._newLocation) {
      this.displayMarker(this._newLocation);
      this._map.flyTo({
        center: this._newLocation,
        zoom: 14,
      });
    } else {
      console.warn("Missing new location");
    }
  }

  // Reset to the last known location
  resetToLastKnownLocation() {
    if (this._lastKnownLocation) {
      this._map.flyTo({
        center: this._lastKnownLocation,
        zoom: 10,
      });
    } else {
      console.warn("Missing previous location");
    }
  }
}
