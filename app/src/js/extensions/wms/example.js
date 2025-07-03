/**
 * WMS Widget handler example usage
 */
function handler() {
  const { moduleLoad, getViewLegend } = mx.helpers;

  const widget_config = {
    onAdd: async function (widget) {
      const { WMSTimeMapLegend } = await moduleLoad("extension", "wms_time_map_legend");

      const elLegend = getViewLegend(widget.opt.view, { clone: false });

      // Example configuration for a WMS service with time dimension
      const config = {
        idView: widget.opt.view.id,
        map: widget.opt.map,
        baseURL: "https://wrd-geoserver-ikicongo.azurewebsites.net/geoserver/ows",
        layerName: "iki-congo:CDI", // The WMS layer name
        elLegend: elLegend,
        elInputs: widget.elContent,
        showLayers: false, // Hide layer selector since we specify layerName
        showStyles: true,
        showIncrement: true,
      };

      widget._tml = new WMSTimeMapLegend(config);
      await widget._tml.init();
    },

    /**
     * Callback called once when the widget is removed or errored
     * @param {Widget} widget Widget instance
     * @return {void}
     */
    onRemove: async function (widget) {
      widget?._tml?.destroy();
      console.log("WMS Time Map Legend removed");
    },

    /**
     * Callback called each time data is received
     * @param {Widget} widget instance
     * @param {Array<Object>} data Array of object / table
     * @return {void}
     */
    onData: async function () {},
  };

  return widget_config;
}

/**
 * Alternative example for multiple WMS layers
 */
function handlerMultiLayer() {
  const { moduleLoad, getViewLegend } = mx.helpers;

  const widget_config = {
    onAdd: async function (widget) {
      const { WMSTimeMapLegend } = await moduleLoad("extension", "wms_time_map_legend");

      const elLegend = getViewLegend(widget.opt.view, { clone: false });

      // Example with layer selection enabled
      const config = {
        idView: widget.opt.view.id,
        map: widget.opt.map,
        baseURL: "https://your-wms-server.com/geoserver/wms",
        layerName: "workspace:layer1", // Default layer
        elLegend: elLegend,
        elInputs: widget.elContent,
        showLayers: true, // Enable layer selector
        showStyles: true,
        showIncrement: true,
        showElevation: true, // If your WMS has elevation dimension
      };

      widget._tml = new WMSTimeMapLegend(config);
      await widget._tml.init();
    },

    onRemove: async function (widget) {
      widget?._tml?.destroy();
      console.log("WMS Time Map Legend removed");
    },

    onData: async function () {},
  };

  return widget_config;
}
