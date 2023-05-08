import { el } from "./el/src/index.js";
import { ObserveMutationAttribute } from "./mutations_observer/index.js";
import { moveEl, makeId, textToDom } from "./mx_helper_misc.js";
import { getDictItem } from "./language";
import { draggable } from "./mx_helper_draggable.js";
import {
  removeSelectizeGroupById,
  closeSelectizeGroupById,
  initSelectizeAll,
} from "./mx_helper_selectize.js";
import {
  isNotEmpty,
  isPromise,
  isObject,
  isString,
  isElement,
  isFunction,
  isHTML,
  isArray,
  isBoolean,
} from "./is_test/index.js";
import { SelectAuto } from "./select_auto";
/**
 * TODO:
 * - this helper should be converted to Class
 * - avoid manual DOM element extension (close,addMutationObserver,setTitle..)
 */

/**
 * Display a panel modal
 * @param {Object} o Options
 * @param {String} o.id Id of the box. Default : random
 * @param {Numeric} o.zIndex set zIndex. Default : value in css
 * @param {Boolean} o.replace If a modal is displayed twice with the same id, delete the previous one. Default : true
 * @param {Boolean} o.noShinyBinding  By default, the modal panel will try to bind automatically input elements. In some case, this is not wanted. Default : false
 * @param {String} o.styleString Style string to apply to modal window. Default : empty
 * @param {Object} o.style Style object to apply to modal window. Default : empty
 * @param {Boolean} o.close Close related modal
 * @param {Object} o.styleContent Style object to apply to content of the modal window. Default : empty
 * @param {String} o.idScrollTo Scroll to id in the body
 * @param {Boolean} o.addBtnMove Add top button to move the modal
 * @param {String|Element} o.content Body content of the modal. Default  : undefined
 * @param {Function} o.onClose On close callback
 * @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
 * @param {Array.<String>|Array.<Element>} o.buttonsAlt Array of buttons to in footer, on the right.
 *
 */
export function modal(o) {
  o = o || {};
  const id = o.id || makeId();
  document.activeElement?.blur();

  let elTitle,
    elBody,
    elContent,
    elButtons,
    elButtonsAlt,
    elButtonClose,
    elJedContainers,
    /**
     * Get or create modal and background
     */
    elModal = document.getElementById(o.id);

  let startBodyScrollPos = 0;

  const hasModal = isElement(elModal);
  if (!hasModal) {
    elModal = buildModal(id, o.style, o.styleContent);
  }

  const oa = new ObserveMutationAttribute({
    el: elModal,
    cb: o.onMutation,
  });

  const hasJquery = isFunction(window.jQuery);
  const hasShiny = isObject(window.Shiny);
  const hasSelectize = hasJquery && isFunction(window.Selectize);
  const noShinyBinding =
    !hasShiny || isBoolean(o.noShinyBinding) ? o.noShinyBinding : false;

  o.addSelectize = o.addSelectize === false ? false : true;

  if (o.close === true) {
    if (hasModal && isFunction(elModal.close)) {
      elModal.close();
    } else {
      close();
    }
    return;
  }

  if (hasModal && o.replace) {
    const oldBody = elModal.querySelector(".mx-modal-body");
    const rectModal = elModal.getBoundingClientRect();

    if (hasShiny && !noShinyBinding) {
      Shiny.unbindAll(elModal);
    }
    if (hasSelectize) {
      removeSelectizeGroupById(id);
    }
    if (oldBody) {
      startBodyScrollPos = oldBody.scrollTop;
    }

    elModal.remove();
    elModal = buildModal(id, {
      marginLeft: rectModal.left + "px",
      top: rectModal.top + "px",
    });
  }

  if (hasModal && !o.replace) {
    return;
  }

  if (o.styleString) {
    // replace style object entirely
    elModal.style = o.styleString;
  }

  if (o.zIndex) {
    elModal.style.zIndex = o.zIndex;
  }

  if (o.minWidth) {
    elModal.style.minWidth = o.minWidth;
  }
  if (o.minHeight) {
    elModal.style.minHeight = o.minHeight;
  }
  if (!o.removeCloseButton) {
    elButtonClose = el(
      "button",
      {
        id: "btnCloseModal",
        class: ["btn", "btn-default"],
        on: {
          click: close,
        },
      },
      o.textCloseButton
    );
    if (!o.textCloseButton) {
      getDictItem("btn_close").then((d) => {
        elButtonClose.innerText = d;
        elButtonClose.dataset.lang_key = "btn_close";
      });
    }
    elButtons.appendChild(elButtonClose);
  }

  if (isNotEmpty(o.buttons)) {
    o.buttons = isArray(o.buttons) ? o.buttons : [o.buttons];
    for (let button of o.buttons) {
      if (isHTML(button)) {
        button = textToDom(button);
      }
      if (isElement(button)) {
        elButtons.appendChild(button);
      }
    }
  }

  if (isNotEmpty(o.buttonsAlt)) {
    o.buttonsAlt = isArray(o.buttonsAlt) ? o.buttonsAlt : [o.buttonsAlt];
    for (let button of o.buttonsAlt) {
      if (isHTML(button)) {
        button = textToDom(button);
      }
      if (isElement(button)) {
        elButtonsAlt.appendChild(button);
      }
    }
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

  /**
   * Add focus
   */
  const elFirstButton = elButtons.firstElementChild;

  if (elFirstButton) {
    elFirstButton.focus();
  }

  /*
   * Initial pinned status
   */
  setPinned();

  if (o.addBackground) {
    elModal.classList.add("mx-modal-background");
  }

  /**
   * Init shiny and selectize
   */

  if (hasShiny && !noShinyBinding) {
    Shiny.bindAll(elModal);
  }
  if (o.addSelectize) {
    initSelectizeAll({
      id: id,
      selector: elModal,
      options: {
        dropdownParent: document.body,
      },
    });
  }

  draggable({
    selector: elModal,
    debounceTime: 2000,
    onStart: () => {
      closeSelectizeGroupById(id);
    },
  });

  if (isString(o.idScrollTo)) {
    const elScrollTo = elModal.querySelector(`#${o.idScrollTo}`);
    if (elScrollTo) {
      elScrollTo.scrollIntoView(true);
    }
  }

  /**
   * Return final element
   */
  return elModal;

  /**
   * Helpers
   */
  function buildModal(idModal, style, styleContent) {
    const elBtnCollapse = el("i", {
      class: ["mx-modal-top-btn-control", "fa", "fa-minus"],
      on: [
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          elModal.classList.toggle("mx-modal-collapsed");
          e.target.classList.toggle("fa-minus");
          e.target.classList.toggle("fa-plus");
        },
      ],
    });

    const elBtnHalfLeft = el("i", {
      class: [
        "mx-modal-top-btn-control",
        "mx-modal-top-btn-control-large",
        "fa",
        "fa-square",
        "fa-caret-left",
      ],
      on: [
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          const isCollapsed = elModal.classList.contains("mx-modal-collapsed");
          if (isCollapsed) {
            elBtnCollapse.classList.add("fa-minus");
            elBtnCollapse.classList.remove("fa-plus");
            elModal.classList.remove("mx-modal-collapsed");
          }
          moveEl(elModal, {
            left: 0,
            right: "auto",
            margin: 0,
            top: 0,
            width: "50%",
            height: "100%",
          });
        },
      ],
    });
    const elBtnHalfRight = el("i", {
      class: [
        "mx-modal-top-btn-control",
        "mx-modal-top-btn-control-large",
        "fa",
        "fa-square",
        "fa-caret-right",
      ],
      on: [
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          const isCollapsed = elModal.classList.contains("mx-modal-collapsed");
          if (isCollapsed) {
            elBtnCollapse.classList.add("fa-minus-square");
            elBtnCollapse.classList.remove("fa-plus-square");
            elModal.classList.remove("mx-modal-collapsed");
          }
          moveEl(elModal, {
            right: 0,
            left: "auto",
            margin: 0,
            top: 0,
            width: "50%",
            height: "100%",
          });
        },
      ],
    });
    const elModal = el(
      "div",
      {
        id: idModal,
        class: ["mx-modal-container", "mx-draggable"],
        style: style,
        on: ["mouseenter", setPinned],
      },
      el(
        "div",
        {
          class: ["mx-drag-handle", "mx-modal-top"],
        },
        (elTitle = el("div", {
          class: ["mx-modal-drag-enable", "mx-modal-title"],
        })),
        el(
          "div",
          {
            class: ["mx-modal-top-btns"],
          },
          [
            elBtnCollapse,
            o.addBtnMove ? elBtnHalfLeft : null,
            o.addBtnMove ? elBtnHalfRight : null,
          ]
        )
      ),
      el("div", {
        class: ["mx-modal-head"],
      }),
      (elBody = el(
        "div",
        {
          class: ["mx-modal-body", "mx-scroll-styled"],
        },
        (elContent = el("div", {
          style: styleContent,
          class: ["mx-modal-content"],
        }))
      )),
      el(
        "div",
        {
          class: ["mx-modal-foot"],
        },
        (elButtons = el("div", {
          class: ["btn-group", "mx-modal-foot-btns"],
        })),
        el("div", {
          id: idModal + "_txt",
          class: ["shiny-text-output", "mx-modal-foot-text"],
        }),
        (elButtonsAlt = el("div", {
          class: ["btn-group", "mx-modal-foot-btns"],
        }))
      ),
      el("div", {
        id: idModal + "_validation",
        class: ["shiny-html-output", "mx-modal-validation"],
      })
    );
    return elModal;
  }

  function setPinned() {
    const elsModal = document.querySelectorAll(".mx-modal-container");
    elsModal.forEach((elModalOther) => {
      if (elModalOther === elModal) {
        elModalOther.classList.add("pinned");
      } else {
        elModalOther.classList.remove("pinned");
      }
    });
  }

  function setTitle(newTitle) {
    addContent(newTitle, elTitle);
  }

  function addContent(content, elTarget) {
    if (!isElement(elTarget) || !content) {
      return;
    }

    if (isPromise(content)) {
      return content.then((c) => {
        addContent(c, elTarget);
      });
    }

    if (content && isElement(content)) {
      elTarget.appendChild(content);
    } else if (isHTML(content)) {
      elTarget.innerHTML = content;
    } else if (isString(content)) {
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
    if (isElement(elContent)) {
      /**
       * Remove jed editors
       */
      elJedContainers = elContent.querySelectorAll("[data-jed_id]");
      elJedContainers.forEach((elJed) => {
        const jedId = elJed.dataset.jed_id;
        if (jed.editors[jedId] && isFunction(jed.editors[jedId].destroy)) {
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
      removeSelectizeGroupById(id);
    }
    /**
     * Remove using jquery or DOM method.
     */
    elModal.remove();
    /**
     * on close callback
     */
    if (isFunction(o.onClose)) {
      o.onClose();
    }
  }
}

/**
 * Modal with default where non jquery + non-Shiny operations
 * @param {Object} opt Options ( passed to modal's options )
 * @return {Element} modal element
 */
export function modalSimple(opt) {
  const def = {
    buttons: [],
    title: "Modal",
    content: el("span", "Content"),
    addBackground: true,
  };

  opt = Object.assign({}, def, opt);

  return modal({
    // Set base modal options
    ...opt,
    // With priority to those options :
    title: opt.title,
    content: opt.content,
    noShinyBinding: true,
    addSelectize: false,
  });
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
  opt = opt || {};
  let selector = ".mx-modal-container";
  const hasIgnores =
    isArray(opt.ignoreSelectors) && opt.ignoreSelectors.length > 0;
  if (hasIgnores) {
    selector = opt.ignoreSelectors.reduce((a, c) => `${a}:not(${c})`, selector);
  }
  return document.querySelectorAll(selector);
}

/**
 * Simple async dialog modal : display text + close button
 * @param {Object} opt Options ( passed to modal's options )
 * @param {String|Promise|Element} opt.title Title
 * @param {String|Promise|Element} opt.content Title
 * @param {String|Promise|Element} opt.close Close button text
 * @param {Function} opt.onClose Optional cb
 * @param {Array} opt.buttons Additional buttons
 * @return {Promise} resolve to boolean
 */
export function modalDialog(opt) {
  let elModal;
  const def = {
    buttons: [],
  };
  opt = Object.assign({}, def, opt);
  return new Promise((resolve) => {
    const elBtnClose = el(
      "button",
      {
        class: "btn btn-default",
        type: "button",
        on: {
          click: (e) => {
            e.stopPropagation();
            e.preventDefault();
            resolve(true);
            elModal.close();
          },
        },
      },
      opt.close || getDictItem("btn_close")
    );

    elModal = modal({
      // Set base modal options
      ...opt,
      // With priority to those options :
      title: opt.title,
      content: opt.content,
      noShinyBinding: true,
      addSelectize: false,
      removeCloseButton: true,
      buttons: [elBtnClose, ...opt.buttons],
      addBackground: true,
      onClose: () => {
        if (isFunction(opt.onClose)) {
          opt.onClose();
        }
      },
    });
  });
}

/**
 * Simple async confirm modal : confirm / cancel
 * @param {Object} opt Options
 * @param {Function} opt.cbData If set, cb to set the returning value. arg: elModal, elContent
 * @param {Function} opt.cbInit If set, cb after init. arg:  elModal,elContent
 * @param {String|Promise|Element} opt.title Title
 * @param {String|Promise|Element} opt.content Title
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.confirm Confirm text
 * @return {Promise<boolean|any>} resolve to boolean or any, if cbData is set
 */
export function modalConfirm(opt) {
  let elModal;
  return new Promise((resolve) => {
    const elContent = el("div", opt.content);

    const elBtnCancel = el(
      "button",
      {
        class: "btn btn-default",
        type: "button",
        on: {
          click: (e) => {
            e.stopPropagation();
            e.preventDefault();
            resolve(false);
            elModal.close();
          },
        },
      },
      opt.cancel || getDictItem("btn_cancel")
    );

    const elBtnConfirm = el(
      "button",
      {
        class: "btn btn-default",
        type: "button",
        on: {
          click: async (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (opt.cbData) {
              const data = await opt.cbData(elModal, elContent);
              resolve(data);
            } else {
              resolve(true);
            }
            elModal.close();
          },
        },
      },
      opt.confirm || getDictItem("btn_confirm")
    );

    elModal = modal({
      noShinyBinding: true,
      addSelectize: false,
      removeCloseButton: true,
      title: opt.title,
      content: elContent,
      buttons: [elBtnConfirm, elBtnCancel],
      addBackground: true,
      onClose: () => {
        if (isFunction(opt.onClose)) {
          opt.onClose();
        }
        resolve();
      },
    });

    if (opt.cbInit) {
      opt.cbInit(elModal, elContent);
    }
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
 * @param {Function} opt.onInput Callback on input with (value, elBtnConfirm, elMessage, elInput) as args
 * @return {Promise} resolve to input type
 */
export function modalPrompt(opt) {
  let elModal;
  const def = {
    inputTag: "input",
    inputOptions: {
      type: "number",
      class: "form-control",
      //min: 0,
      //max: 1000,
      //value: 10,
      id: Math.random().toString(32),
      checkboxValues: {
        true: true,
        false: false,
      },
    },
    inputChildren: [],
    selectAutoOptions: null,
  };

  opt.inputOptions = Object.assign({}, def.inputOptions, opt.inputOptions);
  opt = Object.assign({}, def, opt);

  return new Promise((resolve) => {
    const isCheckbox = opt.inputOptions.type === "checkbox";
    const isSelectAuto = isObject(opt.selectAutoOptions);
    let selectAuto;

    if (isSelectAuto) {
      opt.inputTag = "select";
    }

    const elInput = el(opt.inputTag, opt.inputOptions, [...opt.inputChildren]);

    const elLabel = el(
      "label",
      { for: opt.inputOptions.id },
      el("div", opt.label || "Enter a value")
    );

    const elInputGroup = el("div", { class: "form-group" }, [elLabel, elInput]);

    if (opt.desc) {
      const elDesc = el(
        "div",
        { class: ["text-muted", "help-box"], for: opt.inputOptions.id },
        opt.desc
      );
      elLabel.appendChild(elDesc);
    }

    if (isCheckbox) {
      elInputGroup.className = "checkbox";
      elLabel.prepend(elInput);
      if (opt.inputOptions.value) {
        elInput.setAttribute("checked", true);
      }
    }
    if (isSelectAuto) {
      opt.selectAutoOptions.target = elInput;
      selectAuto = new SelectAuto(opt.selectAutoOptions);
    }

    const elMessage = el("small", {
      class: ["form-text"],
      style: {
        display: "flex",
        flexDirection: "column",
      },
    });
    const elContent = el("div", [elInputGroup, elMessage]);
    const elBtnCancel = el(
      "button",
      {
        class: "btn btn-default",
        type: "button",
        on: {
          click: (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (selectAuto instanceof SelectAuto) {
              selectAuto.destroy();
            }
            resolve(false);
            elModal.close();
          },
        },
      },
      opt.cancel || getDictItem("btn_cancel")
    );

    const elBtnConfirm = el(
      "button",
      {
        class: "btn btn-default",
        type: "button",
        on: {
          click: (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();

            const disabled = elBtnConfirm.getAttribute("disabled") === "true";
            if (disabled) {
              return;
            }

            const value = isCheckbox
              ? opt.inputOptions.checkboxValues[elInput.checked]
              : elInput.value;

            resolve(value);
            elModal.close();
            if (selectAuto instanceof SelectAuto) {
              selectAuto.destroy();
            }
          },
        },
      },
      opt.confirm || getDictItem("btn_confirm")
    );

    if (isFunction(opt.onInput)) {
      elInput.addEventListener("input", handlerInputWrapper);

      /**
       * Validate for default
       */
      const value = isCheckbox ? elInput.checked : elInput.value;
      handlerInput(value);
    }

    /**
     * elModal is referenced in the handler of the "close" button,
     * TODO: Refactor this to avoid such aberations
     */
    elModal = modal({
      noShinyBinding: true,
      addSelectize: false,
      removeCloseButton: true,
      title: opt.title,
      content: elContent,
      buttons: [elBtnConfirm, elBtnCancel],
      addBackground: true,
      onClose: () => {
        if (isFunction(opt.onClose)) {
          opt.onClose();
        }
        if (isFunction(opt.onInput)) {
          elInput.removeEventListener("input", handlerInputWrapper);
        }
        resolve();
      },
    });

    /**
     * Helpers
     */

    /**
     * On input wrapper.
     * TODO: merge this with the test in onInput handler
     */
    function handlerInputWrapper(_) {
      const value = isCheckbox
        ? opt.inputOptions.checkboxValues[elInput.checked]
        : elInput.value;
      handlerInput(value);
    }

    /**
     * If onInput returnn boolean, consider as a value to
     * enable/disable confirm btn
     */
    function handlerInput(value) {
      elMessage.innerText = "";
      const valid = opt.onInput(value, elBtnConfirm, elMessage, elInput);
      /**
       * Case validation returns boolean
       */
      if (isNotEmpty(valid) && isBoolean(valid)) {
        if (!valid) {
          console.log("disable");
          elBtnConfirm.setAttribute("disabled", "disabled");
          elBtnConfirm.classList.add("disabled");
        } else {
          console.log("enable");
          elBtnConfirm.removeAttribute("disabled");
          elBtnConfirm.classList.remove("disabled");
        }
      }
    }
  });
}
