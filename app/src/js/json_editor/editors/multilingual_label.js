import { JSONEditor } from "@json-editor/json-editor";
import { waitFrameAsync } from "./../../animation_frame/index.js";
import { getArrayDistinct } from "./../../array_stat/index.js";
import { el, elButtonFa } from "./../../el_mapx/index.js";
import { checkLanguage, getDictItem } from "./../../language/index.js";
import { makeId } from "./../../mx_helper_misc.js";
import { modalSimple } from "./../../mx_helper_modal.js";
import {
  clearTranslations,
  getTranslationCount,
} from "./multilingual_label_helpers.js";
import "./multilingual_label.less";

const FORMAT = "mapx-multilingual-label";

JSONEditor.defaults.resolvers.unshift((schema) => {
  const isFormat = schema.type === "string" && schema.format === FORMAT;
  const isRenderer =
    schema.type === "string" && schema.mx_options?.renderer === FORMAT;
  if (isFormat || isRenderer) {
    return "mapxMultilingualLabel";
  }
});

JSONEditor.defaults.editors.mapxMultilingualLabel = class extends (
  JSONEditor.defaults.editors.string
) {
  build() {
    super.build();
    const options = this.schema.mx_options || {};
    const configuredLanguages = options.languages || [];
    this._activeLanguage = options.language || configuredLanguages[0] || "en";
    this._languages = getArrayDistinct([
      this._activeLanguage,
      ...configuredLanguages,
    ]);
    this._prefix = options.prefix || "label_";
    this._modal = null;
    this._modalOpening = false;
    this._destroyed = false;

    this._count = el("span", { class: "mx-multilingual-label-count" });
    this._trigger = elButtonFa("schema_style_label_open_translations", {
      icon: "globe",
      mode: "icon",
      content: this._count,
      action: (event) => {
        this._openPromise = this.openTranslations(event);
      },
    });
    this._trigger.classList.add("mx-multilingual-label-trigger");
    this._trigger.setAttribute("aria-haspopup", "dialog");
    this._trigger.setAttribute("aria-expanded", "false");
    this._trigger.disabled = !this.isEnabled();

    const inputParent = this.input.parentNode;
    this._inputGroup = el("div", {
      class: ["input-group", "mx-multilingual-label"],
    });
    inputParent.insertBefore(this._inputGroup, this.input);
    this._inputGroup.append(
      this.input,
      el("span", { class: "input-group-btn" }, this._trigger),
    );

    this.input.addEventListener("input", () => this.refreshIndicator(true));
    this._valueEditor = this.parent?.getChildEditors?.()?.value;
    this._onValueChange = () => this.scheduleRefresh();
    this._valueEditor?.input?.addEventListener("change", this._onValueChange);
    getDictItem("schema_style_value").then((label) => {
      this._valueLabel = label;
      this.refreshIndicator();
    });
    this.refreshIndicator();
  }

  setValue(...args) {
    const result = super.setValue(...args);
    this.scheduleRefresh();
    return result;
  }

  enable() {
    super.enable();
    if (this._trigger) {
      this._trigger.disabled = this._modalOpening || !this.isEnabled();
    }
  }

  disable(alwaysDisabled) {
    super.disable(alwaysDisabled);
    if (this._trigger) {
      this._trigger.disabled = true;
    }
    this._modal?.close();
  }

  scheduleRefresh() {
    if (this._refreshScheduled || this._destroyed) {
      return;
    }
    this._refreshScheduled = true;
    Promise.resolve().then(() => {
      this._refreshScheduled = false;
      this.refreshIndicator();
    });
  }

  refreshIndicator(useInputValue = false) {
    if (!this._count || this._destroyed) {
      return;
    }

    const labels = this.getLabels();
    if (useInputValue) {
      labels[this._activeLanguage] = this.input.value;
    }
    const count = getTranslationCount(labels, this._languages);
    this._count.textContent = `${count}/${this._languages.length}`;
    this._trigger.dataset.count = `${count}`;

    const activeValue = useInputValue
      ? this.input.value
      : labels[this._activeLanguage];
    if (activeValue) {
      this.input.placeholder = "";
      return;
    }

    const fallbackLanguage = checkLanguage({
      obj: labels,
      language: this._activeLanguage,
      languages: this._languages,
    });
    const fallbackLabel = labels[fallbackLanguage];
    const ruleValue = this.parent?.getValue()?.value;
    if (fallbackLabel) {
      this.input.placeholder = `${fallbackLanguage.toUpperCase()}: ${fallbackLabel}`;
    } else if (
      ruleValue === undefined ||
      ruleValue === null ||
      ruleValue === ""
    ) {
      this.input.placeholder = "";
    } else {
      this.input.placeholder = this._valueLabel
        ? `${this._valueLabel}: ${ruleValue}`
        : `${ruleValue}`;
    }
  }

  getLabels() {
    const editors = this.parent?.getChildEditors?.() || {};
    return Object.fromEntries(
      this._languages.map((language) => [
        language,
        editors[`${this._prefix}${language}`]?.getValue?.() || "",
      ]),
    );
  }

  async openTranslations(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (
      this._modal ||
      this._modalOpening ||
      this._destroyed ||
      !this.isEnabled()
    ) {
      return this._modal;
    }

    this._modalOpening = true;
    this._trigger.disabled = true;
    try {
      const languages = [
        this._activeLanguage,
        ...this._languages.filter(
          (language) => language !== this._activeLanguage,
        ),
      ];
      const labels = this.getLabels();
      const [languageNames, copySourceLabel] = await Promise.all([
        Promise.all(languages.map((language) => getDictItem(language))),
        getDictItem("schema_style_label_copy_source"),
      ]);
      if (this._destroyed || !this.isEnabled()) {
        return;
      }

      const inputs = {};
      const sourceRadios = {};
      const fallbackLanguage = checkLanguage({
        obj: labels,
        language: this._activeLanguage,
        languages,
      });
      const sourceLanguage = languages.includes(fallbackLanguage)
        ? fallbackLanguage
        : this._activeLanguage;
      const sourceName = `multilingual-label-source-${makeId()}`;
      const content = el("div", { class: "mx-multilingual-label-modal" });
      languages.forEach((language, index) => {
        const id = `multilingual-label-input-${makeId()}`;
        const sourceId = `multilingual-label-source-${makeId()}`;
        const input = el("input", {
          id,
          type: "text",
          value: labels[language] || "",
          class: "form-control",
          dir: "auto",
        });
        const sourceRadio = el("input", {
          id: sourceId,
          type: "radio",
          name: sourceName,
          value: language,
          checked: language === sourceLanguage,
          title: `${copySourceLabel}: ${languageNames[index]}`,
          "aria-label": `${copySourceLabel}: ${languageNames[index]}`,
        });
        inputs[language] = input;
        sourceRadios[language] = sourceRadio;
        content.appendChild(
          el(
            "div",
            {
              class: [
                "form-group",
                language === this._activeLanguage
                  ? "mx-multilingual-label-modal-active"
                  : null,
              ],
            },
            [
              el("div", { class: "mx-multilingual-label-modal-header" }, [
                el(
                  "label",
                  { for: id },
                  `${languageNames[index]} (${language.toUpperCase()})`,
                ),
                el(
                  "label",
                  {
                    for: sourceId,
                    class: "mx-multilingual-label-source",
                    title: `${copySourceLabel}: ${languageNames[index]}`,
                  },
                  sourceRadio,
                ),
              ]),
              input,
            ],
          ),
        );
      });

      const getSourceLanguage = () =>
        languages.find((language) => sourceRadios[language].checked);
      const copyButton = elButtonFa(
        "schema_style_label_copy_to_all_languages",
        {
          icon: "copy",
          mode: "icon_text",
          action: (copyEvent) => {
            copyEvent.preventDefault();
            const selectedLanguage = getSourceLanguage();
            const selectedValue = inputs[selectedLanguage]?.value;
            if (!selectedValue) {
              return;
            }
            for (const language of languages) {
              inputs[language].value = selectedValue;
            }
          },
        },
      );
      const updateCopyButton = () => {
        const selectedLanguage = getSourceLanguage();
        copyButton.disabled = !inputs[selectedLanguage]?.value;
      };
      for (const language of languages) {
        inputs[language].addEventListener("input", updateCopyButton);
        sourceRadios[language].addEventListener("change", updateCopyButton);
      }
      updateCopyButton();

      const clearButton = elButtonFa("btn_clear_all", {
        icon: "trash",
        mode: "icon_text",
        action: (clearEvent) => {
          clearEvent.preventDefault();
          const cleared = clearTranslations(labels, languages);
          for (const language of languages) {
            inputs[language].value = cleared[language];
          }
          updateCopyButton();
          inputs[this._activeLanguage]?.focus();
        },
      });
      const saveButton = elButtonFa("btn_save", {
        icon: "floppy-o",
        mode: "icon_text",
        action: (saveEvent) => {
          saveEvent.preventDefault();
          this.applyTranslations(inputs);
          this._modal?.close();
        },
      });

      const [title, cancelLabel] = await Promise.all([
        getDictItem("schema_style_label_translations"),
        getDictItem("btn_cancel"),
      ]);
      if (this._destroyed || !this.isEnabled()) {
        return;
      }
      const modalId = `multilingual-label-modal-${makeId()}`;
      this._modal = modalSimple({
        id: modalId,
        title,
        content,
        buttons: [saveButton],
        buttonsAlt: [copyButton, clearButton],
        textCloseButton: cancelLabel,
        addBackground: true,
        style: {
          width: "min(640px, calc(100vw - 30px))",
          maxHeight: "min(720px, calc(100vh - 30px))",
        },
        onClose: () => {
          this._modal = null;
          this._trigger.setAttribute("aria-expanded", "false");
          this._trigger.removeAttribute("aria-controls");
          if (!this._destroyed && this._trigger.isConnected) {
            this._trigger.focus();
          }
        },
      });
      this._trigger.setAttribute("aria-expanded", "true");
      this._trigger.setAttribute("aria-controls", modalId);
      await waitFrameAsync();
      if (this._modal && !this._destroyed) {
        inputs[this._activeLanguage]?.focus();
      }
      return this._modal;
    } finally {
      this._modalOpening = false;
      if (!this._destroyed) {
        this._trigger.disabled = !this.isEnabled();
      }
    }
  }

  applyTranslations(inputs) {
    if (!this.isEnabled()) {
      return;
    }
    const editors = this.parent?.getChildEditors?.() || {};
    for (const language of this._languages) {
      editors[`${this._prefix}${language}`]?.setValue(
        inputs[language]?.value || "",
      );
    }
    this.refreshIndicator();
  }

  destroy() {
    this._destroyed = true;
    this._valueEditor?.input?.removeEventListener(
      "change",
      this._onValueChange,
    );
    this._modal?.close();
    this._modal = null;
    super.destroy();
  }
};
