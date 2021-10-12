import {el} from '@fxi/el';
import {ListenerStore} from './../listener_store/index.js';
import {getDictItem} from './../mx_helper_language.js';
import chroma from 'chroma-js';
import './style.css';
import * as themes from './presets.js';
import {layer_resolver, css_resolver} from './mapx_style_resolver.js';
import {bindAll} from '../bind_class_methods';
import switchOn from './sound/switch-on.mp3';
import switchOff from './sound/switch-off.mp3';
import {onNextFrame} from '../animation_frame/index.js';

const global = {
  elStyle: null,
  elInputsContainer: null,
  map: null,
  themes: themes,
  idThemeDefault: 'mapx',
  idTheme: 'mapx',
  colors: null,
  debug: false,
  idThemesDarkLight: ['mapx', 'smartgray'],
  on: {},
  sounds: {
    'switch-test': switchOn,
    'switch-on': switchOn,
    'switch-off': switchOff
  }
};

class Theme {
  constructor(opt) {
    const t = this;
    bindAll(t);
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
    t.ls = new ListenerStore();

    if (!global.elStyle) {
      global.elStyle = el('style');
      document.head.appendChild(global.elStyle);
    }

    Object.keys(t.opt.on).forEach((k) => {
      t.on(k, t.opt.on[k]);
    });

    t.setColorsByThemeId();
  }

  get id_theme() {
    return this._id_theme;
  }

  get theme() {
    return this._theme || {};
  }

  get colors() {
    return this._colors || {};
  }

  get mode() {
    return this._mode;
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
    const idTheme = id || t.id_theme || t.opt.idTheme;
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
    id = id || t.opt.idTheme || t.opt.idThemeDefault;
    const theme = t.getTheme(id);
    if (theme.colors) {
      t._mode = theme.mode;
      t.fire('mode_changed', t._mode);
      t._id_theme = theme.id;
      t._theme = theme;
      t.setColors(theme.colors);
      t._buildInputs();
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
          return a && chroma.valid(colors[cid].color || colors[cid]);
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

  toggleDarkMode(force) {
    const t = this;
    const idCurrent = t.id_theme;
    const idsTheme = t.opt.idThemesDarkLight;
    let pos = idsTheme.indexOf(idCurrent);
    if (force) {
      pos = 1;
    } else if (pos === -1) {
      pos = 0;
    } else if (pos === 1) {
      pos = 0;
    } else {
      pos = 1;
    }
    if (pos === 1) {
      t.sound('switch-off');
    } else {
      t.sound('switch-on');
    }
    t.setColorsByThemeId(idsTheme[pos]);
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
    t._colors = new_colors;
    t.fire('set_colors', new_colors);
  }

  getColorThemeItem(id) {
    const item = this.getTheme().colors[id];
    if (item) {
      return item.color;
    }
  }

  _updateCss() {
    const t = this;
    global.elStyle.textContent = css_resolver(t.opt.colors);
  }
  linkMap(map) {
    const t = this;
    t.opt.map = map;
    t._updateMap();
  }
  _updateMap() {
    const t = this;
    const map = t.opt.map;
    if (!map) {
      return;
    }
    const isMapStyleLoaded = map.isStyleLoaded();
    const skipWaitMapLoad = t._map_skip_wait_load;

    if (!isMapStyleLoaded && !skipWaitMapLoad) {
      map.once('load', t._updateMap.bind(t));
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
    const color = chroma(colors[cid].color);
    const visible = colors[cid].visibility === 'visible';

    return el(
      'div',
      {
        id: cid,
        class: ['mx-theme--color-container']
      },
      el(
        'span',
        {
          class: ['mx-theme--color-label', 'hint--right'],
          dataset: {lang_key: cid},
          'aria-label': cid
        },
        getDictItem(cid)
      ),
      el(
        'div',
        {
          class: ['mx-theme--colors-input']
        },
        inputType.map((type) => {
          const isRange = type === 'range';
          const isCheck = type === 'checkbox';
          const id = `${cid}_inputs_${type}`;
          const config = {
            id: id,
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
          const elLabel = el(
            'label',
            {
              for: id,
              'aria-label': cid,
              class: 'mx-theme--colors-input-wrap'
            },
            `${type} input for ${id}`
          );
          const elWrap = el(
            'div',
            {
              id: `${cid}_inputs_wrap_${type}`
            },
            elInput,
            elLabel
          );

          elInput.value = isRange
            ? color.alpha()
            : isCheck
            ? true
            : color.hex('rgb');

          if (isCheck) {
            elInput.checked = visible;
          }
          t.inputs.push(elInput);
          return elWrap;
        })
      )
    );
  }
  linkInputs(elInputsContainer) {
    const t = this;
    const elContainer = elInputsContainer || t.opt.elInputsContainer;
    if (!elContainer instanceof Element || t._el_inputs_init) {
      return;
    }
    t.ls.addListener({
      bind: t,
      target: elContainer,
      callback: t._updateFromInput,
      group: 'base',
      type: 'change',
      debounce: true,
      debounceTime: 200
    });
    t._el_inputs_init = true;
    t.opt.elInputsContainer = elContainer;
    t._buildInputs();
  }

  _buildInputs() {
    const t = this;
    const colors = t.opt.colors;
    const elContainer = t.opt.elInputsContainer;
    const elFrag = new DocumentFragment();
    if (!(elContainer instanceof Element)) {
      return;
    }
    elContainer.innerHTML = '';
    for (var cid in colors) {
      const elInputGrp = t._buildInputGroup(cid);
      elFrag.appendChild(elInputGrp);
    }
    /**
    * Replacing input is not a priority. In case
    * of theme change, a lot of update is happening
    * at the same time. Building input in the next
    * frame improve performance. That and using
    * fragment require 10ms instead of 28ms.
    */
    onNextFrame(() => {
      elContainer.replaceChildren(elFrag);
    });
  }
  getColorsFromInputs(id) {
    const t = this;
    const out = {};
    t.inputs.forEach((input) => {
      const cid = input.dataset.id;
      if (!id || cid === id) {
        const isCheck = input.type === 'checkbox';
        const value = isCheck ? input.checked : input.value;
        const param = input.dataset.param;
        if (!out[cid]) {
          out[cid] = {};
        }
        out[cid][param] = value;
      }
    });

    for (var cid in out) {
      out[cid] = {
        visibility: out[cid].visibility === true ? 'visible' : 'none',
        color: chroma(out[cid].hex)
          .alpha(out[cid].alpha * 1)
          .css()
      };
    }
    if (id) {
      return out[id];
    } else {
      return out;
    }
  }

  get(id) {
    const t = this;
    return t.colors[id];
  }

  /**
   * Sound
   */
  sound(id) {
    const t = this;
    t._elAudio = t._elAudio || el('audio');
    t._elAudio.setAttribute('src', t.opt.sounds[id]), t._elAudio.play();
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
    let n = this.listeners.length;
    while (n--) {
      const l = this.listeners[n];
      if (l.id === id && l.cb === cb) {
        this.listeners.splice(n, 1);
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
