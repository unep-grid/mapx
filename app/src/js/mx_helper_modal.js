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
  var that = this;
  var h = mx.helpers;
  var id = o.id || h.makeId();
  var idBackground = 'mx_background_for_' + id;
  var modal = document.getElementById(o.id) || document.createElement('div');
  var rectModal = modal.getBoundingClientRect();
  var background = document.getElementById(idBackground) || document.createElement('div');
  var hasJquery = typeof window.jQuery === 'function';
  var hasShiny = typeof window.Shiny !== 'undefined';
  var hasJed = false;
  var elJedContainers;
  var hasSelectize = hasJquery && typeof window.Selectize == 'function';
  var startBodyScrollPos = 0;
  var noShinyBinding = !hasShiny || typeof o.noShinyBinding !== 'undefined' ? o.noShinyBinding : false;

  if (o.close) {
    close();
    return;
  }
  if (modal.id && o.replace) {
    if (hasShiny && !noShinyBinding) Shiny.unbindAll(modal);
    if (hasSelectize) mx.helpers.removeSelectizeGroupById(id);
    var oldBody = modal.querySelector('.mx-modal-body');
    if (oldBody) {
      startBodyScrollPos = oldBody.scrollTop;
    }

    modal.remove();
    modal = document.createElement('div');
    modal.style.marginLeft = rectModal.left + 'px';
    modal.style.top = rectModal.top + 'px';
  }
  if (modal.id && !o.replace) {
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

  var top = document.createElement('div');
  var title = document.createElement('div');
  var head = document.createElement('div');
  var body = document.createElement('div');
  var content = document.createElement('div');
  var footer = document.createElement('div');
  var buttons = document.createElement('div');
  var dialog = document.createElement('div');
  var validation = document.createElement('div');
   
  modal.appendChild(top);
  modal.appendChild(head);
  modal.appendChild(body);
  modal.appendChild(footer);
  modal.classList.add('mx-modal-container');
  modal.classList.add('mx-draggable');
  modal.appendChild(validation);
  modal.id = id;


  top.classList.add('mx-drag-handle');
  top.classList.add('mx-modal-top');
  top.appendChild(title);

  title.classList.add('mx-modal-drag-enable');
  title.classList.add('mx-modal-title');
  head.classList.add('mx-modal-head');
  validation.classList.add('mx-modal-validation');
  body.classList.add('mx-modal-body');
  body.classList.add('mx-scroll-styled');
  content.classList.add('mx-modal-content');
  footer.classList.add('mx-modal-foot');
  buttons.classList.add('btn-group');
  background.id = idBackground;
  background.classList.add('mx-modal-background');
  dialog.classList.add('shiny-text-output');
  dialog.id = id + '_txt';
  dialog.classList.add('mx-modal-foot-text');
  validation.classList.add('shiny-html-output');
  validation.id = id + '_validation';

  if (!o.removeCloseButton) {
    var b = document.createElement('button');
    b.className = 'btn btn-default';
    b.innerHTML = o.textCloseButton || 'close';
    b.addEventListener('click', close);
    buttons.appendChild(b);
  }

  if (o.buttons && o.buttons.constructor == Array) {
    o.buttons.forEach(function(b) {
      if (typeof b === 'string') {
        b = mx.helpers.textToDom(b);
      }
      if (mx.helpers.isElement(b)) {
        buttons.appendChild(b);
      }
    });
  }

  if (o.title && o.title instanceof Node) {
    title.appendChild(o.title);
  } else {
    title.innerHTML = o.title || '';
  }

  if (o.content && o.content instanceof Node) {
    content.appendChild(o.content);
  } else {
    content.innerHTML = o.content;
  }

  body.appendChild(content);
  footer.appendChild(dialog);
  footer.appendChild(buttons);
  document.body.appendChild(modal);

  

  if (o.addBackground) document.body.appendChild(background);
  if (hasShiny && !noShinyBinding) Shiny.bindAll(modal);
  if (true) {
    mx.helpers.initSelectizeAll({
      id: id,
      selector: modal,
    });
  }
  if (startBodyScrollPos) {
    body.scrollTop = startBodyScrollPos;
  }
  mx.helpers.draggable({
    selector: modal,
    debounceTime: 10,
  });


  modal.close = close;

  return modal;

  function close(e) {
    if( mx.helpers.isElement(content)  ) {
      elJedContainers = content.querySelectorAll('[data-jed_id]');
      elJedContainers.forEach(elJed => {
        var jedId = elJed.dataset.jed_id;
        if(jed.editors[jedId] && mx.helpers.isFunction(jed.editors[jedId].destroy)){
          console.log("destroy " + jedId );
          jed.editors[jedId].destroy();
        }
      });
    }
    if (hasShiny && !noShinyBinding) Shiny.unbindAll(modal);
    if (hasSelectize) mx.helpers.removeSelectizeGroupById(id);
    if (hasJquery) {
      $(modal).remove();
      $(background).remove();
    } else {
      modal.remove();
      background.remove();
    }
  
  }


}
