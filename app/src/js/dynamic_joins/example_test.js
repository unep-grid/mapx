/**
 * Template script for widget handlers
 *
 * This script provides examples of asynchronous handlers for widget lifecycle events.
 * Customize the onAdd, onRemove, and onData handlers to perform actions specific to your needs.
 *
 * Public Widget Methods:
 * @method setContent - Sets the HTML content of the widget.
 *    @param {string|Element} content - The HTML or Element content to be displayed inside the widget.
 * @method setData - Sets the data manually
 *    @async
 *    @param {Array} data - the data, as an array of object
 *
 * Public Widget Properties:
 * @property {Object} config - Gets the widget configuration.
 * @property {Object} modules - Gets the dashboard modules.
 * @property {boolean} disabled - Checks if the widget is disabled.
 * @property {Array} data - Gets the latest stored data.
 * @property {Dashboard} dashboard - Gets the dashboard instance.
 * @property {Map} map - Gets the map instance.
 * @property {View} view - Gets the linked view.
 * @property {boolean} destroyed - Checks if the widget is destroyed.
 * @property {boolean} ready - Checks if the widget is ready.
 * @property {number} height - Gets/Set height
 * @property {number} width - Gets/Set width
 */
function handler() {
  /**
   * local object for ref accross handlers
   */
  const local = {
    dj: {},
  };

  const { getViewLegend, DynamicJoin } = mx.helpers;

  return {
    /**
     * Called when the widget is added to the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onAdd(widget) {
      const view = widget.view;

      local.dj = new DynamicJoin(widget.map);
      await local.dj.init({
        // UI containers
        elSelectContainer: widget.elContent,
        elLegendContainer: getViewLegend(view.id, { clone: false }),

        // Styling options
        palette: "OrRd",
        stat: "quantile",
        classes: 5,
        color_na: "#ccc",
        aggregateFn: "max", // none, first, last, sum, max, min, median, mode

        // Data sources
        idSourceGeom: "mx_ympyi_yimwa_uvvlo_waygb_omaei",
        idSourceData: "mx_vxu1l_jzbse_gu2tq_f1b82_xc36u",
        dataUrl: "https://api.staging.mapx.org/get/source/table/attribute?id=mx_vxu1l_jzbse_gu2tq_f1b82_xc36u&attributes=gid_1,scenario,parameter,value,year",

        // Field configuration (NEW STREAMLINED API)
        staticFilters: [
          {
            field: "parameter",
            operator: "==",
            value: "x"  
          }
        ], // Static filtering fields (can be extended for complex conditions)
        aggregateBy: ["parameter", "scenario"], // Fields for grouping + aggregation
        aggregateField: "value",
        fieldJoinOn: ["gid_1", "gid_1"], // [dataField, featureProperty]

        // Interactive filter inputs (NEW FEATURE)
        dynamicFilters: [
 
          {
            name: "scenario",
            type: "dropdown",
            default: "b" // Default to specific scenario if available
          },
        
           {
             name: "year",
             type: "range-slider",
             min: 1980,
             max: 2000,
             step: 1,
             mode: "integer",
             default: [1980, 2000]
           }
        ],

        // Callback functions (NEW FEATURE)
        onRender: function (table, filters, config) {
          console.log("Data processed:", {
            aggregatedTable: table,
            currentFilters: filters,
            configuration: config
          });
          // You can pass this data to other tools or update other widgets
        },

        onMapClick: function (features) {
          console.log("Map clicked, features:", features);
          // Handle map interactions, show popups, update other components, etc.
          if (features && features.length > 0) {
            const feature = features[0];
            console.log("Clicked feature properties:", feature.properties);
          }
        }
      });
    },

    /**
     * Called when the widget is removed from the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onRemove(widget) {
      if (local?.dj?.destroy) {
        local.dj.destroy();
      }
    },

    /**
     * Called when/if the widget receives new data.
     * @param {Object} widget - The widget instance.
     * @param {Object} data - The new data for the widget.
     * @returns {Promise<void>}
     */
    async onData(widget, data) { },
  };
}

