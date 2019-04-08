const options = {
  container: 'body',
  idPalette: 'default',
  onInitColor: function(d) {
    console.log('init', d);
  },
  onPick: function(d) {
    console.log('color picked', d);
  },
  language: 'en',
  defaultColors: {
    bright: '#ffffff',
    dark: '#474747'
  },
  dict: [
    {
      id:'pk_btn_set_default_palette',
      en: 'Use the default palette'
    },
    {
      id: 'pk_panel_options',
      en: 'Options'
    },
    {
      id: 'pk_tab_settings',
      en: 'Settings'
    },
    {
      id: 'pk_tab_palettes',
      en: 'Palettes'
    },
    {
      id: 'pk_tab_edit_json',
      en: 'Edit JSON'
    },
    {
      id: 'pk_btn_add',
      en: 'add'
    },
    {
      id: 'pk_btn_close',
      en: 'close'
    },
    {
      id: 'pk_slider_n_hue_rotation',
      en: 'Number of hue rotation'
    },
    {
      id: 'pk_slider_n_colors',
      en: 'Number of colors'
    },
    {
      id: 'pk_slider_hue_shift',
      en: 'Hue shift'
    },
    {
      id: 'pk_slider_colors',
      en: 'Colors space'
    },
    {
      id: 'pk_slider_saturation',
      en: 'Saturation'
    },
    {
      id: 'pk_slider_luminosity',
      en: 'Luminosity'
    },
    {
      id: 'pk_slider_randomize',
      en: 'Randomize'
    },
    {
      id: 'pk_slider_reverse',
      en: 'Reverse'
    },
    {
      id: 'pk_slider_diverge',
      en: 'Diverge'
    }
  ],
  initPalette: {
    slidersValues: {
      inColNumber: 15,
      inColRotation: 1,
      inColShift: 0,
      inColRange: [0, 360],
      inSatRange: [1, 1],
      inLumRange: [0.5, 0.5],
      inColRandom: 0,
      inColReverse: 0,
      inColDiverge: 0
    },
    colors: [
      '#ff0000',
      '#ff6600',
      '#ffcc00',
      '#ccff00',
      '#66ff00',
      '#00ff00',
      '#00ff66',
      '#00ffcc',
      '#00ccff',
      '#0066ff',
      '#0000ff',
      '#6600ff',
      '#cc00ff',
      '#ff00cc',
      '#ff0066'
    ]
  }
};

export {options as default};
