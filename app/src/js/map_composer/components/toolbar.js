import {el} from '@fxi/el';
import {Box} from './box.js';

class Toolbar extends Box {
  constructor(boxParent) {
    super(boxParent);
    var toolbar = this;
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
    toolbar.initListener();
  }

  onRemove() {
    this.removeListener();
  }

  buildEl() {
    var toolbar = this;
    var state = toolbar.state;
    var elUnitOptions = state.units.map((u) => {
      return state.unit === u
        ? el('option', {selected: true}, u)
        : el('option', u);
    });

    return el(
      'form',
      {
        class: 'mc-toolbar-content'
      },
      [
        el(
          'div',
          {
            class: 'checkbox'
          },
          el(
            'label',
            el('input', {
              dataset: {
                mc_action: 'update_state',
                mc_event_type: 'change',
                mc_state_name: 'mode_preview'
              },
              type: 'checkbox'
            }),
            el('span', 'Preview mode')
          )
        ),
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Resolution (dpi)'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'dpi'
            },
            value: state.dpi,
            max: 600,
            min: 72
          })
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
          ]
        ),
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Width'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',

              mc_state_name: 'page_width'
            },
            value: 100,
            max: 500,
            min: 10
          })
        ),
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Height'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',

              mc_state_name: 'page_height'
            },

            value: 100,
            max: 500,
            min: 10
          })
        ),
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
          })
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

  listenerChange(e) {
    var toolbox = this;
    var d = e.target.dataset;
    if (d.mc_event_type && d.mc_action) {
      e.stopPropagation();
      var eventType = d.mc_event_type;
      var idAction = d.mc_action;
      var value = validateValue(e.target);
      if (eventType === 'change') {
        if (idAction === 'update_state') {
          var idState = d.mc_state_name;
          toolbox.mc.setState(idState, value);
        }
      } else {
        if (eventType === 'click') {
          toolbox.mc.handleAction(idAction);
        }
      }
    }
  }

  initListener() {
    var toolbar = this;
    var l = (toolbar.listeners = []);
    l.push({type: 'change', listener: toolbar.listenerChange.bind(toolbar)});
    l.push({type: 'click', listener: toolbar.listenerChange.bind(toolbar)});
    l.forEach((ll) => {
      toolbar.el.addEventListener(ll.type, ll.listener);
    });
  }
  removeListener() {
    var toolbar = this;
    toolbar.listeners.forEach((ll) => {
      toolbar.el.removeEventListener(ll.type, ll.listener);
    });
  }
}

export {Toolbar};

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
  return "";
}
