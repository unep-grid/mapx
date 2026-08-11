// @ts-check

/**
 * @typedef {Object} ConfirmDialogReadyContext
 * @property {import("./element.js").MxWindowElement} window
 * @property {HTMLButtonElement} confirmButton
 * @property {HTMLButtonElement} cancelButton
 * @property {HTMLElement} content
 */

/**
 * @template T
 * @typedef {Object} ConfirmDialogOptions
 * @property {import("./manager.js").MxWindowManager} manager
 * @property {string} [key]
 * @property {string} [title]
 * @property {Node | string | Promise<string> | Array<Node | string | Promise<string>>} [content]
 * @property {Node | string | Promise<string>} [confirmLabel]
 * @property {Node | string | Promise<string>} [cancelLabel]
 * @property {T} [cancelValue]
 * @property {() => T | Promise<T>} [getValue]
 * @property {(context: ConfirmDialogReadyContext) => void} [onReady]
 * @property {Partial<import("./manager.js").MxWindowConfig>} [windowConfig]
 */

/**
 * Open a promise-based confirmation dialog in an existing window manager.
 * Closing the window by any non-confirm action resolves to `cancelValue`.
 *
 * @template T
 * @param {ConfirmDialogOptions<T>} options
 * @returns {Promise<boolean | T>}
 */
export function openConfirmDialog(options) {
  const {
    manager,
    key,
    title = "",
    content = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    cancelValue = /** @type {T} */ (false),
    getValue,
    onReady,
    windowConfig = {},
  } = options || {};

  if (!manager || typeof manager.open !== "function") {
    throw new TypeError("openConfirmDialog requires an MxWindowManager");
  }

  if (key && manager.windows.has(key)) {
    manager.close(key, "replace");
  }

  return new Promise((resolve, reject) => {
    const createElement = manager.el;
    const contentElement = createElement(
      "div",
      { class: "mx-window-dialog__content" },
      content,
    );

    let settled = false;
    let dialogWindow = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const close = (reason) => dialogWindow?.close(reason);

    const cancelButton = /** @type {HTMLButtonElement} */ (
      createElement(
        "button",
        {
          class: ["btn", "btn-default"],
          type: "button",
          on: {
            click: () => {
              settle(cancelValue);
              close("cancel");
            },
          },
        },
        cancelLabel,
      )
    );
    const confirmButton = /** @type {HTMLButtonElement} */ (
      createElement(
        "button",
        {
          class: ["btn", "btn-primary"],
          type: "button",
          on: {
            click: async () => {
              try {
                const value = getValue ? await getValue() : true;
                settle(value);
                close("confirm");
              } catch (error) {
                if (!settled) {
                  settled = true;
                  reject(error);
                }
                close("error");
              }
            },
          },
        },
        confirmLabel,
      )
    );

    dialogWindow = manager.open({
      key,
      modal: true,
      draggable: true,
      resizable: false,
      collapsible: false,
      snappable: false,
      closeable: true,
      geometry: {
        width: "min(520px, calc(100vw - 32px))",
        height: "auto",
        minHeight: 0,
      },
      ...windowConfig,
      title,
      content: contentElement,
      footerEnd: [confirmButton, cancelButton],
      onClose: (reason) => {
        settle(cancelValue);
        windowConfig.onClose?.(reason);
      },
    });

    onReady?.({
      window: dialogWindow,
      confirmButton,
      cancelButton,
      content: contentElement,
    });
  });
}

/**
 * @typedef {Object} ChoiceDialogOption
 * @property {string} value
 * @property {Node | string | Promise<string>} label
 * @property {boolean} [disabled]
 * @property {boolean} [checked]
 */

/**
 * Open a radio-choice dialog and resolve to the selected value or `null`.
 *
 * @param {Object} options
 * @param {import("./manager.js").MxWindowManager} options.manager
 * @param {string} [options.key]
 * @param {string} [options.title]
 * @param {Node | string | Promise<string>} [options.description]
 * @param {ChoiceDialogOption[]} options.options
 * @param {string} [options.defaultValue]
 * @param {Node | string | Promise<string>} [options.confirmLabel]
 * @param {Node | string | Promise<string>} [options.cancelLabel]
 * @param {Partial<import("./manager.js").MxWindowConfig>} [options.windowConfig]
 * @returns {Promise<string | null>}
 */
export function openChoiceDialog({
  manager,
  key,
  title = "",
  description = "",
  options = [],
  defaultValue,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  windowConfig,
}) {
  if (!manager || typeof manager.open !== "function") {
    throw new TypeError("openChoiceDialog requires an MxWindowManager");
  }

  const createElement = manager.el;
  const name = `mx-window-choice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const radioGroup = createElement("div", {
    class: "mx-window-choice",
    role: "radiogroup",
  });

  options.forEach((option, index) => {
    const id = `${name}-${index}`;
    const input = createElement("input", {
      class: "mx-window-choice__input",
      id,
      name,
      type: "radio",
      value: option.value,
      disabled: option.disabled,
      checked:
        option.checked === true ||
        (option.checked === undefined && option.value === defaultValue),
    });
    const label = createElement(
      "label",
      { class: "mx-window-choice__label", for: id },
      input,
      option.label,
    );
    radioGroup.appendChild(
      createElement("div", { class: "mx-window-choice__option" }, label),
    );
  });

  const content = createElement(
    "div",
    { class: "mx-window-choice__content" },
    description,
    radioGroup,
  );

  return /** @type {Promise<string | null>} */ (
    openConfirmDialog({
      manager,
      key,
      title,
      content,
      confirmLabel,
      cancelLabel,
      cancelValue: null,
      getValue: () => {
        const selected = /** @type {HTMLInputElement | null} */ (
          radioGroup.querySelector(`input[name="${name}"]:checked`)
        );
        return selected?.value || null;
      },
      onReady: ({ confirmButton }) => {
        const update = () => {
          confirmButton.disabled = !radioGroup.querySelector(
            `input[name="${name}"]:checked`,
          );
        };
        radioGroup.addEventListener("change", update);
        update();
      },
      windowConfig,
    })
  );
}
