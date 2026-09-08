import { describe, expect, it, vi } from "vitest";

vi.mock("../../language", () => ({
  getDictItem: vi.fn(async (key) => key),
  getDictTemplate: vi.fn(async (key) => key),
}));
vi.mock("../../mx.js", () => ({ draw: {} }));

import { dialogsMixin } from "./dialogs.js";
import { htAdapterMixin } from "./ht_adapter.js";

function createEditor(geometryEditEnabled) {
  return {
    _geometry_edit_enabled: geometryEditEnabled,
    _config: { id_column_geom_status: "geom_status" },
    column_index: "gid",
    dialogEditGeometry: vi.fn(async () => {}),
    dialogZoomFeature: vi.fn(async () => {}),
    renderGeomToolButton: htAdapterMixin.renderGeomToolButton,
  };
}

describe("table geometry edit access", () => {
  it("disables editing but keeps geometry preview available", () => {
    const editor = createEditor(false);
    const instance = {
      toPhysicalRow: vi.fn(() => 0),
      getSourceDataAtRow: vi.fn(() => ({ gid: 3, geom_status: "present" })),
    };
    const td = document.createElement("td");

    htAdapterMixin.renderGeomActionCell.call(editor, instance, td, 0);

    const buttons = td.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[0].dataset.lang_key).toBe("action_not_allowed_dev");
    expect(buttons[1].disabled).toBe(false);
  });

  it("keeps geometry editing enabled for developers", () => {
    const editor = createEditor(true);
    const instance = {
      toPhysicalRow: vi.fn(() => 0),
      getSourceDataAtRow: vi.fn(() => ({ gid: 3, geom_status: "present" })),
    };
    const td = document.createElement("td");

    htAdapterMixin.renderGeomActionCell.call(editor, instance, td, 0);

    expect(td.querySelector("button").disabled).toBe(false);
  });

  it("rejects programmatic geometry editor entry for non-developers", async () => {
    const acquireGeometryEditLock = vi.fn();
    await dialogsMixin.dialogEditGeometry.call(
      {
        _geometry_edit_enabled: false,
        _has_geom: true,
        _geom_mode: false,
        locked: false,
        acquireGeometryEditLock,
      },
      3,
    );

    expect(acquireGeometryEditLock).not.toHaveBeenCalled();
  });
});
