import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./../language", () => ({
  getDict: vi.fn(),
  getLanguageCurrent: vi.fn(() => "en"),
}));
vi.mock("./../mx_helper_misc.js", () => ({
  clone: (x) => x,
  formatByteSize: vi.fn(),
  getSizeOf: vi.fn(),
  isShinyReady: () => false,
}));
vi.mock("./../map_helpers/index.js", () => ({ getViewJson: vi.fn() }));
vi.mock("./../style_vt/index.js", () => ({
  getViewMapboxStyle: vi.fn(),
  getViewSldStyle: vi.fn(),
}));
vi.mock("./../mx.js", () => ({ settings: {}, data: {} }));
vi.mock("../modules_loader_async", () => ({ moduleLoad: vi.fn() }));
vi.mock("../mx_helper_modal", () => ({ modalSimple: vi.fn() }));
vi.mock("../text_filter_simple", () => ({ TextFilter: vi.fn() }));
vi.mock("../data_diff_recover", () => ({ DataDiffModal: vi.fn() }));
vi.mock("./style.less", () => ({}));
vi.mock("./../../css/mx_tom_select.css", () => ({}));

let jed;
let jedGetValuesById;

beforeEach(async () => {
  ({ jed, jedGetValuesById } = await import("./index.js"));
  jed.editors = {};
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createEditor({ ready = true, value = { a: 1 } } = {}) {
  const callbacks = [];
  const editor = {
    ready,
    options: { hooksOnGet: [] },
    getValue: vi.fn(() => {
      if (!editor.ready) {
        throw new Error("JSON Editor not ready yet");
      }
      return value;
    }),
    on: vi.fn((event, cb) => {
      if (event === "ready") {
        callbacks.push(cb);
      }
    }),
    setReady() {
      editor.ready = true;
      callbacks.forEach((cb) => cb());
    },
  };
  return editor;
}

describe("jedGetValuesById", () => {
  it("does not throw when the editor is missing or destroyed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(jedGetValuesById({ id: "missing" })).resolves.toBeUndefined();

    const editor = createEditor({ ready: false });
    editor.destroyed = true;
    jed.editors.styleEdit = editor;
    await expect(
      jedGetValuesById({ id: "styleEdit" }),
    ).resolves.toBeUndefined();
    expect(editor.getValue).not.toHaveBeenCalled();
  });

  it("waits for a loading editor before reading values", async () => {
    const editor = createEditor({ ready: false });
    jed.editors.styleEdit = editor;

    const pending = jedGetValuesById({ id: "styleEdit", idEvent: "preview" });
    await Promise.resolve();
    expect(editor.getValue).not.toHaveBeenCalled();

    editor.setReady();
    const values = await pending;
    expect(values.data).toEqual({ a: 1 });
    expect(values.idEvent).toBe("preview");
  });
});
