import { modalConfirm } from "../mx_helper_modal.js";
import { el } from "../el_mapx";
import "./style.less";

/**
 * Modal with radio button options
 * @param {Object} opt Options
 * @param {String|Promise|Element} opt.title Modal title
 * @param {String|Promise|Element} opt.description Description
 * @param {Array} opt.options Array of radio button options
 * @param {String} opt.options[].value Value to return when selected
 * @param {String|Element|Promise} opt.options[].label Label (string for translation, element for rich content)
 * @param {Boolean} opt.options[].disabled Whether option is disabled
 * @param {Boolean} opt.options[].checked Whether option is initially selected
 * @param {String} opt.name Radio group name (auto-generated if not provided)
 * @param {String|Promise|Element} opt.confirm Confirm button text
 * @param {String|Promise|Element} opt.cancel Cancel button text
 * @param {Boolean} opt.addBackground Add modal background
 * @returns {Promise<String|null>} Selected value or null if cancelled
 */
export function modalRadio(opt) {
  const def = {
    options: [],
    name: `radio_${Math.random().toString(36).substr(2, 9)}`,
    addBackground: true,
  };

  opt = Object.assign({}, def, opt);

  // Build radio button group
  const elRadioGroup = buildRadioGroup(opt.options, opt.name);
  const elContent = el("div", [opt.description, elRadioGroup]);

  return modalConfirm({
    title: opt.title,
    content: elContent,
    confirm: opt.confirm,
    cancel: opt.cancel,
    addBackground: opt.addBackground,
    cbData: () => {
      // Get selected radio button value
      const selectedRadio = elRadioGroup.querySelector(
        `input[name="${opt.name}"]:checked`,
      );
      return selectedRadio ? selectedRadio.value : null;
    },
    cbValidate: (elBtnConfirm) => {
      // Enable/disable confirm button based on selection
      const updateConfirmButton = () => {
        const hasSelection = elRadioGroup.querySelector(
          `input[name="${opt.name}"]:checked`,
        );
        if (hasSelection) {
          elBtnConfirm.removeAttribute("disabled");
          elBtnConfirm.classList.remove("disabled");
        } else {
          elBtnConfirm.setAttribute("disabled", "disabled");
          elBtnConfirm.classList.add("disabled");
        }
      };

      // Initial state
      updateConfirmButton();

      // Listen for changes
      elRadioGroup.addEventListener("change", updateConfirmButton);
    },
    ...opt, // Allow overriding other modal options
  });
}

/**
 * Build radio button group from options
 * @param {Array} options Array of radio button options
 * @param {String} name Radio group name
 * @returns {Element} Radio group container element
 */
function buildRadioGroup(options, name) {
  return el(
    "div",
    {
      class: ["mx-modal-radio", "mx-radio-options"],
      role: "radiogroup",
    },
    options.map((option, i) => {
      const radioId = `${name}_${i}`;

      // Create radio input with all properties
      const elRadio = el("input", {
        type: "radio",
        id: radioId,
        name: name,
        value: option.value,
        class: ["mx-radio-input"],
        disabled: option.disabled,
        checked: option.checked,
      });

      // Create label - el() handles string/promise/element automatically
      const elLabel = el(
        "label",
        {
          for: radioId,
          class: ["mx-radio-label"],
        },
        [elRadio, option.label],
      );

      // Create option container
      return el(
        "div",
        {
          class: ["mx-radio-option"],
        },
        elLabel,
      );
    }),
  );
}
