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
 * @param {Functoin} o.onClose On close callback
 * @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
 *
 */
export function modal(o) {
  o = o || {};
  const h = mx.helpers;
  const id = o.id || h.makeId();
  const idBackground = 'mx_background_for_' + id;
  var elModal,
    elTop,
    elTitle,
    elCollapse,
    elHead,
    elBody,
    elContent,
    elFooter,
    elButtons,
    elDialog,
    elValidation,
    elButtonClose,
    elBackground;
  /**
   * Get or create modal and background
   */
  elModal = document.getElementById(o.id);
  const hasModal = h.isElement(elModal);
  if (!hasModal) {
    elModal = buildModal(id, o.style, o.styleContent);
  }

  elBackground = document.getElementById(idBackground);
  var hasBackground = h.isElement(elBackground);

  if (!hasBackground) {
    elBackground = buildBackground(idBackground);
  }

  var hasJquery = h.isFunction(window.jQuery);
  var hasShiny = h.isObject(window.Shiny);
  var elJedContainers;
  var hasSelectize = hasJquery && h.isFunction(window.Selectize);
  var startBodyScrollPos = 0;
  var noShinyBinding =
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
    var oldBody = elModal.querySelector('.mx-modal-body');
    var rectModal = elModal.getBoundingClientRect();

    if (hasShiny && !noShinyBinding) {
      Shiny.unbindAll(elModal);
    }
    if (hasSelectize) {
      mx.helpers.removeSelectizeGroupById(id);
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
    elButtonClose = h.el(
      'button',
      {
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

  if (o.buttons && o.buttons.constructor === Array) {
    o.buttons.forEach(function(b) {
      if (h.isHTML(b)) {
        b = mx.helpers.textToDom(b);
      }
      if (h.isElement(b)) {
        elButtons.appendChild(b);
      }
    });
  }

  if (o.content && o.content instanceof Node) {
    elContent.appendChild(o.content);
  } else {
    if (h.isHTML(o.content)) {
      elContent.innerHTML = o.content;
    } else {
      elContent.innerText = o.content;
    }
  }

  if (startBodyScrollPos) {
    elBody.scrollTop = startBodyScrollPos;
  }

  setTitle(o.title);

  mx.helpers.draggable({
    selector: elModal,
    debounceTime: 10
  });

  elModal.close = close;
  elModal.setTitle = setTitle;

  /**
   * Add to dom
   */
  document.body.appendChild(elModal);

  if (o.addBackground) {
    document.body.appendChild(elBackground);
  }

  /**
   * Init shiny and selectize
   */

  if (hasShiny && !noShinyBinding) {
    Shiny.bindAll(elModal);
  }
  if (o.addSelectize) {
    mx.helpers.initSelectizeAll({
      id: id,
      selector: elModal,
      options : {
        dropdownParent : elModal
      }
    });
  }

  /**
   * Return final element
   */
  return elModal;

  /**
   * Helpers
   */
  function buildModal(idModal, style, styleContent) {
    const elModal = h.el(
      'div',
      {
        id: idModal,
        class: ['mx-modal-container', 'mx-draggable'],
        style: style
      },
      (elTop = h.el(
        'div',
        {
          class: ['mx-drag-handle', 'mx-modal-top']
        },
        (elTitle = h.el('div', {
          class: ['mx-modal-drag-enable', 'mx-modal-title']
        })),
        (elCollapse = h.el('i', {
          class: [
            'mx-modal-top-btn-collapse',
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
      )),
      (elHead = h.el('div', {
        class: ['mx-modal-head']
      })),
      (elBody = h.el(
        'div',
        {
          class: ['mx-modal-body', 'mx-scroll-styled']
        },
        (elContent = h.el('div', {
          style: styleContent,
          class: ['mx-modal-content']
        }))
      )),
      (elFooter = h.el(
        'div',
        {
          class: ['mx-modal-foot']
        },
        (elButtons = h.el('div', {
          class: 'btn-group'
        })),
        (elDialog = h.el('div', {
          id: idModal + '_txt',
          class: ['shiny-text-output', 'mx-modal-foot-text']
        }))
      )),
      (elValidation = h.el('div', {
        id: idModal + '_validation',
        class: ['shiny-html-output', 'mx-modal-validation']
      }))
    );
    return elModal;
  }

  function buildBackground(idBackground) {
    return h.el('div', {
      id: idBackground,
      class: ['mx-modal-background']
    });
  }
  function setTitle(newTitle) {
    if (h.isElement(newTitle)) {
      elTitle.innerHTML = '';
      elTitle.appendChild(newTitle);
    } else {
      elTitle.innerText = newTitle;
    }
  }
  function close() {
    if (mx.helpers.isElement(elContent)) {
      /**
       * Remove jed editors
       */
      elJedContainers = elContent.querySelectorAll('[data-jed_id]');
      elJedContainers.forEach((elJed) => {
        var jedId = elJed.dataset.jed_id;
        if (
          jed.editors[jedId] &&
          mx.helpers.isFunction(jed.editors[jedId].destroy)
        ) {
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
      mx.helpers.removeSelectizeGroupById(id);
    }
    /**
     * Remove using jquery or DOM method.
     */
    elModal.remove();
    elBackground.remove();
    /**
     * on close callback
     */
    if (mx.helpers.isFunction(o.onClose)) {
      o.onClose();
    }
  }
}
