import {NestedList} from '../index.js';

class ContextMenu {
  constructor(evt, li) {
    if (!(li instanceof NestedList)) {
      throw new Error('NestedList instance not valid');
    }
    let cm = this;
    cm.li = li;
    cm.top = evt.clientY;
    cm.left = evt.clientX;
    cm.elTarget = cm.li.getTarget(evt.target);
    cm.elContainer = document.body;
    cm.elContext = cm.buildContext();
    cm.init();
  }

  init() {
    this.startListen();
    this.setTargetFocus(true);
    this.adjustPosition();
  }

  destroy(save) {
    let cm = this;
    if (cm._destroyed) {
      return;
    }
    cm.setTargetFocus(false);
    cm.stopListen();
    cm.li.removeElement(cm.elContext);
    if(save){
      cm.li.saveStateStorage();
    }
    cm._destroyed = true;
  }

  adjustPosition() {
    let cm = this;
    let rCtx = cm.elContext.getBoundingClientRect();
    let rCon = cm.elContainer.getBoundingClientRect();

    if (rCtx.right > rCon.right) {
      cm.elContext.style.left = rCon.right - rCtx.width - 20 + 'px';
    }
    if (rCtx.left < rCon.left) {
      cm.elContext.style.left = rCon.left + 20 + 'px';
    }
    if (rCtx.bottom > rCon.bottom) {
      cm.elContext.style.top = rCon.bottom - rCtx.height - 20 + 'px';
    }
  }

  setTargetFocus(enable) {
    let cm = this;
    enable = enable === true;
    if (enable) {
      cm.elTarget.classList.add(cm.li.opt.class.contextMenuTargetFocus);
    } else {
      setTimeout(() => {
        cm.elTarget.classList.remove(cm.li.opt.class.contextMenuTargetFocus);
      }, 500);
    }
  }

  addUndoStepOnce() {
    let cm = this;
    let done = cm._snap_shot_once;
    if (done) {
      return;
    } else {
      cm.li.addUndoStep();
      cm._snap_shot_once = true;
    }
  }

  startListen() {
    let cm = this;
    cm.li.listenerStore.addListener({
      type: 'click',
      group: 'context',
      target: window,
      listener: handleContextEvent,
      bind: cm
    });
    cm.li.listenerStore.addListener({
      type: 'input',
      group: 'context',
      target: cm.elContainer,
      listener: handleContextEvent,
      bind: cm
    });
    cm.li.listenerStore.addListener({
      type: 'keydown',
      group: 'context',
      target: window,
      listener: handleContextEventKeyDown,
      bind: cm
    });
  }
  stopListen() {
    let cm = this;
    cm.li.listenerStore.removeListenerByGroup('context');
  }

  buildContext() {
    let cm = this;
    let isRoot = cm.li.isRoot(cm.elTarget);
    let isGroup = !isRoot && cm.li.isGroup(cm.elTarget);
    let elContainer = cm.elContainer;
    let type = isRoot ? 'root' : isGroup ? 'group' : 'item';
    /**
     * Filter context item and build UI according to
     * settings;
     */
    let contextItems = cm.li.opt.contextMenuItems.filter(filterContextItem);
    let ui = contextItems.map((i) => {
      if (i.ui === 'header') {
        return cm.elHeader(i.label);
      }
      if (i.ui === 'button') {
        return cm.elButton(i.label, i.action);
      }
      if (i.ui === 'input_text') {
        let value = '';
        if (isGroup) {
          value = cm.li.getGroupTitle(cm.elTarget);
        }
        return cm.elInput('text', i.action, i.label, value);
      }
      if (i.ui === 'input_color') {
        let value = '';
        if (isGroup) {
          value = cm.li.getGroupColor(cm.elTarget);
        }
        return cm.elInput('color', i.action, i.label, value);
      }
    });

    /**
     * Context content
     */
    let elMenuGroup = cm.li.el(
      'div',
      {
        class: cm.li.opt.class.contextMenuGroup
      },
      ui
    );

    /**
     * Context
     */
    let elContext = cm.li.el(
      'span',
      {
        class: cm.li.opt.class.contextMenu,
        style: {
          position: 'absolute',
          top: cm.top + 'px',
          left: cm.left + 'px'
        }
      },
      elMenuGroup
    );
    elContainer.appendChild(elContext);
    return elContext;

    /**
     * Context helpers
     */
    function filterContextItem(i) {
      if (cm.li.isFunction(i.condition)) {
        if (!i.condition.bind(cm.li)()) {
          return false;
        }
      }
      return i.forType === 'all' || i.forType.indexOf(type) > -1;
    }
  }
  elHeader(idLabel) {
    let cm = this;
    let title = cm.li.d(idLabel);
    let el = cm.li.el;
    return el(
      'div',
      {
        class: cm.li.opt.class.contextMenuHeader
      },
      title
    );
  }
  elButton(idLabel, idAction) {
    let cm = this;
    let title = cm.li.d(idLabel);
    let el = cm.li.el;
    return el(
      'div',
      {
        class: cm.li.opt.class.contextMenuButton,
        dataset: {
          li_id_action: idAction,
          li_event_type: 'click'
        }
      },
      title
    );
  }

  elInput(type, idAction, idLabel, value) {
    let cm = this;
    let el = cm.li.el;
    value = value || null;
    let lang = cm.li.getLanguage();
    let placeHolder = cm.li.d(idAction);
    let isText = type === 'text';
    let title = cm.li.d(idLabel);

    if (isText) {
      title = title + ` (${lang})`;
    }

    return el(
      'div',
      {
        class: cm.li.opt.class.contextMenuInputGroup
      },
      el(
        'span',
        {
          class: cm.li.opt.class.contextMenuInputLabel
        },
        title
      ),
      el('input', {
        class: cm.li.opt.class.contextMenuInput,
        type: type || 'text',
        placeholder: placeHolder,
        dataset: {
          li_id_action: idAction,
          li_event_type: 'input'
        },
        value: value
      })
    );
  }
}

export {ContextMenu};

function handleContextEventKeyDown(evt) {
  let cm = this;
  if (evt.code === 'Enter' || evt.code === 'Escape' || evt.code === 'Tab') {
    cm.destroy();
  }
}

function handleContextEvent(evt) {
  let cm = this;
  let eventType = evt.type;
  let elInput = evt.target;
  let idType = elInput.dataset.li_event_type;
  //let isEventInput = eventType === 'input';
  let isEventClick = eventType === 'click';
  let isValidInput = idType === 'input';
  let isValidClick = idType === 'click';
  let elTarget = cm.elTarget;
  let elContext = cm.elContext;
  let idAction = elInput.dataset.li_id_action;
  let elGroup = cm.li.getGroup(elTarget);
  let save = false;

  if (!isValidInput && !isValidClick) {
    cm.destroy(save);
    return;
  }

  if (!elTarget || !elGroup || !idAction || !elContext) {
    return;
  }

  save = true;


  let act = {
    cm_group_sort_text_asc: () => {
      cm.li.sortGroup(elTarget, {mode: 'text', asc: true});
    },
    cm_group_sort_text_desc: () => {
      cm.li.sortGroup(elTarget, {mode: 'text', asc: false});
    },
    cm_group_sort_date_asc: () => {
      cm.li.sortGroup(elTarget, {mode: 'date', asc: false});
    },
    cm_group_sort_date_desc: () => {
      cm.li.sortGroup(elTarget, {mode: 'date', asc: true});
    },
    cm_target_move_top: () => {
      cm.li.moveTargetTop(elTarget);
    },
    cm_target_move_up: () => {
      cm.li.moveTargetUp(elTarget);
    },
    cm_target_move_down: () => {
      cm.li.moveTargetDown(elTarget);
    },
    cm_target_move_bottom: () => {
      cm.li.moveTargetBottom(elTarget);
    },
    cm_global_undo_last: () => {
      cm.li.undo();
    },
    cm_global_reset_state: () => {
      cm.li.resetState();
    },
    cm_item_add_group: () => {
      cm.addUndoStepOnce();
      cm.li.addGroup({
        content: elTarget,
        group: elGroup
      });
    },
    cm_group_add: () => {
      cm.addUndoStepOnce();
      cm.li.addGroup({
        group: elTarget
      });
    },
    cm_group_remove: () => {
      cm.addUndoStepOnce();
      cm.li.removeGroup(elTarget);
    },
    cm_group_rename: () => {
      cm.addUndoStepOnce();
      cm.li.setGroupTitle(elTarget, elInput.value);
    },
    cm_group_color: () => {
      cm.addUndoStepOnce();
      cm.li.setGroupColor(elTarget, elInput.value);
    },
    cm_btn_close: () => {
      save = false;
    }
  };

  if (idAction) {
    act[idAction]();
  }

  if (isEventClick && isValidClick) {
    cm.destroy(save);
  }
}
