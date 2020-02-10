import {el} from '@fxi/el';
import * as color_utils from './../color_utils';
import {ListenerStore} from './../listener_store/index.js';
import {getDictItem} from './../mx_helper_language.js';
import './style.css';
import * as themes from './presets.js';

const global = {
  elStyle: null,
  elInputsContainer: null,
  map: null,
  themes: themes,
  idThemeDefault: 'mapx',
  idTheme: null,
  colors: null,
  debug: false
};

class Theme {
  constructor(opt) {
    const t = this;
    t.opt = Object.assign({}, global, opt);
    t.inputs = [];
    t.init();
  }

  init() {
    const t = this;
    const elContainer = t.opt.elInputsContainer;
    const hasContainer = elContainer instanceof Element;
    t.ls = new ListenerStore();

    if (!global.elStyle) {
      global.elStyle = el('style', {
        type: 'text/css'
      });
      document.head.appendChild(global.elStyle);
    }
    if (t.opt.idTheme) {
      t._id_theme = t.opt.idTheme;
    }
    if (!t.opt.colors) {
      t.opt.colors = t.getColorsByThemeId();
    } else {
      t.opt.colors = t.sanitizeColors(t.opt.colors);
    }
    if (hasContainer) {
      t.ls.addListener({
        bind: t,
        target: elContainer,
        callback: t._updateFromInput,
        group: 'base',
        type: 'change',
        debounce: true,
        debounceTime: 200
      });
      t.buildInputs();
    }
    t.setColors();
  }
  get id_theme() {
    return this._id_theme;
  }

  destroy() {
    const t = this;
    t.ls.destroy();
    if (global.elStyle) {
      global.elStyle.remove();
    }
    if (t.elInputContainer) {
      t.elInputsContainer.remove();
    }
  }

  getColorsByThemeId(id) {
    const t = this;
    return t.opt.themes[id || t.opt.idTheme || t.opt.idThemeDefault];
  }
  setColorsByThemeId(id) {
    const t = this;
    id = id || t.opt.idThemeDefault;
    const colors = t.getColorsByThemeId(id);
    if (colors) {
      t._id_theme = id;
      t.setColors(colors);
      t.buildInputs();
    }
  }

  sanitizeColors(colors) {
    const t = this;
    const isValidInputColors = t.validateColors(colors);

    /* case valid */
    if (isValidInputColors) {
      return colors;
    }

    /* case json text */
    if (!isValidInputColors && isJsonTxt(colors)) {
      const colors_json = JSON.stringify(colors);
      if (t.validateColors(colors_json)) {
        return colors_json;
      }
    }

    /* case encoded json text */
    if (!isValidInputColors && isBase64Json(colors)) {
      const colors_b64 = b64ToJson(colors);
      if (t.validateColors(colors_b64)) {
        return colors_b64;
      }
    }
    return null;
  }

  validateColors(colors) {
    const t = this;
    const start = performance.now();
    try {
      const valid =
        colors instanceof Object &&
        Object.keys(colors).reduce(
          (a, cid) => a && !!color_utils.rgba2hex(colors[cid]),
          true
        ) &&
        template_layers(colors) &&
        template_css(colors) &&
        true;
      if (t.opt.debug) {
        console.log(`Validated in ${performance.now() - start} [ms]`);
      }
      return valid;
    } catch (e) {
      console.warn('Invalid colors.', e);
      return false;
    }
  }

  setColorsByThemeNext() {
    const t = this;
    const idCurrent = t.id_theme;
    const idsTheme = Object.keys(t.opt.themes);
    let pos = idsTheme.indexOf(idCurrent);
    if (pos === -1) {
      pos = 0;
    }
    if (pos + 1 <= idsTheme.length - 1) {
      pos++;
    } else {
      pos = 0;
    }
    t.setColorsByThemeId(idsTheme[pos]);
  }

  setColors(colors) {
    const t = this;
    const default_colors = t.getColorsByThemeId();
    const new_colors = Object.assign(
      {},
      default_colors,
      colors || t.opt.colors
    );
    const validColors = t.validateColors(new_colors);
    if (validColors) {
      t.opt.colors = new_colors;
      t._updateCss();
      t._updateMap();
    }
  }
  _updateCss() {
    const t = this;
    global.elStyle.textContent = template_css(t.opt.colors);
  }
  _updateMap() {
    const t = this;
    const map = t.opt.map;
    if (!map.isStyleLoaded() && !t._map_wait_load) {
      t._map_wait_load = true;
      t.ls.addListenerOnce({
        target: map,
        type: 'load',
        bind: t,
        callback: t._updateMap
      });
      return;
    }
    const layers = template_layers(t.opt.colors);
    layers.forEach((grp) => {
      grp.id.forEach((id) => {
        const layer = map.getLayer(id);
        if (!layer) {
          return console.warn(`Layer ${id} not found`);
        }
        const paint = grp.paint;
        for (var p in paint) {
          map.setPaintProperty(id, p, paint[p]);
        }
      });
    });
  }
  _updateFromInput() {
    const t = this;
    t.opt.colors = t.getColorsFromInputs();
    t.setColors();
  }
  _buildInputGroup(cid) {
    const t = this;
    const colors = t.opt.colors;
    const inputType = ['color', 'range'];
    let elInputGrp, elLabel;
    const color = color_utils.color2obj(colors[cid]);
    return el(
      'div',
      {
        id: cid,
        class: ['mx-theme-color-container']
      },
      (elLabel = el(
        'label',
        {
          class: ['mx-theme-color-label', 'hint--right'],
          dataset: {lang_key: cid},
          'aria-label': cid,
          title : cid,
          for: `${cid}_inputs`
        },
        getDictItem(cid)
      )),
      (elInputGrp = el(
        'div',
        {
          class: ['mx-theme-colors-input']
        },
        inputType.map((type) => {
          const isRange = type === 'range';
          const config = {
            id: `${cid}_inputs`,
            type: type,
            dataset: {
              action: 'update',
              param: isRange ? 'alpha' : 'hex',
              id: cid
            }
          };
          if (isRange) {
            config.min = 0;
            config.max = 1;
            config.step = 0.1;
          } else {
            config.style = {maxWidth: '60px'};
          }
          const elInput = el('input', config);
          elInput.value = isRange ? color.alpha : color.color;
          t.inputs.push(elInput);
          return elInput;
        })
      ))
    );
  }
  buildInputs() {
    const t = this;
    const colors = t.opt.colors;
    const elContainer = t.opt.elInputsContainer;
    if (elContainer instanceof Element) {
      elContainer.innerHTML = '';
      for (var cid in colors) {
        const elInputGrp = t._buildInputGroup(cid);
        elContainer.appendChild(elInputGrp);
      }
    }
  }
  getColorsFromInputs() {
    const t = this;
    const out = {};
    t.inputs.forEach((input) => {
      const cid = input.dataset.id;
      const value = input.value;
      const param = input.dataset.param;
      if (!out[cid]) {
        out[cid] = {};
      }
      out[cid][param] = value;
    });
    for (var cid in out) {
      out[cid] = color_utils.hex2rgba(out[cid].hex, out[cid].alpha);
    }
    return out;
  }
}

export {Theme};

function isJsonTxt(txt) {
  try {
    return JSON.parse(txt) && true;
  } catch (e) {
    return false;
  }
}
function isBase64Json(txt) {
  try {
    return isJsonTxt(atob(txt)) && true;
  } catch (e) {
    return false;
  }
}
function b64ToJson(txt) {
  return JSON.parse(atob(txt));
}

function template_css(c) {
  return `
.mx * {
  --mx_ui_text: ${c.mx_ui_text};
  --mx_ui_text_faded: ${c.mx_ui_text_faded};
  --mx_ui_hidden: ${c.mx_ui_hidden};
  --mx_ui_border: ${c.mx_ui_border};
  --mx_ui_background: ${c.mx_ui_background};
  --mx_ui_shadow: ${c.mx_ui_shadow};
  --mx_ui_link: ${c.mx_ui_link};
  border-color: var(--mx_ui_border);
  color: var(--mx_ui_text);
}`;
}

function template_layers(c) {
  return [
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
      id: ['boundary_un_1'],
      paint: {
        'line-color': c.mx_map_boundary_un_1
      }
    },
    {
      id: ['boundary_un_2'],
      paint: {
        'line-color': c.mx_map_boundary_un_2
      }
    },
    {
      id: ['boundary_un_3'],
      paint: {
        'line-color': c.mx_map_boundary_un_3
      }
    },
    {
      id: ['boundary_un_4'],
      paint: {
        'line-color': c.mx_map_boundary_un_4
      }
    },
    {
      id: ['boundary_un_8'],
      paint: {
        'line-color': c.mx_map_boundary_un_8
      }
    },
    {
      id: ['boundary_un_9'],
      paint: {
        'line-color': c.mx_map_boundary_un_9
      }
    },
    {
      id: ['boundary_osm_subnational_3_4'],
      paint: {
        'line-color': c.mx_map_boundary_osm_subnational_3_4
      }
    },
    {
      id: [
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
}
