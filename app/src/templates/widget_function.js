/**
 * Widget handler
 */
function handler() {
  return {
    /**
     * Callback called once when the widget is added
     * @param { Widget } widget - The widget instance.
     * @property { Object } widget.opt - Widget options
     * @property { Object } widget.opt.map - The map.
     * @property { Object } widget.opt.view - The view
     * @property { Object } widget.opt.dashboard - The dashboard instance
     * @property { string } widget.id - The ID of the widget.
     * @property { HTMLElement } widget.elContent - The content element
     * @property { Object } widget.modules - The modules
     * @property { Array } widget.data - The current data array
     * @property { boolean } widget.destroyed - Flag for destroyed widget.
     * @property { boolean } widget.initialized - Flag for initialized widget.
     * @return { void }
     */
    onAdd: async function (widget) {
      /*
       * Prepare data
       */
      const h = mx.helpers; // Reference to mapx helpers.
      const s = h.svg; // build svg in javascript
      const csvjson = await h.moduleLoad("csvjson"); // Load module CSV
      const data = csvjson.toObject("key,value\nhello,10"); // Parse CSV;
      const item = data[0];

      /**
       * Build simple SVG
       */
      const W = widget.width;
      const H = widget.height;

      const svg = s("svg", {
        width: W,
        height: H,
        viewBox: `0 0  ${W} ${H}`,
      });

      const circle = s(
        "circle",
        {
          cx: W / 2,
          cy: H / 2,
          r: item.value,
          style: {
            fill: "var(--mx_ui_background_contrast)",
            stroke: "var(--mx_ui_border)",
            strokeWidth: "2px",
          },
        },
        s("animate", {
          attributeName: "r",
          values: `${item.value};${W};${item.value}`,
          repeatCount: "indefinite",
          dur: "2s",
        })
      );
      const txt = s(
        "text",
        {
          x: W / 2,
          y: H / 2,
          "dominant-baseline": "middle",
          "text-anchor": "middle",
          style: {
            fill: "var(--mx_ui_text)",
          },
        },
        item.key
      );

      /**
       * Append nodes
       */
      svg.appendChild(circle);
      svg.appendChild(txt);
      widget.elContent.appendChild(svg);

      /**
       * References
       */
      widget._txt = txt; // keep ref for text update;
      widget._svg = svg; // kep ref for SVG update;
    },
    /**
     *
     * Callback called once when the widget is removed or errored
     * @param {Widget} widget Widget instance
     * @return {void}
     */
    onRemove: async function (widget) {
      widget._svg.remove();
      console.log("removed");
    },
    /**
     *
     * Callback called each time data is received
     * @param {Widget} widget instance
     * @param {Array<Object>} data Array of object / table
     * @return {void}
     */
    onData: async function (widget, data) {
      /**
       * Do something with the data:
       * - Update sizes, text, etc...
       */
      console.log("data received", data);
      const l = data.length;
      widget._txt.textContent = `Received ${l} item${l > 1 ? "s" : ""}`;
    },
  };
}
