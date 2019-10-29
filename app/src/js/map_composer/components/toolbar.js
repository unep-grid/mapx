import {el} from '@fxi/el';
import {Box} from './box.js';

class Toolbar extends Box {
  constructor(boxParent) {
    super(boxParent);
    var toolbar = this;
    toolbar.title = 'toolbar';
    toolbar.init({
      class: ['mc-toolbar'],
      boxContainer: boxParent,
      content: toolbar.buildEl(),
      draggable: false,
      resizable: false,
      onRemove: toolbar.onRemove.bind(toolbar),
      onResize: toolbar.onResize.bind(toolbar)
    });
    toolbar.mc = boxParent;

    toolbar.lStore.addListener({
      target : toolbar.el, 
      type: 'change',
      idGroup: 'toolbar_change',
      callback: changeCallback,
      bind : toolbar
    });

    toolbar.lStore.addListener({
      target : toolbar.el, 
      type: 'click',
      idGroup: 'toolbar_click',
      callback: clickCallback,
      bind : toolbar
    });
  }

  onRemove() {}

  buildEl() {
    var toolbar = this;
    var state = toolbar.state;
    var elUnitOptions = state.units.map((u) => {
      return state.unit === u
        ? el('option', {selected: true}, u)
        : el('option', u);
    });
    var elModesOptions = state.modes.map((u) => {
      return state.mode === u
        ? el('option', {selected: true}, u)
        : el('option', u);
    });
    var sizeStep = state.grid_snap_size * window.devicePixelRatio;
    return el(
      'form',
      {
        class: 'mc-toolbar-content'
      },
      [
        el(
          'div',
          {
            class: 'form-group'
          },
          [
            el('label', 'Mode'),
            el(
              'select',
              {
                class: 'form-control',
                dataset: {
                  mc_action: 'update_state',
                  mc_event_type: 'change',
                  mc_state_name: 'mode'
                }
              },
              elModesOptions
            )
          ],
          el('span', {class: 'text-muted'}, 'Set map composer edition mode.')
        ),
        el(
          'div',
          {
            class: 'form-group'
          },
          [
            el('label', 'Unit'),
            el(
              'select',
              {
                class: 'form-control',
                dataset: {
                  mc_action: 'update_state',
                  mc_event_type: 'change',
                  mc_state_name: 'unit'
                }
              },
              elUnitOptions
            )
          ],
          el('span', {class: 'text-muted'}, 'Unit for all sizes.')
        ),
        (toolbar.elFormDpi = el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Resolution (dpi)'),
          (toolbar.elInputDpi = el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'dpi'
            },
            step: 1,
            value: state.dpi,
            max: 300,
            min: 72
          })),
          el(
            'span',
            {class: 'text-muted'},
            'Resolution for converting from pixels to millimeters and inches.'
          )
        )),

        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Width'),
          (toolbar.elInputPageWidth = el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'page_width'
            },
            step: sizeStep,
            max: sizeStep * 1000,
            min: sizeStep
          })),
          el('span', {class: 'text-muted'}, 'Width of the page in current unit')
        ),
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Height'),
          (toolbar.elInputPageHeight = el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'page_height'
            },
            step: sizeStep,
            max: sizeStep * 1000,
            min: sizeStep
          })),
          el(
            'span',
            {class: 'text-muted'},
            'Height of the page in current unit'
          )
        ),
        /** Scaling does not work with html2canvas, as the
        * css transform is not fully supported
        *
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Scale'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'content_scale'
            },
            value: 1,
            max: 1,
            min: 0.5
          })
        ),
        */
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Legend columns'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'legends_n_columns'
            },

            value: 1,
            max: 10,
            min: 1
          }),
          el(
            'span',
            {class: 'text-muted'},
            'Set the number of column for legend items'
          )
        ),
        el(
          'button',
          {
            type: 'button',
            class: ['btn', 'btn-default'],
            dataset: {
              mc_action: 'export_page',
              mc_event_type: 'click'
            }
          },
          'Export image'
        )
      ]
    );
  }
}

export {Toolbar};

function clickCallback(e) {
  var toolbar = this;
  var mc = toolbar.mc;
  if (!mc.ready) {
    return;
  }
  var elTarget = e.target;
  var d = elTarget.dataset;
  var idAction = d.mc_action;
  if (idAction === 'export_page') {
    mc.workspace.page.exportPng();
  }
}

function changeCallback(e) {
  var toolbar = this;
  var mc = toolbar.mc;
  if (!mc.ready) {
    return;
  }
  var elTarget = e.target;
  var d = elTarget.dataset;
  var idAction = d.mc_action;
  if (idAction === 'update_state') {
    var value = validateValue(e.target);
    var idState = d.mc_state_name;
    mc.setState(idState, value);
  }
}

function validateValueNumber(el) {
  var value = el.value * 1;
  var min = el.min * 1;
  var max = el.max * 1;
  if (value >= max) {
    value = max;
  }
  if (value <= min) {
    value = min;
  }
  el.value = value;
  return value;
}

function validateValueString(el) {
  var value = el.value + '';
  el.value = value;
  return value;
}
function validateValueSelect(el) {
  return validateValueString(el);
}
function validateValueCheckbox(el) {
  return !!el.checked;
}

function validateValue(el) {
  if (el.type === 'checkbox') {
    return validateValueCheckbox(el);
  }
  if (el.type === 'number') {
    return validateValueNumber(el);
  }
  if (el.type === 'select-one') {
    return validateValueSelect(el);
  }
  if (el.type === 'string') {
    return validateValueString(el);
  }
  return '';
}
