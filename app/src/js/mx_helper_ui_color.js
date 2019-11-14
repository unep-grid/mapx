/**
 * Set MapX ui and map colorscheme.
 * TODO:
 * - Generalize this. Default in mgl settings
 * - Map modifier object as an option
 *
 * @param {Object} o options
 * @param {String} o.id map id
 * @param {Object} o.colors Intial colors scheme.
 *
 */
export function setUiColorScheme(o) {
  var mx_colors; // colors from stylesheet from the rule ".mx *";
  var init = false;
  var map = mx.maps[o.id || mx.settings.map.id].map;
  var c = o.colors;
  init = c !== undefined && mx.settings.colors === undefined;
  c = c || {};

  mx.settings.colors = c;

  /**
   * Extract main rules. NOTE: this seems fragile, find another technique
   */
  var styles = document.styleSheets;
  for (var i = 0, iL = styles.length; i < iL; i++) {
    var rules = styles[i].rules || styles[i].cssRules || [];
    for (var j = 0, jL = rules.length; j < jL; j++) {
      if (rules[j].selectorText === '.mx *') {
        mx_colors = rules[j];
      }
    }
  }
  /*
   * Hard coded default if no stylsheet defined or user defined colors is set
   */
  c.mx_ui_text = c.mx_ui_text || 'hsl(0, 0%, 21%)';
  c.mx_ui_text_faded = c.mx_ui_text_faded || 'hsla(0, 0%, 21%, 0.6)';
  c.mx_ui_hidden = c.mx_ui_hidden || 'hsla(196, 98%, 50%,0)';
  c.mx_ui_border = c.mx_ui_border || 'hsl(0, 0%, 61%)';
  c.mx_ui_background = c.mx_ui_background || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_ui_shadow = c.mx_ui_shadow || 'hsla(0, 0%, 60%, 0.3)';
  c.mx_map_text = c.mx_map_text || 'hsl(0, 0%, 21%)';
  c.mx_map_text_outline = c.mx_map_text_outline || 'hsla(196, 98%, 50%,0)';
  c.mx_map_background = c.mx_map_background || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_map_mask = c.mx_map_mask || 'hsla(0, 0%, 60%, 0.3)';
  c.mx_map_water = c.mx_map_water || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_map_road = c.mx_map_road || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_map_road_border = c.mx_map_road_border || 'hsl(0, 0%, 61%)';
  c.mx_map_building = c.mx_map_building || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_map_admin = c.mx_map_admin || 'hsla(0, 0%, 97%, 0.95)';
  c.mx_map_admin_disputed = c.mx_map_admin_disputed || 'hsla(0, 0%, 97%, 0.95)';

  /**
   * create / update input color
   */

  var inputs = document.getElementById('inputThemeColors');

  //inputs.classList.add("mx-views-content");

  if (inputs && inputs.children.length > 0) {
    mx.helpers.forEachEl({
      els: inputs.children,
      callback: function(el) {
        var colorIn = el.querySelector("[type='color']").value;
        var alphaIn = el.querySelector("[type='range']").value;
        var idIn = el.id;
        c[idIn] = mx.helpers.hex2rgba(colorIn, alphaIn);
      }
    });
  }

  if (init) {
    inputs.innerHTML = '';
    var inputType = ['color', 'range'];
    for (var cid in c) {
      var container = document.createElement('div');
      container.classList.add('mx-settings-color-container');
      container.id = cid;
      var container_inputs = document.createElement('div');
      var lab = document.createElement('span');
      lab.classList.add('mx-settings-color-label');
      container_inputs.id = cid + '_inputs';
      container_inputs.className = 'mx-settings-colors-input';
      var color = mx.helpers.color2obj(c[cid]);

      for (var ityp = 0, itypL = inputType.length; ityp < itypL; ityp++) {
        var typ = inputType[ityp];
        var input = document.createElement('input');
        input.onchange = mx.helpers.setUiColorScheme;
        input.type = typ;
        input.id = cid + '_' + typ;
        if (typ === 'range') {
          input.min = 0;
          input.max = 1;
          input.step = 0.1;
        }
        if (typ === 'color') {
          input.style.maxWidt = '60px';
          input.classList.add('jscolor');
        }
        input.value = typ === 'range' ? color.alpha : color.color;
        container_inputs.appendChild(input);
      }

      setLabelTitle(cid, lab);
      lab.dataset.lang_key = cid;
      lab.setAttribute('aria-label', cid);
      lab.classList.add('hint--right');
      lab.for = cid;
      container.appendChild(lab);
      container.appendChild(container_inputs);
      inputs.appendChild(container);
    }
  }

  /*
   * helpers
   */
  function setLabelTitle(id, label) {
    mx.helpers.getDictItem(id).then(function(title) {
      label.innreHTML = title;
    });
  }

  /**
   * Ui color
   */

  for (var col in c) {
    mx_colors.style.setProperty('--' + col, c[col]);
  }

  /**
   * Map colors NOTE: PUT THIS OBJECT AS THEME
   */

  var layers = [
    {
      id: ['background'],
      paint: {
        'background-color': c.mx_map_background
      }
    },
    {
      id: ['maritime'],
      paint: {
        'line-color': c.mx_map_background
      }
    },
    {
      id: ['water'],
      paint: {
        'fill-color': c.mx_map_water,
        'fill-outline-color': c.mx_map_water
      }
    },
    {
      id: ['waterway'],
      paint: {
        'line-color': c.mx_map_water
      }
    },
    {
      id: ['country-code'],
      paint: {
        'fill-color': c.mx_map_mask
      }
    },
    {
      id: [
        'road-street-low',
        'road-street_limited-low',
        'road-path',
        'road-construction',
        'road-trunk_link',
        'road-motorway_link',
        'road-service-link-track',
        'road-street_limited',
        'road-street',
        'road-secondary-tertiary',
        'road-primary',
        'road-trunk',
        'road-motorway',
        'road-rail',
        'road-rail-tracks'
      ],
      paint: {
        'line-color': c.mx_map_road
      }
    },
    {
      id: ['road-pedestrian-polygon', 'road-polygon'],
      paint: {
        'fill-color': c.mx_map_road
      }
    },
    {
      id: [
        'road-pedestrian-polygon-case',
        'road-service-link-track-case',
        'road-street_limited-case',
        'road-street-case',
        'road-secondary-tertiary-case',
        'road-primary-case',
        'road-motorway_link-case',
        'road-trunk_link-case',
        'road-trunk-case',
        'road-motorway-case'
      ],
      paint: {
        'line-color': c.mx_map_road_border
      }
    },
    {
      id: ['building'],
      paint: {
        'fill-color': c.mx_map_building
      }
    },
    {
      id: ['boundaries_2', 'boundaries_3-4'],
      paint: {
        'line-color': c.mx_map_admin
      }
    },
    {
      id: ['boundaries_disputed'],
      paint: {
        'line-color': c.mx_map_admin_disputed
      }
    },
    {
      id: [
        'project-label',
        'place-label-capital',
        'place-label-city',
        'country-label',
        'road-label',
        'road-label-small',
        'road-label-medium',
        'road-label-large'
      ],
      paint: {
        'text-color': c.mx_map_text,
        'text-halo-color': c.mx_map_text_outline
      }
    }
  ];

  for (var k = 0, kL = layers.length; k < kL; k++) {
    var grp = layers[k];
    for (var l = 0, lL = grp.id.length; l < lL; l++) {
      var lid = grp.id[l];
      var lay = map.getLayer(lid);
      if (lay) {
        for (var p in grp.paint) {
          try {
            map.setPaintProperty(lid, p, grp.paint[p]);
          } catch (err) {
            console.log({
              err: err,
              id: lid,
              property: p
            });
          }
        }
      }
    }
  }
}
