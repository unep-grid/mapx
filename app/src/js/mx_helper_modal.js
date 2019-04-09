/**
 * Display a panel modal
 * @param {Object} o Options
 * @param {String} o.id Id of the box. Default : random
 * @param {Numeric} o.zIndex set zIndex. Default : value in css
 * @param {Boolean} o.replace If a modal is displayed twice with the same id, delete the previous one. Default : true
 * @param {Boolean} o.noShinyBinding  By default, the modal panel will try to bind automatically input elements. In some case, this is not wanted. Default : false
 * @param {String} o.styleString Style string to apply to modal window. Default : empty
 * @param {String|Element} o.content Body content of the modal. Default  : undefined
 * @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
 *
 */
export function modal(o) {
  o = o || {};
  var h = mx.helpers;
  var top,
    title,
    head,
    body,
    content,
    footer,
    buttons,
    dialog,
    validation,
    buttonClose;
  var id = o.id || h.makeId();
  var idBackground = 'mx_background_for_' + id;
  /**
   * Get or create modal and background
   */
  var modal = document.getElementById(o.id);
  var hasModal = h.isElement(modal);
  if(!hasModal){
    modal = buildModal(id);
  }

  var background = document.getElementById(idBackground);
  var hasBackground = h.isElement(background);

  if(!hasBackground){
    background = buildBackground(idBackground);
  }

  var rectModal = modal.getBoundingClientRect();
  var hasJquery = h.isFunction(window.jQuery);
  var hasShiny = h.isObject(window.Shiny);
  var elJedContainers;
  var hasSelectize = hasJquery && h.isFunction(window.Selectize);
  var startBodyScrollPos = 0;
  var noShinyBinding =
    !hasShiny || h.isBoolean(o.noShinyBinding) ? o.noShinyBinding : false;

  if (o.close === true) {
    if(hasModal && h.isFunction(modal.close)){
      modal.close();
    }else{
      close();
    }
    return;
  }

  if ( hasModal && o.replace) {
    var oldBody = modal.querySelector('.mx-modal-body');

    if (hasShiny && !noShinyBinding) {
      Shiny.unbindAll(modal);
    }
    if (hasSelectize) {
      mx.helpers.removeSelectizeGroupById(id);
    }
    if (oldBody) {
      startBodyScrollPos = oldBody.scrollTop;
    }

    modal.remove();
    modal = buildModal(id,{
      marginLeft: rectModal.left + 'px',
      top: rectModal.top + 'px'
    });
  }

  if ( hasModal && !o.replace) {
    return;
  }

  if (o.styleString) {
    modal.style = o.styleString;
  }
  if (o.zIndex) {
    modal.style.zIndex = o.zIndex;
  }

  if (o.minWidth) {
    modal.style.width = o.minWidth;
  }

  if (!o.removeCloseButton) {
    buttonClose = h.el(
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
        buttonClose.innerText = d;
        buttonClose.dataset.lang_key = 'btn_close';
      });
    }
    buttons.appendChild(buttonClose);
  }

  if (o.buttons && o.buttons.constructor === Array) {
    o.buttons.forEach(function(b) {
      if (h.isHTML(b)) {
        b = mx.helpers.textToDom(b);
      }
      if (h.isElement(b)) {
        buttons.appendChild(b);
      }
    });
  }

  if (o.title && h.isElement(o.title)) {
    title.appendChild(o.title);
  } else {
    title.innerHTML = o.title || '';
  }

  if (o.content && o.content instanceof Node) {
    content.appendChild(o.content);
  } else {
    if (h.isHTML(o.content)) {
      content.innerHTML = o.content;
    } else {
      content.innerText = o.content;
    }
  }

 
  if (hasShiny && !noShinyBinding) {
    Shiny.bindAll(modal);
  }
  if (true) {
    mx.helpers.initSelectizeAll({
      id: id,
      selector: modal
    });
  }
  if (startBodyScrollPos) {
    body.scrollTop = startBodyScrollPos;
  }

  /**
  * Add to dom
  */
  document.body.appendChild(modal);

  if (o.addBackground) {
    document.body.appendChild(background);
  }

  mx.helpers.draggable({
    selector: modal,
    debounceTime: 10
  });

  modal.close = close;
  modal.setTitle = setTitle;

  return modal;

  /**
   * Helpers
   */
  function buildModal(idModal, style) {
    return h.el(
      'div',
      {
        id: idModal,
        class: ['mx-modal-container', 'mx-draggable'],
        style : style
      },
      (top = h.el(
        'div',
        {
          class: ['mx-drag-handle', 'mx-modal-top']
        },
        (title = h.el('div', {
          class: ['mx-modal-drag-enable', 'mx-modal-title']
        }))
      )),
      (head = h.el('div', {
        class: ['mx-modal-head']
      })),
      (body = h.el(
        'div',
        {
          class: ['mx-modal-body', 'mx-scroll-styled']
        },
        (content = h.el('div', {
          class: ['mx-modal-content']
        }))
      )),
      (footer = h.el(
        'div',
        {
          class: ['mx-modal-foot']
        },
        (buttons = h.el('div', {
          class: 'btn-group'
        })),
        (dialog = h.el('div', {
          id: idModal + '_txt',
          class: ['shiny-text-output', 'mx-modal-foot-text']
        }))
      )),
      (validation = h.el('div', {
        id: idModal + '_validation',
        class: ['shiny-html-output', 'mx-modal-validation']
      }))
    );
  }

  function buildBackground(idBackground) {
    return h.el('div', {
      id: idBackground,
      class: ['mx-modal-background']
    });
  }
  function setTitle(newTitle){
     if(h.isElement(newTitle)){
       title.parentElement.replaceChild(title,newTitle)
     }else{
       title.innerText = newTitle;
     }
  }
  function close() {
    if (mx.helpers.isElement(content)) {
      /**
       * Remove jed editors
       */
      elJedContainers = content.querySelectorAll('[data-jed_id]');
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
      Shiny.unbindAll(modal);
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
    if (hasJquery) {
      $(modal).remove();
      $(background).remove();
    } else {
      modal.remove();
      background.remove();
    }
  }
}
