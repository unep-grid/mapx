import {ButtonPanel} from './button_panel';

let btnError;
let elErrorsContainer;
let errors = [];

export function handleIssues(err) {
  const h = mx.helpers;

  console.error(err);

  if (!btnError) {
    btnError = new ButtonPanel({
      elContainer: document.body,
      position: 'bottom-left',
      title_text: h.getDictItem('button_issues'),
      title_lang_key: 'button_issues',
      button_text: h.getDictItem('button_issues'),
      button_lang_key: 'button_issues',
      button_classes: ['fa', 'fa-bug'],
      container_style: {
        width: '500px',
        maxHeight: '50%',
        maxWidth: '100%'
      }
    });
    const elBtnGroup = h.el(
      'div',
      {
        style: {margin: '10px'},
        role: 'group',
        class: ['btn-group']
      },
      h.el(
        'button',
        {
          class: ['btn', 'btn-sm', 'btn-primary'],
          type: 'button',
          on: {
            click: () => {
              errors.forEach((e) => {
                e.el.remove();
              });
              errors.length = 0;
              btnError.destroy();
              btnError = null;
            }
          }
        },
        h.el('i', {class: ['fa', 'fa-trash-o']}),
        h.el('span', {style: {margin: '4px'}}, 'Ignore all')
      ),
      h.el(
        'button',
        {
          class: ['btn', 'btn-sm', 'btn-primary'],
          on: {
            click: () => {
              const elText = h.el('textarea', {
                style: {
                  postion: 'fixed',
                  width: '2em',
                  height: '2em',
                  fontSize: '0px',
                  zIndex: -1
                }
              });
              elText.innerHTML = JSON.stringify(errors.map(e=>e.msg));
              document.body.appendChild(elText);
              elText.focus();
              elText.select();
              document.execCommand('copy');
              elText.remove();
              h.iconFlash('clipboard');
            }
          }
        },
        h.el('i', {class: ['fa', 'fa-clipboard']}),
        h.el('span', {style: {margin: '4px'}}, 'Copy to clipboard')
      )
    );

    elErrorsContainer = h.el('div', {style: {padding: '10px'}});

    btnError.elPanelContent.appendChild(elBtnGroup);
    btnError.elPanelContent.appendChild(elErrorsContainer);
  }

  // jshint ignore:start
  // map error, standard error, promise errors
  var msg =
    err?.error?.message ||
    err?.message ||
    err?.reason?.message ||
    'Error undefined, check the console';
  var src = err?.sourceId;

  if (src) {
    msg = `${msg} (source:${src})`;
  }

  // jshint ignore:end
  const elError = h.el(
    'div',
    {class: 'alert alert-danger'},
    h.el(
      'div',
      h.el(
        'button',
        {
          class: ['btn', 'btn-xs'],
          style: {margin: '3px'},
          on: {
            click: () => {
              const error = errors.reduce(
                (a, e) => (a ? a : e.el === elError ? e : a),
                null
              );
              const pos = errors.indexOf(error);
              errors.splice(pos, 1);
              error.el.remove();
              if (errors.length === 0) {
                btnError.destroy();
                btnError = null;
              }
            }
          }
        },
        h.el('i', {class: ['fa', 'fa-times'], style: {pointerEvents: 'none'}})
      ),
      h.el('span', msg)
    )
  );

  elErrorsContainer.appendChild(elError);
  errors.push({msg: msg, el: elError});
}
