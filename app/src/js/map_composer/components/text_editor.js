import {el} from '@fxi/el';

/**
 * Based on https://jsfiddle.net/RokoCB/az7f38w7/
 */
class EditorToolbar {
  constructor(boxParent, config) {
    var ed = this;
    config = config || {};
    ed.config = config;
    ed.boxParent = boxParent;
    ed.boxTarget = config.boxTarget;
    ed.enabled = config.enabled || false;
  }

  enable() {
    var ed = this;
    if (ed.enabled === true) {
      return;
    }
    ed.el = buildEl();
    if (ed.config.insertBeforTarget) {
      ed.boxParent.elContent.insertBefore(ed.el, ed.boxTarget.el);
    } else {
      ed.boxParent.elContent.appendChild(ed.el);
    }
    ed.setTargetEditable(true);
    ed.boxTarget.lStore.addListener({
      type: 'click',
      idGroup: 'editor_target_click',
      target: ed.el,
      callback: edit,
      bind : ed.boxTarget
    });
    ed.boxTarget.lStore.addListener({
      type: 'paste',
      idGroup: 'editor_target_paste',
      target: ed.boxTarget.el,
      callback: paste
    });
    ed.enabled = true;
  }

  setTargetEditable(v) {
    var ed = this;
    var elsEditables = ed.boxTarget.elContent.querySelectorAll(
      '[data-mc_editable=true]'
    );
    if (v === true) {
      elsEditables.forEach((e) => e.setAttribute('contenteditable', true));
    } else {
      elsEditables.forEach((e) => e.removeAttribute('contenteditable'));
    }
  }

  disable() {
    var ed = this;
    if (ed.enabled === true) {
      ed.el.remove();
      ed.setTargetEditable(false);
      ed.boxTarget.lStore.removeListenerByGroup('btn_format_text');
      ed.enabled = false;
    }
  }

  destroy() {
    this.disable();
  }
}

export {EditorToolbar};

function btnEdit(cmd, content) {
  return el(
    'button',
    {
      class: ['btn', 'btn-default'],
      dataset: {
        mc_action: 'text_edit',
        mc_event_type: 'click',
        mc_cmd: cmd
      }
    },
    content
  );
}

function buildEl() {
  return el(
    'div',
    {
      class: ['mc-box-bar-edit']
    },
    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      btnEdit('sizeText:more', el('span', '+')),
      btnEdit('sizeText:less', el('span', '-'))
    ),
    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      btnEdit('bold', el('b', 'B')),
      btnEdit('italic', el('i', 'I')),
      btnEdit('underline', el('u', 'U')),
      btnEdit('strikeThrough', el('s', 'S'))
    ),
    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      btnEdit('formatBlock:p', el('span', 'P')),
      btnEdit('formatBlock:H1', el('span', 'H1')),
      btnEdit('formatBlock:H2', el('span', 'H2')),
      btnEdit('formatBlock:H3', el('span', 'H3'))
    ),
    /*    el(*/
    //'span',
    //{class: ['btn-group']},
    //btnEdit('fontSize:1', el('span', '&#8613;s')),
    //btnEdit('fontSize:2', el('span', '&#8613;M')),
    //btnEdit('fontSize:5', el('span', '&#8613;L'))
    /*),*/
    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      btnEdit(
        'insertUnorderedList',
        el('span', {
          class: ['fa', 'fa-list-ul']
        })
      ),
      btnEdit(
        'insertOrderedList',
        el('span', {
          class: ['fa', 'fa-list-ol']
        })
      )
    ),

    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      btnEdit(
        'justifyLeft',
        el('span', {
          class: ['fa', 'fa-align-left']
        })
      ),
      btnEdit(
        'justifyCenter',
        el('span', {
          class: ['fa', 'fa-align-center']
        })
      ),
      btnEdit(
        'justifyRight',
        el('span', {
          class: ['fa', 'fa-align-right']
        })
      )
    ),
    el(
      'span',
      {class: ['mc-box-bar-edit-btn-group', 'btn-group-vertical']},
      el(
        'span',
        btnEdit(
          'removeFormat',
          el('span', {
            class: ['fa', 'fa-times']
          })
        )
      )
    )
  );
}

function edit(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  var boxTarget = this;
  var elTarget = e.target;
  var d = elTarget.dataset;
  // read the property of the handle;
  var cmd = d.mc_cmd;
  var idType = d.mc_event_type;
  var isClick = idType === 'click';
  var hasCmd = !!cmd;

  if (isClick && hasCmd) {
    cmd = cmd.split(':');
    if (cmd[0] === 'sizeText') {
      sizeText(boxTarget.mc.boxLastFocus, cmd[1]);
    } else {
      document.execCommand(cmd[0], false, cmd[1]);
    }
  }
}
function paste(e) {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}

function sizeText(boxActive, cmd) {
  if (boxActive && boxActive.editable) {
    if (cmd === 'more') {
      boxActive.sizeTextMore();
    } else {
      boxActive.sizeTextLess();
    }
  }
}
