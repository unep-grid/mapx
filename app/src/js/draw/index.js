import {el} from '@fxi/el';
import {modal, modalConfirm} from './../mx_helper_modal.js';
import {Button} from './../panel_controls/button.js';
import {ControlsPanel} from './../panel_controls/index.js';
import {
  getDictTemplate,
  getTranslationTag
} from './../mx_helper_language.js';
import {bindAll} from './../bind_class_methods/index.js';
import {spatialDataToView} from './../mx_helper_map_dragdrop.js';
import {viewsListAddSingle} from './../mx_helper_map_view_ui.js';
import {EventSimple} from '../listener_store/index.js';

import './style.less';

const def = {
  url_help:
    'https://github.com/unep-grid/map-x-mgl/wiki/Draw-:-how-to-create-a-new-vector-layer-from-scratch-in-MapX'
};

class MapxDraw extends EventSimple {
  constructor(opt) {
    super();
    const md = this;
    md.opt = Object.assign({}, opt, def);
    md._map = md.opt.map;
    md._panel_tools = md.opt.panel_tools;
    md.init();
    return md;
  }

  /**
   * Set up essential stuff.
   * The draw module is loaded only if MapxDraw is enabled
   */

  async init() {
    const md = this;
    if (md._init) {
      return;
    }

    if (!md._panel_tools instanceof ControlsPanel) {
      throw new Error(
        'MapxDraw require a ControlsPanel to be provided in options {panel_tools:<ControlsPanel>}'
      );
    }

    if (window.mapx_draw instanceof MapxDraw) {
      window.mapx_draw.destroy();
    }
    window.mapx_draw = md;

    /**
     * Binds all method at once
     */
    bindAll(md);

    /**
     * internal storage
     */
    md._buttons = [];

    /**
     * Add the main toggle button
     */
    md._btn_toggle = md.addButton({
      key: 'draw_btn_toggle',
      classesIcon: 'mx-draw--btn-edit',
      classesButton: ['btn-ctrl--item-no-mobile'],
      action: md.toggle
    });
  }

  destroy() {
    const md = this;
    md.discard();
    md._buttons.forEach(md.removeButton);
    if (md._modal_config) {
      md._modal_config.close();
    }
    md.fire('destroy');
  }

  async toggle() {
    const md = this;
    if (md._enabled) {
      await md.disable();
    } else {
      await md.enable();
    }
    md.fire('toggle');
  }

  async enable() {
    const md = this;
    const elBtn = md._btn_toggle.elButton;
    if (md._enabled) {
      return;
    }
    if (!md._draw) {
      const module = await import('@mapbox/mapbox-gl-draw');
      const MapboxDraw = module.default;
      md._draw = new MapboxDraw({
        displayControlsDefault: false
      });
      md._map.addControl(md._draw);
    }
    const discard = await md.discardPrompt();
    if (!discard) {
      return;
    }
    md.discard();
    const conf = await md.showModalConfig();
    if (!conf) {
      return;
    }
    if (!conf.title) {
      conf.title = md._default_title();
    }
    md.opt = Object.assign({}, md.opt, conf);
    md.initButtonsType();
    elBtn.classList.add('active');
    md._enabled = true;
    md.fire('enable');
  }


  async disable() {
    const md = this;
    const elBtn = md._btn_toggle.elButton;

    if (!md._enabled) {
      return;
    }
    const discard = await md.discardPrompt();
    if (!discard) {
      return;
    }
    md.discard();
    md.clearButtonsType();
    elBtn.classList.remove('active');
    md.fire('disable');
    md._enabled = false;
  }

  async discardPrompt() {
    const md = this;
    const hasData = md.hasData();
    if (hasData) {
      const discard = await modalConfirm({
        title: getTranslationTag('draw_discard_change_title'),
        content : getTranslationTag('draw_discard_change'),
        cancel : getTranslationTag('draw_discard_change_btn_cancel'),
        confirm : getTranslationTag('draw_discard_change_btn_confirm'),
      });
      return discard;
    }
    return true;
  }

  discard() {
    const md = this;
    md._draw.deleteAll();
  }

  hasData() {
    const md = this;
    if (!md._draw) {
      return false;
    }
    const data = md.getData();
    const n = data.features.length;
    return n > 0;
  }

  addButton(opt) {
    const md = this;
    const btn = new Button(opt);
    md._buttons.push(btn);
    md._panel_tools.controls.register(btn);
    return btn;
  }

  /*
   * Remove button by key or button instance
   * @param {String | Button} Key identifire or Button to remove
   */
  removeButton(key) {
    const md = this;
    let i = md._buttons.length;
    key = key instanceof Button ? key.key : key;
    while (i--) {
      const btn = md._buttons[i];
      if (btn.key === key) {
        btn.destroy();
        md._buttons.splice(i, 1);
      }
    }
  }

  initButtonsType() {
    const md = this;
    md.clearButtonsType();
    switch (md.opt.type) {
      case 'point':
        md.addButton({
          key: 'draw_btn_mode_point',
          classesIcon: 'mx-draw--btn-point',
          action: () => {
            md._draw.changeMode('draw_point');
          }
        });
        break;
      case 'line':
        md.addButton({
          key: 'draw_btn_mode_line',
          classesIcon: 'mx-draw--btn-line',
          action: () => {
            md._draw.changeMode('draw_line_string');
          }
        });
        break;
      case 'polygon':
        md.addButton({
          key: 'draw_btn_mode_polygon',
          classesIcon: 'mx-draw--btn-polygon',
          action: () => {
            md._draw.changeMode('draw_polygon');
          }
        });
        break;
      default:
        null;
    }
    md.addButton({
      key: 'draw_btn_save',
      classesIcon: 'mx-draw--btn-save',
      action: md.createView
    });
    md.addButton({
      key: 'draw_btn_help',
      classesIcon: 'mx-draw--btn-help',
      action: md.showModalHelp
    });
  }

  getData() {
    const md = this;
    return md._draw.getAll();
  }

  clearButtonsType() {
    const md = this;
    let i = md._buttons.length;
    while (i--) {
      const btn = md._buttons[i];
      if (btn.opt.key !== 'draw_btn_toggle') {
        btn.destroy();
        md._buttons.splice(i, 1);
      }
    }
  }

  showModalHelp() {
    const md = this;
    const elLink = el(
      'a',
      {
        href: md.opt.url_help,
        target: '_blank'
      },
      'wiki'
    );
    const elInfo = el(
      'div',
      getDictTemplate('draw_help_link', {wiki: elLink.outerHTML})
    );

    return modal({
      noShinyBinding: true,
      addSelectize: false,
      title: getTranslationTag('draw_help_title'),
      content: elInfo,
      addBackground: true
    });
  }

  showModalConfig() {
    let elType, elTitle;
    const md = this;
    return new Promise((resolve) => {
      const elForm = el(
        'form',
        el('div', {class: 'form-group'}, [
          el('label', getTranslationTag('draw_feature_type')),
          (elType = el(
            'select',
            {class: 'form-control'},
            el('option', {value: 'point'}, getTranslationTag('draw_point')),
            el('option', {value: 'line'}, getTranslationTag('draw_line')),
            el('option', {value: 'polygon'}, getTranslationTag('draw_polygon'))
          ))
        ]),
        el('div', {class: 'form-group'}, [
          el(
            'label',
            {class: 'control-label'},
            getTranslationTag('draw_layer_name')
          ),
          (elTitle = el('input', {
            class: 'form-control',
            type: 'text',
            value: md._default_title()
          }))
        ])
      );

      const elBtnSubmit = el(
        'div',
        {
          class: 'btn btn-default',
          on: {
            click: () => {
              resolve({
                type: elType.value,
                title: elTitle.value
              });
              if (md._modal_config) {
                md._modal_config.close();
              }
            }
          }
        },
        getTranslationTag('draw_config_submit')
      );
      md._modal_config = modal({
        noShinyBinding: true,
        addSelectize: false,
        title: getTranslationTag('draw_config_title'),
        content: elForm,
        buttons: [elBtnSubmit],
        addBackground: true,
        onClose: resolve
      });
    });
  }

  async createView() {
    const md = this;
    const data = md.getData();
    
    if (data.features.length === 0) {
      return;
    }
    const view = await spatialDataToView({
      title: md.opt.title,
      fileName: md.opt.title,
      fileType: 'geojson',
      data: data,
      save: true
    });

    await viewsListAddSingle(view, {
      open: true
    });

    const quit = await modalConfirm({
       title : getTranslationTag('draw_saved_quit_title'),
       content : getTranslationTag('draw_saved_quit'),
       confirm : getTranslationTag('draw_saved_quit_confirm'),
       cancel : getTranslationTag('draw_saved_quit_stay')
    })

    if(quit){
      md.discard();
      md.disable();
    }
  }

  _default_title() {
    return `Untitled ${new Date().toLocaleString()}`;
  }
}
export {MapxDraw};
