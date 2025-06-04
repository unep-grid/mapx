import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../../el/src/index.js";

/**
 * Set a resolver for the map position format
 */
JSONEditor.defaults.resolvers.unshift((schema) => {
  if (schema.type === "string" && schema.format === "svg") {
    return "svg_input";
  }
});

JSONEditor.defaults.editors.svg_input = class mxeditors extends (
  JSONEditor.defaults.editors.string
) {
  async build() {
    this.svgString = "";
    this.elError = el("div", { style: { color: "red", marginTop: "8px" } });

    // Drag and drop zone
    this.elDropZone = el(
      "div",
      {
        style: {
          border: "2px dashed var(--mx_ui_border)",
          padding: "20px",
          textAlign: "center",
          borderRadius: "10px",
          cursor: "pointer",
          marginBottom: "10px",
        },
        on: [
          [
            "dragover",
            (e) => {
              e.preventDefault();
              this.elDropZone.style.backgroundColor =
                "var(--mx_ui_background_accent)";
            },
          ],
          [
            "dragleave",
            (e) => {
              e.preventDefault();
              this.elDropZone.style.backgroundColor = "inherit";
            },
          ],
          [
            "drop",
            async (e) => {
              e.preventDefault();
              this.elDropZone.style.backgroundColor = "inherit";
              const file = e.dataTransfer.files[0];
              if (file) await this.processFile(file);
            },
          ],
        ],
      },
      this.options.uploadText || "Drop SVG file here or click to upload",
    );

    // File input (fallback)
    this.input = el("input", {
      type: "file",
      accept: ".svg",
      style: { display: "none" },
      on: [
        "input",
        async (e) => {
          const file = e.target.files[0];
          if (file) await this.processFile(file);
        },
      ],
    });

    this.elRemove = el(
      "button",
      {
        class: ["btn", "btn-circle", "btn-circle-small"],
        style: {
          position: "absolute",
          bottom: 0,
          right: 0,
          display: "none",
        },
        on: [
          "click",
          () => {
            this.clear();
          },
        ],
      },
      el("i", { class: ["fa", "fa-times", "noPointers"] }),
    );

    this.elDropZone.addEventListener("click", () => {
      this.input.click();
    });

    this.elPreview = el("div", {
      style: {
        marginTop: "10px",
        padding: "10px",
        border: "1px solid var(--mx_ui_border)",
        borderRadius: "10px",
        backgroundColor: "var(--mx_ui_background)",
        backgroundImage: "var(--mx_ui_pattern_checker)",
        maxWidth: "100%",
        maxHeight : "300px",
        overflow: "auto",
      },
    });

    this.elPreviewContainer = el(
      "div",
      { style: { display: "block", position: "relative" } },
      [this.elPreview, this.elRemove],
    );

    this.elLabel = el("label", this.options.label || "SVG Image");

    this.container.appendChild(
      el("div", { class: "well" }, [
        this.elLabel,
        this.elDropZone,
        this.input,
        this.elError,
        this.elPreviewContainer,
      ]),
    );
  }

  async processFile(file) {
    const maxSize = 50 * 1024; // 50 KB limit
    if (file.size > maxSize) {
      this.showError(`SVG exceeds ${maxSize / 1024} KB limit.`);
      return;
    }

    const text = await file.text();
    if (!this.validateSVG(text)) return;

    this.svgString = text;
    this.elPreview.innerHTML = text;
    this.elRemove.style.display = "block";
    this.input.value = "";
    this.showError("");
    this.onChange(true);
  }

  validateSVG(svgText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");

      const imageTags = doc.getElementsByTagName("image");
      if (imageTags.length > 0) {
        this.showError(
          "Embedded bitmap images (<image> tags) are not allowed.",
        );
        return false;
      }

      const svgEl = doc.getElementsByTagName("svg")[0];
      if (!svgEl) {
        this.showError("Invalid SVG: missing <svg> root.");
        return false;
      }

      return true;
    } catch (err) {
      this.showError("Failed to parse SVG.");
      return false;
    }
  }

  showError(msg) {
    this.elError.innerText = msg;
  }

  clear() {
    this.setValue("");
    this.elRemove.style.display = "none";
  }

  setValue(val) {
    this.svgString = val || "";
    this.elPreview.innerHTML = this.svgString;
    this.elRemove.style.display = "block";
    this.onChange(false);
  }

  getValue() {
    return this.svgString;
  }

  focus() {
    this.input.focus();
  }

  enable() {
    this.input.disabled = false;
  }

  disable() {
    this.input.disabled = true;
  }
};
