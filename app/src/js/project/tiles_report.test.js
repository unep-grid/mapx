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
vi.mock("../el_mapx", () => ({
  tt: vi.fn((key, options) => {
    const node = document.createElement("span");
    node.dataset.lang_key = key;
    node.dataset.lang_type = "text";
    if (options?.data) node.dataset.lang_data = JSON.stringify(options.data);
    node.textContent = key;
    return node;
  }),
}));
vi.mock("../language/index.js", () => ({
  getDictItem: vi.fn((key) => Promise.resolve(key)),
}));
vi.mock("../is_test/index.js", () => ({
  isEmpty: vi.fn((value) => value === null || value === undefined || value === ""),
}));
vi.mock("./tiles_check_channel.js", () => ({ TilesCheckChannel: vi.fn() }));
vi.mock("./raster_url_configurator.js", () => ({
  RasterUrlConfigurator: vi.fn(function RasterUrlConfigurator() {
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

  it("puts translated actions first and opens the URL editor", async () => {
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
    const toolsCell = row.children[0];
    const titleCell = row.children[1];
    const editButton = row.querySelector(".tiles-report-edit");

    expect(toolsCell.classList.contains("tiles-report-tools")).toBe(true);
    expect(titleCell.textContent).toBe("Broken imagery");
    expect(titleCell.querySelector("button")).toBeNull();
    expect(editButton).not.toBeNull();
    expect(editButton.dataset.lang_key).toBe("project_tiles_url_editor_title");
    expect(editButton.dataset.lang_type).toBe("tooltip");
    await vi.waitFor(() => {
      expect(editButton.getAttribute("aria-label")).toBe(
        "project_tiles_url_editor_title",
      );
    });
    expect(row.querySelector(".tiles-report-check .fa-heartbeat")).not.toBeNull();
    expect(
      row.querySelector(".tiles-report-check").dataset.lang_key,
    ).toBe("project_tiles_report_btn_check");

    editButton.click();

    expect(editorInstances[0].show).toHaveBeenCalledWith(
      expect.objectContaining({
        idView: "MX-AAAAA-BBBBB-CCCCC",
        mode: "persist",
      }),
    );

    const { onApplied } = editorInstances[0].show.mock.calls[0][0];
    onApplied(
      {
        id_view: "MX-AAAAA-BBBBB-CCCCC",
        valid: true,
        tile_valid: true,
        legend_configured: true,
        legend_valid: true,
      },
      {
        tiles: "https://new.test/{z}/{x}/{y}.png",
        legend: "https://new.test/legend.png",
      },
    );
    expect(report.rows[0].tile_url).toContain("new.test");
    expect(report.rows[0].legend_url).toContain("new.test");
  });

  it("translates structured and legacy diagnostic codes", () => {
    const report = new TilesReport({});
    report.rows = [
      {
        id_view: "MX-AAAAA-BBBBB-CCCCC",
        title: "Structured",
        checked_at: Date.now(),
        tile_detail: "http_error",
        tile_http_status: 503,
        legend_configured: true,
        legend_detail: "timeout",
      },
      {
        id_view: "MX-DDDDD-EEEEE-FFFFF",
        title: "Legacy",
        checked_at: Date.now(),
        detail: "tiles:no_tile_template, legend:service_exception",
      },
    ];

    const table = report.buildTable();
    const detailCells = table.querySelectorAll(".tiles-report-detail");
    const structured = detailCells[1];
    const legacy = detailCells[2];

    expect(structured.textContent).toContain("project_tiles_report_col_tiles");
    expect(structured.textContent).toContain(
      "project_tiles_report_detail_http_error_status",
    );
    expect(
      structured.querySelector(
        '[data-lang_key="project_tiles_report_detail_http_error_status"]',
      ).dataset.lang_data,
    ).toBe('{"status":503}');
    expect(structured.textContent).toContain(
      "project_tiles_report_detail_timeout",
    );
    expect(legacy.textContent).toContain(
      "project_tiles_report_detail_no_tile_template",
    );
    expect(legacy.textContent).toContain(
      "project_tiles_report_detail_service_exception",
    );
  });

  it("keeps unknown diagnostic codes visible and safe", () => {
    const report = new TilesReport({});
    report.rows = [
      {
        id_view: "MX-AAAAA-BBBBB-CCCCC",
        title: "Future response",
        checked_at: Date.now(),
        tile_detail: "future_error_code",
      },
    ];

    const table = report.buildTable();
    const code = table.querySelector("tbody .tiles-report-detail-code");

    expect(code.textContent).toBe("future_error_code");
    expect(code.tagName).toBe("CODE");
  });

  it("shows a visible lifecycle for pending, checking, completed, and incomplete rows", () => {
    const report = new TilesReport({});
    report.rows = [
      { id_view: "MX-AAAAA-BBBBB-CCCCC", title: "First" },
      { id_view: "MX-DDDDD-EEEEE-FFFFF", title: "Second" },
    ];
    report.buildTable();

    report.resetRowsPending();
    expect(report.rowRefs.get("MX-AAAAA-BBBBB-CCCCC").statusCell.textContent).toContain(
      "project_tiles_report_status_pending",
    );

    report.setRowChecking("MX-DDDDD-EEEEE-FFFFF");
    expect(report.rowRefs.get("MX-DDDDD-EEEEE-FFFFF").statusCell.textContent).toContain(
      "project_tiles_report_status_checking",
    );

    report.setRowDone("MX-AAAAA-BBBBB-CCCCC", { valid: true });
    expect(report.rowRefs.get("MX-AAAAA-BBBBB-CCCCC").statusCell.textContent).toContain(
      "project_tiles_report_status_valid",
    );

    report.setRowDone("MX-AAAAA-BBBBB-CCCCC", {
      valid: false,
      tile_valid: false,
      tile_detail: "service_exception",
    });
    expect(
      report.rowRefs
        .get("MX-AAAAA-BBBBB-CCCCC")
        .detailCell.querySelector(
          '[data-lang_key="project_tiles_report_detail_service_exception"]',
        ),
    ).not.toBeNull();

    report.setRowsIncomplete();
    expect(report.rowRefs.get("MX-DDDDD-EEEEE-FFFFF").statusCell.textContent).toContain(
      "project_tiles_report_status_incomplete",
    );
    expect(report.rowRefs.get("MX-AAAAA-BBBBB-CCCCC").statusCell.textContent).toContain(
      "project_tiles_report_status_invalid",
    );
  });
});
