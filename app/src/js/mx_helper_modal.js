import { el } from "./el/src/index.js";
import { ObserveMutationAttribute } from "./mutations_observer/index.js";
import { makeId, textToDom } from "./mx_helper_misc.js";
import { getDictItem } from "./language";
import { draggable } from "./mx_helper_draggable.js";
import {
  removeSelectizeGroupById,
  closeSelectizeGroupById,
  initSelectizeAll,
} from "./mx_helper_selectize.js";
import {
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
 * @param {Object} o.styleContent Style object to apply to content of the modal window. Default : empty
 * @param {String|Element} o.content Body content of the modal. Default  : undefined
 * @param {Function} o.onClose On close callback
 * @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
 *
 */
export function modal(o) {
  o = o || {};
  const id = o.id || makeId();

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

  if (o.buttons) {
    o.buttons = isArray(o.buttons) ? o.buttons : [o.buttons];
    o.buttons.forEach(function (b) {
      if (isHTML(b)) {
        b = textToDom(b);
      }
      if (isElement(b)) {
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

  /**
   * Return final element
   */
  return elModal;

  /**
   * Helpers
   */
  function buildModal(idModal, style, styleContent) {
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
        (elCollapse = el("i", {
          class: [
            "mx-modal-top-btn-control",
            "fa",
            "fa-square-o",
            "fa-minus-square",
          ],
          on: [
            "click",
            (e) => {
              e.stopPropagation();
              e.preventDefault();
              elModal.classList.toggle("mx-modal-collapsed");
              elCollapse.classList.toggle("fa-minus-square");
            },
          ],
        }))
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
        })
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
      "div",
      {
        class: "btn btn-default",
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
        resolve();
      },
    });
  });
}

/**
 * Simple async confirm modal : confirm / cancel
 * @param {Object} opt Options
 * @param {String|Promise|Element} opt.title Title
 * @param {String|Promise|Element} opt.content Title
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.cancel Cancel text
 * @param {String|Promise|Element} opt.confirm Confirm text
 * @return {Promise} resolve to boolean
 */
export function modalConfirm(opt) {
  let elModal;
  return new Promise((resolve) => {
    const elContent = el("div", opt.content);

    const elBtnCancel = el(
      "div",
      {
        class: "btn btn-default",
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
      "div",
      {
        class: "btn btn-default",
        on: {
          click: (e) => {
            e.stopPropagation();
            e.preventDefault();
            resolve(true);
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

  return new Promise(async (resolve) => {
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
      "div",
      {
        class: "btn btn-default",
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
      "div",
      {
        class: "btn btn-default",
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

    if (opt.onInput instanceof Function) {
      elInput.addEventListener("input", (e) => {
        const value = isCheckbox
          ? opt.inputOptions.checkboxValues[elInput.checked]
          : elInput.value;
        opt.onInput(value, elBtnConfirm, elMessage);
      });

      /**
       * Validate for default
       */
      const value = isCheckbox ? elInput.checked : elInput.value;
      opt.onInput(value, elBtnConfirm, elMessage);
    }

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
  });
}
