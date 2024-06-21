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
    text: "Hello world",
    data: [{ a: "1", b: "2" }],
  };
  const { mx } = window;
  const { helpers } = mx;
  const { el, isEmpty } = helpers;

  return {
    /**
     * Called when the widget is added to the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onAdd(widget) {
      const elText = el("span", local.text);
      const elData = el("div");
      const elGroup = el("div", [elText, elData]);
      widget.setContent(elGroup);
      local._el_data = elData;
      widget.setData(local.data);
    },

    /**
     * Called when the widget is removed from the dashboard.
     * @param {Object} widget - The widget instance.
     * @returns {Promise<void>}
     */
    async onRemove(widget) {
      console.log("Widget removed:", widget.id);
    },

    /**
     * Called when/if the widget receives new data.
     * @param {Object} widget - The widget instance.
     * @param {Object} data - The new data for the widget.
     * @returns {Promise<void>}
     */
    async onData(widget, data) {
      if (isEmpty(data)) {
        data = local.data;
      }
      local._el_data.innerText = JSON.stringify(data);
    },
  };
}
