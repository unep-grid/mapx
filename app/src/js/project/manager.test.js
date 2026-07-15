import { describe, expect, it, vi } from "vitest";

vi.mock("./../settings", () => ({
  settings: { user: { roles: {} }, project: {} },
}));
vi.mock("./../mx_helper_modal.js", () => ({
  modalConfirm: vi.fn(),
  modalPrompt: vi.fn(),
}));
vi.mock("./../mx.js", () => ({ ws: { emitAsync: vi.fn() } }));
vi.mock("./../map_helpers", () => ({
  requestProjectMembership: vi.fn(),
  setProject: vi.fn(),
}));
vi.mock("./../el_mapx", () => ({ tt: vi.fn((value) => value) }));
vi.mock("./../language", () => ({ getDictItem: vi.fn() }));
vi.mock("../url_utils/url_utils.js", () => ({
  getQueryParameterInit: vi.fn(() => []),
}));
vi.mock("./roles_matrix.js", () => ({ RoleMatrix: vi.fn() }));

import { ProjectManager } from "./manager.js";

describe("ProjectManager Shiny bridge", () => {
  it("keeps the project-list handler arity required by Shiny", () => {
    const manager = new ProjectManager();
    expect(ProjectManager.prototype.list.length).toBe(1);
    expect(manager.list.length).toBe(1);
  });
});
