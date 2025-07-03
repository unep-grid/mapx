/**
 * Widget handler example usage
 */
function handler() {


  const { moduleLoad, getViewLegend } = mx.helpers;

  const widget_config = {

    onAdd: async function (widget) {

      const {
        TimeMapLegend,
      } = await moduleLoad("extension", 'cmems_time_map_legend');

      // Change the case number and preview.
      const { product, dataset, variable } = getCase(15);
      const elLegend = getViewLegend(widget.opt.view, { clone: false });
      const baseURL = "https://wmts.marine.copernicus.eu/teroWmts";



      const config = {
        idView: widget.opt.view.id,
        map: widget.opt.map,
        elevation: null,
        product: product,
        dataset: dataset,
        variable: variable,
        elLegend: elLegend,
        elInputs: widget.elContent,
        baseURL: baseURL,
        showLayers: false,
        showStyles: false
      };
      widget._tml = new TimeMapLegend(config);

      await widget._tml.init();

    },
    /**
     *
     * Callback called once when the widget is removed or errored
     * @param {Widget} widget Widget instance
     * @return {void}
     */
    onRemove: async function (widget) {
      widget?._tml?.destroy();
      console.log("removed");
    },
    /**
     *
     * Callback called each time data is received
     * @param {Widget} widget instance
     * @param {Array<Object>} data Array of object / table
     * @return {void}
     */
    onData: async function () { }
  };



  return widget_config;


  /// helpers tests
  function getCase(n) {
    const c = [
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m_202311",
        "variable": "chl"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-car_anfc_0.25deg_P1D-m_202311",
        "variable": "dissic"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m_202311",
        "variable": "nppv"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m_202311",
        "variable": "o2"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-car_anfc_0.25deg_P1D-m_202311",
        "variable": "ph"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m_202311",
        "variable": "no3"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m_202311",
        "variable": "po4"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
        "dataset": "cmems_mod_glo_bgc-co2_anfc_0.25deg_P1D-m_202311",
        "variable": "spco2"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
        "variable": "sithick"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_202406",
        "variable": "thetao"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_202406",
        "variable": "so"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_202406",
        "variable": "sea_water_velocity"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy-wcur_anfc_0.083deg_P1D-m_202406",
        "variable": "wo"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "dataset": "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
        "variable": "mlotst"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_WAV_001_027",
        "dataset": "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
        "variable": "VMDR_SW1"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_WAV_001_027",
        "dataset": "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
        "variable": "VTM01_SW1"
      },
      {
        "product": "GLOBAL_ANALYSISFORECAST_WAV_001_027",
        "dataset": "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
        "variable": "VHM0_SW1"
      }
    ]
    return c[n]
  }


}
