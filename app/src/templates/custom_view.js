/**
 * Custom method for custom view available in onClose / onInit callback
 * @param {Object} cc Custom Code View
 * @param {Object} cc.view Map-x view object
 * @param {Object} cc.map mapbox-gl map instance
 * @param {String} cc.idView Id of the view
 * @param {String} cc.idSource Id of the source ( Suggested ID )
 * @param {Element} cc.elLegend Element containing the legend. Prefer cc.setLegend(...);
 * @param {Function} cc.isClosed() Test if the view has been closed, e.g. during initialisation, to prevent rendering after the view is closed.
 * @param {Function} cc.isInit() Test if the view has been initialized;
 * @param {Function} cc.addSources(source) Add source objects to the
 * @param {Function} cc.addLayer(layer) Add layer object
 * @param {Function} cc.setLegend(<Element> || <HTML>) Set legend content
 */
return {
  onClose: async function (cc) {
    /**
     * Clean
     */
    await cc._clean_local();
  },
  onInit: async function (cc) {
    /**
     * Ref to a local clean function ( that does nothing )
     * NOTE: Internal function removes already expected source and
     *       layers, based on
     *       - cc.idView
     *       - cc.idSource
     */
    cc._clean_local = cleanLocal;

    /**
     * Set text in the legend box
     */
    cc.setLegend("<span>Please wait...</span>");

    /**
     * Simulate remote data fetch ...
     */
    const geojson = await fetchGeoJSON();

    /**
     * View has been closed during fetch, cancel
     */
    if (cc.isClosed()) {
      console.warn("View has been closed during fetch, cancel");
      return;
    }

    /**
     * Update legend text
     */
    cc.setLegend("<span>Hello MapX</span>");

    /**
     * Source creation
     */
    const source = {
      type: "geojson",
      data: geojson,
    };

    cc.addSource(source);

    /**
     * Set custom layer
     */
    const layer = {
      id: cc.idView,
      type: "circle",
      source: cc.idSource,
      paint: {
        "circle-radius": 6,
        "circle-color": "#B42222",
      },
      filter: ["==", "$type", "Point"],
    };

    cc.addLayer(layer);

    /**
     * HELPERS
     */

    /*
     *  Clean up script
     *  NOTE: Layers and source are automatically removed when provided id are used
     */
    function cleanLocal() {
      console.log("Removed");
    }

    /**
     * Fake Data fetch
     */
    function fetchGeoJSON() {
      return new Promise((resolve) => {
        setTimeout(() => {
          const data = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [6.111354, 46.213232],
            },
            properties: {
              title: "Map-x Home",
            },
          };
          return resolve(data);
        }, 1000);
      });
    }
  },
};
