import { beforeEach, describe, expect, it, vi } from "vitest";

const { editorInstances, windowManager } = vi.hoisted(() => {
  const editorInstances = [];
  const append = (node, value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => append(node, item));
    } else if (value instanceof Node) {
      node.appendChild(value);
    } else if (value !== null && value !== undefined) {
      node.appendChild(document.createTextNode(String(value)));
    }
  };
  const el = vi.fn((tag, ...args) => {
    const node = document.createElement(tag);
    for (const arg of args) {
      if (Array.isArray(arg) || arg instanceof Node) {
        append(node, arg);
        continue;
      }
      if (typeof arg === "string" || typeof arg === "number") {
        append(node, arg);
        continue;
      }
      if (!arg) continue;
      for (const [key, value] of Object.entries(arg)) {
        if (value === undefined) continue;
        if (key === "class") {
          node.className = Array.isArray(value) ? value.join(" ") : value;
        } else if (key === "on") {
          for (const [event, handler] of Object.entries(value)) {
            node.addEventListener(event, handler);
          }
        } else if (key === "dataset") {
          Object.assign(node.dataset, value);
        } else {
          node.setAttribute(key, String(value));
        }
      }
    }
    return node;
  });
  const windowManager = { el, open: vi.fn() };
  return { editorInstances, windowManager };
});

vi.mock("../window/index.js", () => ({
  getMapxWindowManager: vi.fn(() => windowManager),
}));
vi.mock("../mx.js", () => ({ ws: { emitAsync: vi.fn() } }));
vi.mock("../settings", () => ({ settings: { project: { id: "P1" } } }));
vi.mock("../el_mapx", () => ({ tt: vi.fn((key) => key) }));
vi.mock("../is_test/index.js", () => ({
  isEmpty: vi.fn((value) => value === null || value === undefined || value === ""),
}));
vi.mock("./tiles_check_channel.js", () => ({ TilesCheckChannel: vi.fn() }));
vi.mock("./tiles_url_editor.js", () => ({
  TilesUrlEditor: vi.fn(function TilesUrlEditor() {
    const editor = { show: vi.fn() };
    editorInstances.push(editor);
    return editor;
  }),
}));

import { TilesReport } from "./tiles_report.js";

describe("TilesReport edit action", () => {
  beforeEach(() => {
    editorInstances.length = 0;
    windowManager.open.mockReset();
    document.body.replaceChildren();
  });

  it("keeps titles non-interactive and opens the URL editor from the tools column", () => {
    const report = new TilesReport({});
    report.rows = [
      {
        id_view: "MX-AAAAA-BBBBB-CCCCC",
        title: "Broken imagery",
        editor_email: "editor@example.org",
        tile_url: "https://tiles.example/{z}/{x}/{y}.png",
      },
    ];

    const table = report.buildTable();
    const row = table.querySelector("tbody tr");
    const titleCell = row.children[0];
    const editButton = row.querySelector(".tiles-report-edit");

    expect(titleCell.textContent).toBe("Broken imagery");
    expect(titleCell.querySelector("button")).toBeNull();
    expect(editButton).not.toBeNull();
    expect(editButton.getAttribute("aria-label")).toBe(
      "project_tiles_url_editor_title",
    );

    editButton.click();

    expect(editorInstances[0].show).toHaveBeenCalledWith(
      expect.objectContaining({
        idView: "MX-AAAAA-BBBBB-CCCCC",
        tileUrl: "https://tiles.example/{z}/{x}/{y}.png",
      }),
    );
  });
});
