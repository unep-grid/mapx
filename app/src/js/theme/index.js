import {el} from '@fxi/el';
import * as color_utils from './../color_utils';
import {ListenerStore} from './../listener_store/index.js';
import {getDictItem} from './../mx_helper_language.js';
import './style.css';
import * as themes from './presets.js';
import {layer_resolver, css_resolver} from './mapx_style_resolver.js';

const global = {
  elStyle: null,
  elInputsContainer: null,
  map: null,
  themes: themes,
  idThemeDefault: 'mapx',
  idTheme: 'mapx',
  colors: null,
  debug: false
};

class Theme {
  constructor(opt) {
    const t = this;
    t.opt = Object.assign({}, global, opt);
    t.inputs = [];
    t.listeners = [];
    t.init();
  }
  /**
   * Init
   */
  init() {
    const t = this;
    const elContainer = t.opt.elInputsContainer;
    const hasContainer = elContainer instanceof Element;
    t.ls = new ListenerStore();

    if (!global.elStyle) {
      global.elStyle = el('style');
      document.head.appendChild(global.elStyle);
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
    t.setColorsByThemeId();
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

  getTheme(id) {
    const t = this;
    const idTheme = id || t.opt.idTheme;
    const valid = t.validateThemeId(idTheme);
    return t.opt.themes[valid ? idTheme : t.opt.idThemeDefault];
  }

  getThemesIdList() {
    const t = this;
    return Object.keys(t.opt.themes);
  }

  getThemes() {
    const t = this;
    return t.opt.themes;
  }

  setColorsByThemeId(id) {
    const t = this;
    id = id || t.opt.idThemeDefault;
    const theme = t.getTheme(id);
    if (theme.colors) {
      t._id_theme = theme.id;
      t.setColors(theme.colors);
      t.buildInputs();
      return true;
    }
    return false;
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
        Object.keys(colors).reduce((a, cid) => {
          return a && !!color_utils.rgba2hex(colors[cid].color || colors[cid]);
        }, true) &&
        layer_resolver(colors) &&
        css_resolver(colors) &&
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

  validateThemeId(idTheme) {
    const t = this;
    const theme = t.opt.themes[idTheme];
    if (theme && theme.colors) {
      return t.validateColors(theme.colors);
    } else {
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
    const default_theme = t.getTheme();
    const new_colors = Object.assign(
      {},
      default_theme.colors,
      colors || t.opt.colors
    );
    const validColors = t.validateColors(new_colors);
    if (validColors) {
      t.opt.colors = new_colors;
      t._updateCss();
      t._updateMap();
    }
    t.fire('set_colors', new_colors);
  }

  getColorItem(id){
    const item = this.getTheme().colors[id];
    if(item){
      return item.color;
    }
  }

  _updateCss() {
    const t = this;
    global.elStyle.textContent = css_resolver(t.opt.colors);
  }
  _updateMap() {
    const t = this;
    const map = t.opt.map;
    const isMapStyleLoaded = map.isStyleLoaded();
    const skipWaitMapLoad = t._map_skip_wait_load;

    if (!isMapStyleLoaded && !skipWaitMapLoad) {
      t.ls.addListenerOnce({
        target: map,
        type: 'load',
        bind: t,
        callback: t._updateMap
      });
      return;
    }
    t._map_skip_wait_load = true;

    const layers = layer_resolver(t.opt.colors);

    layers.forEach((grp) => {
      grp.id.forEach((id) => {
        const layer = map.getLayer(id);
        if (!layer) {
          return console.warn(`Layer ${id} not found`);
        }
        const paint = grp.paint;
        if (paint) {
          for (var p in paint) {
            map.setPaintProperty(id, p, paint[p]);
          }
        }
        const layout = grp.layout;
        if (layout) {
          for (var l in layout) {
            map.setLayoutProperty(id, l, layout[l]);
          }
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
    const inputType = ['checkbox', 'color', 'range'];
    let elInputGrp, elLabel;
    const color = color_utils.color2obj(colors[cid].color);
    const visible = colors[cid].visibility === 'visible';

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
          title: cid,
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
          const isCheck = type === 'checkbox';
          const config = {
            id: `${cid}_inputs`,
            type: type,
            dataset: {
              action: 'update',
              param: isRange ? 'alpha' : isCheck ? 'visibility' : 'hex',
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

          elInput.value = isRange ? color.alpha : isCheck ? true : color.color;
          if (isCheck) {
            elInput.checked = visible;
          }
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
      const isCheck = input.type === 'checkbox';
      const value = isCheck ? input.checked : input.value;
      const param = input.dataset.param;
      if (!out[cid]) {
        out[cid] = {};
      }
      out[cid][param] = value;
    });

    for (var cid in out) {
      out[cid] = {
        visibility: out[cid].visibility === true ? 'visible' : 'none',
        color: color_utils.hex2rgba(out[cid].hex, out[cid].alpha)
      };
    }
    return out;
  }
  get() {
    const t = this;
    return t.getColorsFromInputs();
  }

  /**
   * Events
   */
  on(id, cb) {
    this.listeners.push({
      id: id,
      cb: cb
    });
  }
  fire(id, data) {
    this.listeners.forEach((l) => {
      if (id === l.id) {
        l.cb(data);
      }
    });
  }
  off(id, cb) {
    let n = this.listener.length;
    while (n--) {
      const l = this.listener(n);
      if (l.id === id && l.cb === cb) {
        this.listener.splice(n, 1);
      }
    }
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
