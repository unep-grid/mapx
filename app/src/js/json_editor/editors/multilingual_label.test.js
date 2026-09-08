import { JSONEditor } from "@json-editor/json-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./../../el_mapx/index.js", async () => {
  const { el } = await vi.importActual("./../../el/src/index.js");
  return {
    el,
    elButtonFa: (key, { action, content }) => {
      const button = document.createElement("button");
      button.type = "button";
      const label = document.createElement("span");
      label.dataset.lang_key = key;
      button.append(label, ...(content ? [content] : []));
      button.addEventListener("click", action);
      return button;
    },
  };
});

vi.mock("./../../language/index.js", () => ({
  checkLanguage: ({ obj, language, languages }) =>
    [language, ...languages].find((code) => obj[code]) || languages[0],
  getDictItem: async (key) =>
    ({
      en: "English",
      fr: "French",
      es: "Spanish",
      btn_cancel: "Cancel",
      btn_clear_all: "Clear all",
      btn_save: "Save",
      schema_style_label_open_translations: "Edit label translations",
      schema_style_label_copy_source: "Copy source",
      schema_style_label_copy_to_all_languages: "Copy to all languages",
      schema_style_label_translations: "Label translations",
      schema_style_value: "Value",
    })[key] || key,
}));

vi.mock("./../../mx_helper_misc.js", () => {
  let id = 0;
  return { makeId: () => `test-${++id}` };
});

vi.mock("./../../mx_helper_modal.js", () => ({
  modalSimple: (options) => {
    const modal = document.createElement("div");
    modal.className = "mx-modal-container";
    modal.appendChild(options.content);

    const footer = document.createElement("div");
    footer.className = "mx-modal-foot";
    const buttons = document.createElement("div");
    buttons.className = "mx-modal-foot-btns";
    const closeButton = document.createElement("button");
    closeButton.id = "btnCloseModal";
    closeButton.textContent = options.textCloseButton;
    buttons.append(closeButton, ...(options.buttons || []));
    const buttonsAlt = document.createElement("div");
    buttonsAlt.append(...(options.buttonsAlt || []));
    footer.append(buttons, buttonsAlt);
    modal.appendChild(footer);

    modal.close = () => {
      modal.remove();
      options.onClose?.();
    };
    closeButton.addEventListener("click", modal.close);
    document.body.appendChild(modal);
    return modal;
  },
}));

import "./multilingual_label.js";

describe("multilingual label editor", () => {
  let editor;

  afterEach(() => {
    editor?.destroy();
    editor = null;
    document.body.innerHTML = "";
  });

  it("shows hidden translations and applies modal changes on save", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    editor = new JSONEditor(target, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          value: { type: "string" },
          label_en: {
            type: "string",
            format: "mapx-multilingual-label",
            mx_options: {
              renderer: "mapx-multilingual-label",
              language: "en",
              languages: ["en", "fr", "es"],
              prefix: "label_",
            },
          },
          label_fr: { type: "string", options: { hidden: true } },
          label_es: { type: "string", options: { hidden: true } },
        },
      },
      startval: {
        value: "forest",
        label_en: "",
        label_fr: "Forêt",
        label_es: "Bosque",
      },
    });
    await ready(editor);

    const labelEditor = editor.getEditor("root.label_en");
    const trigger = target.querySelector(".mx-multilingual-label-trigger");
    const activeInput = labelEditor.input;
    expect(trigger.textContent).toContain("2/3");
    expect(activeInput.placeholder).toBe("FR: Forêt");

    trigger.click();
    const modal = await labelEditor._openPromise;
    expect(modal).toBe(labelEditor._modal);
    const inputs = modal.querySelectorAll(
      '.mx-multilingual-label-modal input[type="text"]',
    );
    expect([...inputs].map((input) => input.value)).toEqual([
      "",
      "Forêt",
      "Bosque",
    ]);

    inputs[0].value = "Forest";
    const footerButtons = modal.querySelectorAll(".mx-modal-foot-btns button");
    footerButtons[footerButtons.length - 1].click();

    expect(editor.getValue()).toEqual({
      value: "forest",
      label_en: "Forest",
      label_fr: "Forêt",
      label_es: "Bosque",
    });
    expect(trigger.textContent).toContain("3/3");
    expect(activeInput.placeholder).toBe("");
  });

  it("keeps cancel non-destructive and confirms clear all on save", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    editor = new JSONEditor(target, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          value: { type: "string" },
          label_en: {
            type: "string",
            format: "mapx-multilingual-label",
            mx_options: {
              language: "en",
              languages: ["en", "fr"],
              prefix: "label_",
            },
          },
          label_fr: { type: "string", options: { hidden: true } },
        },
      },
      startval: { value: "forest", label_en: "Forest", label_fr: "Forêt" },
    });
    await ready(editor);

    const labelEditor = editor.getEditor("root.label_en");
    let modal = await labelEditor.openTranslations();
    modal.querySelector(".mx-multilingual-label-modal input").value = "Changed";
    modal.querySelector("#btnCloseModal").click();
    expect(editor.getEditor("root.label_en").getValue()).toBe("Forest");

    modal = await labelEditor.openTranslations();
    modal
      .querySelector('[data-lang_key="btn_clear_all"]')
      .closest("button")
      .click();
    expect(
      [
        ...modal.querySelectorAll(
          '.mx-multilingual-label-modal input[type="text"]',
        ),
      ].every((input) => input.value === ""),
    ).toBe(true);
    const footerButtons = modal.querySelectorAll(".mx-modal-foot-btns button");
    footerButtons[footerButtons.length - 1].click();

    expect(editor.getValue()).toEqual({
      value: "forest",
      label_en: "",
      label_fr: "",
    });
    expect(editor.getEditor("root.label_en").input.placeholder).toContain(
      "forest",
    );
    const valueInput = editor.getEditor("root.value").input;
    valueInput.value = "woodland";
    valueInput.dispatchEvent(new Event("change"));
    await Promise.resolve();
    expect(editor.getEditor("root.label_en").input.placeholder).toContain(
      "woodland",
    );
  });

  it("copies the selected draft translation to every language", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    editor = new JSONEditor(target, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          value: { type: "string" },
          label_en: {
            type: "string",
            format: "mapx-multilingual-label",
            mx_options: {
              language: "en",
              languages: ["en", "fr", "es"],
              prefix: "label_",
            },
          },
          label_fr: { type: "string", options: { hidden: true } },
          label_es: { type: "string", options: { hidden: true } },
        },
      },
      startval: {
        value: "forest",
        label_en: "",
        label_fr: "Forêt",
        label_es: "Bosque",
      },
    });
    await ready(editor);

    const labelEditor = editor.getEditor("root.label_en");
    const modal = await labelEditor.openTranslations();
    const inputs = modal.querySelectorAll(
      '.mx-multilingual-label-modal input[type="text"]',
    );
    const radios = modal.querySelectorAll(
      '.mx-multilingual-label-modal input[type="radio"]',
    );
    const copyButton = modal
      .querySelector(
        '[data-lang_key="schema_style_label_copy_to_all_languages"]',
      )
      .closest("button");

    expect([...radios].map((radio) => radio.checked)).toEqual([
      false,
      true,
      false,
    ]);
    expect(copyButton.disabled).toBe(false);
    copyButton.click();
    expect([...inputs].map((input) => input.value)).toEqual([
      "Forêt",
      "Forêt",
      "Forêt",
    ]);
    expect(editor.getValue()).toEqual({
      value: "forest",
      label_en: "",
      label_fr: "Forêt",
      label_es: "Bosque",
    });

    const footerButtons = modal.querySelectorAll(".mx-modal-foot-btns button");
    footerButtons[footerButtons.length - 1].click();
    expect(editor.getValue()).toEqual({
      value: "forest",
      label_en: "Forêt",
      label_fr: "Forêt",
      label_es: "Forêt",
    });

    const reopenedModal = await labelEditor.openTranslations();
    const reopenedInputs = reopenedModal.querySelectorAll(
      '.mx-multilingual-label-modal input[type="text"]',
    );
    const reopenedRadios = reopenedModal.querySelectorAll(
      '.mx-multilingual-label-modal input[type="radio"]',
    );
    const reopenedCopyButton = reopenedModal
      .querySelector(
        '[data-lang_key="schema_style_label_copy_to_all_languages"]',
      )
      .closest("button");
    reopenedRadios[2].click();
    reopenedInputs[2].value = "";
    reopenedInputs[2].dispatchEvent(new Event("input"));
    expect(reopenedCopyButton.disabled).toBe(true);
    reopenedModal.querySelector("#btnCloseModal").click();
  });

  it("honors read-only and disabled editor states", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    editor = new JSONEditor(target, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          label_en: {
            type: "string",
            format: "mapx-multilingual-label",
            readOnly: true,
            mx_options: {
              language: "en",
              languages: ["en", "fr"],
              prefix: "label_",
            },
          },
          label_fr: { type: "string", options: { hidden: true } },
        },
      },
      startval: { label_en: "Forest", label_fr: "Forêt" },
    });
    await ready(editor);

    const readOnlyEditor = editor.getEditor("root.label_en");
    expect(readOnlyEditor._trigger.disabled).toBe(true);
    expect(await readOnlyEditor.openTranslations()).toBeNull();
    expect(document.querySelector(".mx-modal-container")).toBeNull();

    editor.destroy();
    document.body.innerHTML = "";
    const enabledTarget = document.body.appendChild(
      document.createElement("div"),
    );
    editor = new JSONEditor(enabledTarget, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          label_en: {
            type: "string",
            format: "mapx-multilingual-label",
            mx_options: {
              language: "en",
              languages: ["en", "fr"],
              prefix: "label_",
            },
          },
          label_fr: { type: "string", options: { hidden: true } },
        },
      },
      startval: { label_en: "Forest", label_fr: "Forêt" },
    });
    await ready(editor);

    const labelEditor = editor.getEditor("root.label_en");
    const modal = await labelEditor.openTranslations();
    const firstInput = modal.querySelector(
      '.mx-multilingual-label-modal input[type="text"]',
    );
    const footerButtons = modal.querySelectorAll(".mx-modal-foot-btns button");
    const detachedSaveButton = footerButtons[footerButtons.length - 1];
    firstInput.value = "Changed";

    labelEditor.disable();
    expect(labelEditor._trigger.disabled).toBe(true);
    expect(document.body.contains(modal)).toBe(false);
    detachedSaveButton.click();
    expect(editor.getValue()).toEqual({
      label_en: "Forest",
      label_fr: "Forêt",
    });

    labelEditor.enable();
    expect(labelEditor._trigger.disabled).toBe(false);
  });

  it("stays synchronized through table setValue and its own lifecycle", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    editor = new JSONEditor(target, {
      theme: "bootstrap3",
      schema: {
        type: "object",
        properties: {
          rules: {
            type: "array",
            format: "table",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label_en: {
                  type: "string",
                  format: "mapx-multilingual-label",
                  mx_options: {
                    language: "en",
                    languages: ["en", "fr"],
                    prefix: "label_",
                  },
                },
                label_fr: { type: "string", options: { hidden: true } },
              },
            },
          },
        },
      },
      startval: {
        rules: [
          { value: "a", label_en: "A", label_fr: "" },
          { value: "b", label_en: "", label_fr: "B français" },
        ],
      },
    });
    await ready(editor);

    const rulesEditor = editor.getEditor("root.rules");
    rulesEditor.setValue([
      { value: "b", label_en: "", label_fr: "B français" },
      { value: "a", label_en: "A", label_fr: "" },
    ]);
    await Promise.resolve();

    const firstLabelEditor = rulesEditor.rows[0].getChildEditors().label_en;
    expect(firstLabelEditor.input.placeholder).toBe("FR: B français");
    expect(firstLabelEditor._count.textContent).toBe("1/2");

    const modal = await firstLabelEditor.openTranslations();
    expect(document.body.contains(modal)).toBe(true);
    firstLabelEditor.destroy();
    editor = null;

    expect(document.body.contains(modal)).toBe(false);
  });
});

function ready(editor) {
  return new Promise((resolve) => editor.on("ready", resolve));
}
