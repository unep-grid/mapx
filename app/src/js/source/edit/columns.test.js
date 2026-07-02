import { describe, expect, it, vi } from "vitest";

vi.mock("./../../language", () => ({
  getDictItem: vi.fn((key) => Promise.resolve(key)),
}));

function makeNode(tag = "div", attrs = {}, content = "") {
  const node = document.createElement(tag);
  Object.assign(node, attrs);
  node.textContent = content;
  return node;
}

vi.mock("./../../el_mapx", () => ({
  el: vi.fn(makeNode),
  svg: vi.fn(makeNode),
  elAuto: vi.fn(() => makeNode()),
  elPanel: vi.fn(() => makeNode()),
  elButtonIcon: vi.fn(() => makeNode("button")),
  elButtonFa: vi.fn(() => makeNode("button")),
  elSpanTranslate: vi.fn(() => makeNode("span")),
  elInput: vi.fn(() => makeNode("input")),
  elCheckbox: vi.fn(() => makeNode("input")),
  elCheckToggle: vi.fn(() => makeNode("input")),
  elSelect: vi.fn(() => makeNode("select")),
  elDetails: vi.fn(() => makeNode("details")),
  elAlert: vi.fn(() => makeNode()),
  elToggle: vi.fn(() => makeNode()),
  elWait: vi.fn(() => makeNode()),
}));

vi.mock("./../../handsontable/utils.js", () => ({
  isPgType: vi.fn().mockReturnValue(true),
  isPgTypeDate: vi.fn().mockReturnValue(false),
  typeConvert: vi.fn().mockReturnValue("mx_string"),
}));

vi.mock("./../../mx_helper_misc.js", () => ({
  clone: vi.fn((value) => structuredClone(value)),
  patchObject: vi.fn((source, patch) => Object.assign({}, source, patch)),
}));

import { columnsMixin } from "./columns.js";

function createSession() {
  const session = {
    _config: {
      id_columns_reserved: [
        "gid",
        "_mx_valid",
        "geom",
        "__mx_geom_status",
        "__mx_geom_action",
      ],
    },
    _columns: [
      { data: "name" },
      { data: "__mx_geom_action" },
      { data: "_mx_valid" },
    ],
    emitGetCached: vi.fn().mockResolvedValue([]),
  };

  Object.assign(session, columnsMixin);
  return session;
}

describe("columnsMixin reserved columns", () => {
  it("treats the geometry action column as reserved", async () => {
    const session = createSession();

    expect(session.isColumnReserved("__mx_geom_action")).toBe(true);
    await expect(
      session.isValidName("__mx_geom_action", ["is_not_reserved"]),
    ).resolves.toBe(false);
  });

  it("disables the geometry action column in remove-column options", async () => {
    const session = createSession();

    const options = await session.getColumnsNamesOptions([
      "is_not_reserved",
      "is_safe",
      "is_not_used",
    ]);
    const geomActionOption = options.find(
      (option) => option.value === "__mx_geom_action",
    );

    expect(geomActionOption.disabled).toBe(true);
    expect(geomActionOption.label).toContain("__mx_geom_action");
    expect(geomActionOption.label).toContain(
      "edit_table_modal_issue_name_is_not_reserved",
    );
  });
});
