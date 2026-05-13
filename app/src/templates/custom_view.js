/**
 * Custom code view handler
 */
function handler() {
  const { mx } = window;
  const { el, isEmpty } = mx.helpers;
  const local = {
    geojson: null,
    clean: async () => {},
  };

  return {
    /**
     * On init callback
     * @param {Object} cc Custom code view runtime
     * @param {Object} cc.view MapX view object
     * @param {Object} cc.map maplibre-gl map instance
     * @param {String} cc.idView Id of the view
     * @param {String} cc.idSource Suggested id of the source
     * @param {Element} cc.elLegend Element containing the legend
     * @param {Function} cc.isClosed Test if the view has been closed
     * @param {Function} cc.isInit Test if the view has been initialized
     * @param {Function} cc.addSource Add the default source
     * @param {Function} cc.addLayer Add a layer
     * @param {Function} cc.setLegend Set legend content
     */
    onInit: async function (cc) {
      cc.setLegend(el("span", "Please wait..."));

      local.geojson = await fetchGeoJSON();

      if (cc.isClosed()) {
        console.warn("View has been closed during fetch, cancel");
        return;
      }

      if (isEmpty(local.geojson)) {
        cc.setLegend(el("span", "Data not found"));
        return;
      }

      cc.setLegend(el("span", "Hello MapX"));

      cc.addSource({
        type: "geojson",
        data: local.geojson,
      });

      cc.addLayer({
        id: cc.idView,
        type: "circle",
        source: cc.idSource,
        paint: {
          "circle-radius": 6,
          "circle-color": mx.theme.getColorThemeItem("mx_map_feature_highlight"),
        },
        filter: ["==", "$type", "Point"],
      });
    },

    /**
     * On close callback
     */
    onClose: async function () {
      await local.clean();
    },
  };

  /**
   * Demo async fetch
   */
  function fetchGeoJSON() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [6.111354, 46.213232],
          },
          properties: {
            title: "MapX Home",
            gid: 1,
          },
        });
      }, 1000);
    });
  }
}
