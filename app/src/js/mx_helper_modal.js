import {el} from '@fxi/el';
import {ObserveMutationAttribute} from './mutations_observer/index.js';

/**
 * Display a panel modal
 * @param {Object} o Options
 * @param {String} o.id Id of the box. Default : random
 * @param {Numeric} o.zIndex set zIndex. Default : value in css
 * @param {Boolean} o.replace If a modal is displayed twice with the same id, delete the previous one. Default : true
 * @param {Boolean} o.noShinyBinding  By default, the modal panel will try to bind automatically input elements. In some case, this is not wanted. Default : false
 * @param {String} o.styleString Style string to apply to modal window. Default : empty
 * @param {Object} o.style Style object to apply to modal window. Default : empty
 * @param {Object} o.styleContent Style object to apply to content of the modal window. Default : empty
 * @param {String|Element} o.content Body content of the modal. Default  : undefined
 * @param {Function} o.onClose On close callback
 * @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
 *
 */
export function modal(o) {
  o = o || {};
  const h = mx.helpers;
  const id = o.id || h.makeId();

  let elTitle,
    elCollapse,
    elBody,
    elContent,
    elButtons,
    elButtonClose,
    elJedContainers,
    /**
     * Get or create modal and background
     */
    elModal = document.getElementById(o.id);

  const hasModal = h.isElement(elModal);
  if (!hasModal) {
    elModal = buildModal(id, o.style, o.styleContent);
  }
  const oa = new ObserveMutationAttribute({
    el: elModal,
    cb: o.onMutation
  });

  const hasJquery = h.isFunction(window.jQuery);
  const hasShiny = h.isObject(window.Shiny);
  const hasSelectize = hasJquery && h.isFunction(window.Selectize);
  const startBodyScrollPos = 0;
  const noShinyBinding =
    !hasShiny || h.isBoolean(o.noShinyBinding) ? o.noShinyBinding : false;

  o.addSelectize = o.addSelectize === false ? false : true;

  if (o.close === true) {
    if (hasModal && h.isFunction(elModal.close)) {
      elModal.close();
    } else {
      close();
    }
    return;
  }

  if (hasModal && o.replace) {
    const oldBody = elModal.querySelector('.mx-modal-body');
    const rectModal = elModal.getBoundingClientRect();

    if (hasShiny && !noShinyBinding) {
      Shiny.unbindAll(elModal);
    }
    if (hasSelectize) {
      h.removeSelectizeGroupById(id);
    }
    if (oldBody) {
      startBodyScrollPos = oldBody.scrollTop;
    }

    elModal.remove();
    elModal = buildModal(id, {
      marginLeft: rectModal.left + 'px',
      top: rectModal.top + 'px'
    });
  }

  if (hasModal && !o.replace) {
    return;
  }

  if (o.styleString) {
    elModal.style = o.styleString;
  }
  if (o.zIndex) {
    elModal.style.zIndex = o.zIndex;
  }

  if (o.minWidth) {
    elModal.style.width = o.minWidth;
  }

  if (!o.removeCloseButton) {
    elButtonClose = el(
      'button',
      {
        id: 'btnCloseModal',
        class: ['btn', 'btn-default'],
        on: {
          click: close
        }
      },
      o.textCloseButton
    );
    if (!o.textCloseButton) {
      h.getDictItem('btn_close').then((d) => {
        elButtonClose.innerText = d;
        elButtonClose.dataset.lang_key = 'btn_close';
      });
    }
    elButtons.appendChild(elButtonClose);
  }

  if (o.buttons) {
    o.buttons = h.isArray(o.buttons) ? o.buttons : [o.buttons];
    o.buttons.forEach(function(b) {
      if (h.isHTML(b)) {
        b = h.textToDom(b);
      }
      if (h.isElement(b)) {
        elButtons.appendChild(b);
      }
    });
  }

  if (o.content) {
    addContent(o.content, elContent);
  }

  if (startBodyScrollPos) {
    elBody.scrollTop = startBodyScrollPos;
  }

  setTitle(o.title);

  elModal.close = close;
  elModal.setTitle = setTitle;
  elModal.addMutationObserver = oa.setCb;
  /**
   * Add to dom
   */
  document.body.appendChild(elModal);

  if (o.addBackground) {
    elModal.classList.add('mx-modal-background');
  }

  /**
   * Init shiny and selectize
   */

  if (hasShiny && !noShinyBinding) {
    Shiny.bindAll(elModal);
  }
  if (o.addSelectize) {
    h.initSelectizeAll({
      id: id,
      selector: elModal,
      options: {
        dropdownParent: document.body
      }
    });
  }

  h.draggable({
    selector: elModal,
    debounceTime: 2000,
    onStart: () => {
      h.closeSelectizeGroupById(id);
    }
  });

  /**
   * Return final element
   */
  return elModal;

  /**
   * Helpers
   */
  function buildModal(idModal, style, styleContent) {
    const elModal = el(
      'div',
      {
        id: idModal,
        class: ['mx-modal-container', 'mx-draggable'],
        style: style
      },
      el(
        'div',
        {
          class: ['mx-drag-handle', 'mx-modal-top']
        },
        (elTitle = el('div', {
          class: ['mx-modal-drag-enable', 'mx-modal-title']
        })),
        (elCollapse = el('i', {
          class: [
            'mx-modal-top-btn-control',
            'fa',
            'fa-square-o',
            'fa-minus-square'
          ],
          on: [
            'click',
            () => {
              elCollapse.classList.toggle('fa-minus-square');
              elModal.classList.toggle('mx-modal-collapsed');
            }
          ]
        }))
      ),
      el('div', {
        class: ['mx-modal-head']
      }),
      (elBody = el(
        'div',
        {
          class: ['mx-modal-body', 'mx-scroll-styled']
        },
        (elContent = el('div', {
          style: styleContent || {position: 'relative'},
          class: ['mx-modal-content']
        }))
      )),
      el(
        'div',
        {
          class: ['mx-modal-foot']
        },
        (elButtons = el('div', {
          class: ['btn-group', 'mx-modal-foot-btns']
        })),
        el('div', {
          id: idModal + '_txt',
          class: ['shiny-text-output', 'mx-modal-foot-text']
        })
      ),
      el('div', {
        id: idModal + '_validation',
        class: ['shiny-html-output', 'mx-modal-validation']
      })
    );
    return elModal;
  }

  function setTitle(newTitle) {
    addContent(newTitle, elTitle);
  }

  function addContent(content, elTarget) {
    if (!h.isElement(elTarget) || !content) {
      return;
    }

    if (h.isPromise(content)) {
      return content.then((c) => {
        addContent(c, elTarget);
      });
    }

    if (content && h.isElement(content)) {
      elTarget.appendChild(content);
    } else if (h.isHTML(content)) {
      elTarget.innerHTML = content;
    } else if (h.isString(content)) {
      elTarget.innerText = content;
    }
  }

  function close() {
    if (oa) {
      /**
       * Destroy mutation observer
       */
      oa.destroy();
    }
    if (h.isElement(elContent)) {
      /**
       * Remove jed editors
       */
      elJedContainers = elContent.querySelectorAll('[data-jed_id]');
      elJedContainers.forEach((elJed) => {
        const jedId = elJed.dataset.jed_id;
        if (jed.editors[jedId] && h.isFunction(jed.editors[jedId].destroy)) {
          jed.editors[jedId].destroy();
        }
      });
    }
    /**
     * Renove shiny binding
     */
    if (hasShiny && !noShinyBinding) {
      Shiny.unbindAll(elModal);
    }
    /**
     * Remove selectize
     */
    if (hasSelectize) {
      h.removeSelectizeGroupById(id);
    }
    /**
     * Remove using jquery or DOM method.
     */
    elModal.remove();
    /**
     * on close callback
     */
    if (h.isFunction(o.onClose)) {
      o.onClose();
    }
  }
}

/**
 * Quickly close all modal windows
 */
export function modalCloseAll() {
  const elsModal = modalGetAll();
  elsModal.forEach((modal) => {
    modal.close();
  });
}

/**
 * Get all current modals
 * @param {Object} opt Options
 * @paramr {Array} opt.ignoreSelectors Array of ids to ignore
 * @return {NodeList}
 */
export function modalGetAll(opt) {
  const h = mx.helpers;
  opt = opt || {};
  let selector = '.mx-modal-container';
  const hasIgnores =
    h.isArray(opt.ignoreSelectors) && opt.ignoreSelectors.length > 0;
  if (hasIgnores) {
    selector = opt.ignoreSelectors.reduce((a, c) => `${a}:not(${c})`, selector);
  }
  return document.querySelectorAll(selector);
}

/**
 * Simple async confirm modal : confirm / cancel
 * @param {Object} opt Options
 * @param {String|Promise|Element} opt.title Title
 * @param {String|Promise|Element} opt.content Title
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.confirm Confirm text
 * @return {Promise} resolve to boolean
 */
export function modalConfirm(opt) {
  const h = mx.helpers;
  let elModal;
  return new Promise((resolve) => {
    const elContent = el('div', opt.content);

    const elBtnCancel = el(
      'div',
      {
        class: 'btn btn-default',
        on: {
          click: () => {
            resolve(false);
            elModal.close();
          }
        }
      },
      opt.cancel || h.getDictItem('btn_cancel')
    );

    const elBtnConfirm = el(
      'div',
      {
        class: 'btn btn-default',
        on: {
          click: () => {
            resolve(true);
            elModal.close();
          }
        }
      },
      opt.confirm || h.getDictItem('btn_confirm')
    );

    elModal = modal({
      noShinyBinding: true,
      addSelectize: false,
      removeCloseButton: true,
      title: opt.title,
      content: elContent,
      buttons: [elBtnConfirm, elBtnCancel],
      addBackground: true,
      onClose: resolve
    });
  });
}

/**
 * Simple async prompt modal, ok, cancel
 * @param {Object} opt Options
 * @param {Object} opt.inputOptions Input options
 * @param {String|Promise|Element} opt.title Title
 * @param {String|Promise|Element} opt.label Input label
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.confirm Confirm text
 * @param {Function} opt.onInput Callback on input with (value, elBtnConfirm) as args
 * @return {Promise} resolve to input type
 */
export function modalPrompt(opt) {
  const h = mx.helpers;
  let elModal;
  const def = {
    inputOptions: {
      type: 'number',
      class: 'form-control',
      min: 0,
      max: 1000,
      value: 10,
      id: Math.random().toString(32)
    }
  };
  opt.inputOptions = Object.assign({}, def.inputOptions, opt.inputOptions);
  return new Promise((resolve) => {
    const elInput = el('input', opt.inputOptions);

    const elContent = el(
      'div',
      {class: 'form-group'},
      el('label', {for: opt.inputOptions.id}, opt.label || 'Enter your value'),
      elInput
    );
    const elBtnCancel = el(
      'div',
      {
        class: 'btn btn-default',
        on: {
          click: () => {
            resolve(false);
            elModal.close();
          }
        }
      },
      opt.cancel || h.getDictItem('btn_cancel')
    );

    const elBtnConfirm = el(
      'div',
      {
        class: 'btn btn-default',
        on: {
          click: () => {
            if (elBtnConfirm.disabled) {
              return;
            }
            resolve(elInput.value);
            elModal.close();
          }
        }
      },
      opt.confirm || h.getDictItem('btn_confirm')
    );

    if (opt.onInput instanceof Function) {
      elInput.addEventListener('input', () =>
        opt.onInput(elInput.value, elBtnConfirm)
      );
      /**
       * Validate for default
       */
      opt.onInput(elInput.value, elBtnConfirm);
    }

    elModal = modal({
      noShinyBinding: true,
      addSelectize: false,
      removeCloseButton: true,
      title: opt.title,
      content: elContent,
      buttons: [elBtnConfirm, elBtnCancel],
      addBackground: true,
      onClose: resolve
    });
  });
}
