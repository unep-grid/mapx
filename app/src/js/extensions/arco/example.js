/**
 * Widget handler example usage
 * ARCO : animated ocean data from Zarr stores (zartigl)
 *
 * Other catalog layers to try :
 * - "ocean-current-velocity" (vector, particles, depth)
 * - "surface-wind" (vector, particles)
 * - "wave-stokes-drift" (vector, particles)
 * - "phytoplankton-chlorophyll" (scalar, depth)
 * - "sea-surface-temperature-anomaly" (scalar, fixed color range)
 */
function handler() {
  const { moduleLoad, getViewLegend } = mx.helpers;

  const widget_config = {
    onAdd: async function (widget) {
      const { ArcoMapLegend } = await moduleLoad(
        "extension",
        "arco_time_map_legend",
      );

      const elLegend = getViewLegend(widget.opt.view, { clone: false });

      widget._arco = new ArcoMapLegend({
        idView: widget.opt.view.id,
        map: widget.opt.map,
        layer: "sea-surface-temperature-anomaly",
        source: "geovideo",
        timeRange: { trailing: "P1M" },
        geoVideo: { autoplay: false, loop: true, playbackRate: 1 },
        elLegend: elLegend,
        elInputs: widget.elContent,
      });

      await widget._arco.init();
    },

    onRemove: async function (widget) {
      widget?._arco?.destroy();
    },

    onData: async function () {},
  };

  return widget_config;
}
