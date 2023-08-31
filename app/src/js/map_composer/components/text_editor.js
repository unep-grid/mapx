import { el } from "./../../el/src/index.js";
import { flattenBlockElements } from "../../mx_helper_misc.js";

/**
 * Based on https://jsfiddle.net/RokoCB/az7f38w7/
 */
class EditorToolbar {
  constructor(boxParent, config) {
    const ed = this;
    config = config || {};
    ed.config = config;
    ed.boxParent = boxParent;
    ed.boxTarget = config.boxTarget;
    ed.enabled = config.enabled || false;
  }

  enable() {
    const ed = this;
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
      type: "click",
      idGroup: "editor_target_click",
      target: ed.el,
      callback: edit,
      bind: ed.boxTarget,
    });
    ed.boxTarget.lStore.addListener({
      type: "paste",
      idGroup: "editor_target_paste",
      target: ed.boxTarget.el,
      callback: paste,
    });
    ed.enabled = true;
  }

  setTargetEditable(v) {
    const ed = this;
    const elsEditables = ed.boxTarget.elContent.querySelectorAll(
      "[data-mc_editable=true]"
    );
    for (const e of elsEditables) {
      if (v === true) {
        e.setAttribute("contenteditable", true);
      } else {
        e.removeAttribute("contenteditable");
      }
    }
  }

  disable() {
    const ed = this;
    if (ed.enabled === true) {
      ed.el.remove();
      ed.setTargetEditable(false);
      ed.boxTarget.lStore.removeListenerByGroup("btn_format_text");
      ed.enabled = false;
    }
  }

  destroy() {
    this.disable();
  }
}

export { EditorToolbar };

function btnEdit(cmd, content) {
  return el(
    "button",
    {
      class: ["btn", "btn-default"],
      dataset: {
        mc_action: "text_edit",
        mc_event_type: "click",
        mc_cmd: cmd,
      },
    },
    content
  );
}

function buildEl() {
  return el(
    "div",
    {
      class: ["mc-box-bar-edit"],
    },
    el(
      "span",
      { class: ["mc-box-bar-edit-btn-group", "btn-group-vertical"] },
      btnEdit("sizeText:more", el("span", "+")),
      btnEdit("sizeText:less", el("span", "-"))
    ),
    el(
      "span",
      { class: ["mc-box-bar-edit-btn-group", "btn-group-vertical"] },
      btnEdit("bold", el("b", "B")),
      btnEdit("italic", el("i", "I")),
      btnEdit("underline", el("u", "U")),
      btnEdit("strikeThrough", el("s", "S")),
      btnEdit("removeFormat", el("span", { class: ["fa", "fa-times"] }))
    ),
    el(
      "span",
      { class: ["mc-box-bar-edit-btn-group", "btn-group-vertical"] },
      btnEdit("formatBlock:P", el("span", "P")),
      btnEdit("formatBlock:H1", el("span", "H1")),
      btnEdit("formatBlock:H2", el("span", "H2")),
      btnEdit("formatBlock:H3", el("span", "H3")),
      btnEdit("formatBlock:DIV", el("span", { class: ["fa", "fa-times"] }))
    ),
    el(
      "span",
      { class: ["mc-box-bar-edit-btn-group", "btn-group-vertical"] },
      btnEdit(
        "insertUnorderedList",
        el("span", {
          class: ["fa", "fa-list-ul"],
        })
      ),
      btnEdit(
        "insertOrderedList",
        el("span", {
          class: ["fa", "fa-list-ol"],
        })
      )
    ),
    el(
      "span",
      { class: ["mc-box-bar-edit-btn-group", "btn-group-vertical"] },
      btnEdit(
        "justifyLeft",
        el("span", {
          class: ["fa", "fa-align-left"],
        })
      ),
      btnEdit(
        "justifyCenter",
        el("span", {
          class: ["fa", "fa-align-center"],
        })
      ),
      btnEdit(
        "justifyRight",
        el("span", {
          class: ["fa", "fa-align-right"],
        })
      )
    )
  );
}

function edit(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const boxTarget = this;
  const elTarget = e.target;
  const d = elTarget.dataset;
  const boxActive = boxTarget.mc.boxLastFocus;
  // read the property of the handle;
  let cmd = d.mc_cmd;
  const idType = d.mc_event_type;
  const isClick = idType === "click";
  const hasCmd = !!cmd;

  if (!isClick || !hasCmd) {
    return;
  }
  cmd = cmd.split(":");
  switch (cmd[0]) {
    case "sizeText":
      sizeText(boxActive, cmd[1]);
      break;
    default:
      document.execCommand(cmd[0], false, cmd[1]);
  }
  sanitizeBlocks(boxActive);
}

function paste(e) {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
}

function sizeText(boxActive, cmd) {
  if (boxActive && boxActive.editable) {
    if (cmd === "more") {
      boxActive.sizeTextMore();
    } else {
      boxActive.sizeTextLess();
    }
  }
}

function sanitizeBlocks(boxActive) {
  if (!boxActive.editable) {
    return;
  }
  const elContent = boxActive.elContent;
  if (elContent.contentEditable === "true") {
    flattenBlockElements(elContent);
  } else {
    const elsEditable = elContent.querySelectorAll('[contenteditable="true"]');
    for (const elEditable of [...elsEditable]) {
      flattenBlockElements(elEditable);
    }
  }
}
