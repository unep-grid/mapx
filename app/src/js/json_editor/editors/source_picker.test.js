import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emitAsync: vi.fn().mockResolvedValue({
    success: true,
    total: 0,
    facets: { tags: [] },
    items: [],
  }),
  open: vi.fn(),
}));

vi.mock("../../mx.js", () => ({
  ws: { emitAsync: mocks.emitAsync },
}));

vi.mock("../../settings/index.js", () => ({
  settings: { language: "fr" },
}));

vi.mock("../../window/index.js", () => ({
  getMapxWindowManager: () => ({ open: mocks.open }),
}));

import { JSONEditor } from "@json-editor/json-editor";
import "./source_picker.js";

function createEditor(schema, startval = "") {
  const target = document.body.appendChild(document.createElement("div"));
  const editor = new JSONEditor(target, {
    schema,
    startval,
    theme: "bootstrap3",
  });
  return new Promise((resolve) => {
    editor.on("ready", () => resolve({ editor, target }));
  });
}

describe("JSON Editor source picker adapter", () => {
  let editor;
  let target;

  afterEach(() => {
    editor?.destroy();
    target?.remove();
    vi.clearAllMocks();
  });

  it("resolves schema options and preserves a single string value", async () => {
    ({ editor, target } = await createEditor(
      {
        type: "string",
        title: "Base source",
        mx_options: {
          renderer: "source-picker",
          acceptedTypes: ["vector"],
          requiredCapabilities: ["geometry"],
          accessMode: "readable",
        },
      },
      "mx_vector_a_b_c_d_e",
    ));
    const field = editor.getEditor("root");

    expect(field.input.config).toMatchObject({
      label: "Base source",
      multiple: false,
      maxItems: 1,
      reorderable: false,
      acceptedTypes: ["vector"],
      requiredCapabilities: ["geometry"],
      accessMode: "readable",
      language: "fr",
    });
    expect(editor.getValue()).toBe("mx_vector_a_b_c_d_e");

    const onChange = vi.spyOn(field, "onChange");
    field.setValue("mx_vector_f_g_h_i_j");
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(field.getValue()).toBe("mx_vector_f_g_h_i_j");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("propagates user changes and follows JSON Editor disabled state", async () => {
    ({ editor, target } = await createEditor({
      type: "string",
      title: "Joined source",
      mx_options: {
        renderer: "source-picker",
        acceptedTypes: ["vector", "tabular"],
        requiredCapabilities: [],
        accessMode: "readable",
      },
    }));
    const field = editor.getEditor("root");
    const onChange = vi.spyOn(field, "onChange");
    field.input.selectedItems = new Map([
      [
        "mx_tabular_a_b_c_d_e",
        {
          id: "mx_tabular_a_b_c_d_e",
          title: "Statistics",
          type: "tabular",
        },
      ],
    ]);
    field.input.commit();

    expect(field.getValue()).toBe("mx_tabular_a_b_c_d_e");
    expect(onChange).toHaveBeenCalledWith(true);

    field.disable();
    expect(field.input.disabled).toBe(true);
    field.enable();
    expect(field.input.disabled).toBe(false);
  });

  it("closes an open picker window during teardown", async () => {
    ({ editor, target } = await createEditor({
      type: "string",
      mx_options: { renderer: "source-picker" },
    }));
    const close = vi.fn();
    editor.getEditor("root").input.browserWindow = { close };

    editor.destroy();
    editor = null;

    expect(close).toHaveBeenCalledWith("editor-destroyed");
  });
});
