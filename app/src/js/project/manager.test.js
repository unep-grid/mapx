import { describe, expect, it, vi } from "vitest";

const { projectList, projectListWindow, windowManager } = vi.hoisted(() => {
  const projectList = { configure: vi.fn() };
  const projectListWindow = { close: vi.fn() };
  const windowManager = {
    root: {
      ownerDocument: { createElement: vi.fn(() => projectList) },
    },
    close: vi.fn(),
    open: vi.fn(() => projectListWindow),
  };
  return { projectList, projectListWindow, windowManager };
});

vi.mock("./../settings", () => ({
  settings: {
    language: "en",
    user: { guest: false, roles: {} },
    project: { allow_join: false, id: "CURRENT", title: { en: "Current" } },
  },
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
vi.mock("./../language", () => ({
  getDictItem: vi.fn(async (key) => key),
}));
vi.mock("../url_utils/url_utils.js", () => ({
  getQueryParameterInit: vi.fn(() => []),
}));
vi.mock("./roles_matrix.js", () => ({ RoleMatrix: vi.fn() }));
vi.mock("../window/index.js", () => ({
  getMapxWindowManager: vi.fn(() => windowManager),
}));

import { ProjectManager } from "./manager.js";

describe("ProjectManager Shiny bridge", () => {
  it("keeps the project-list handler arity required by Shiny", () => {
    const manager = new ProjectManager();
    expect(ProjectManager.prototype.list.length).toBe(1);
    expect(manager.list.length).toBe(1);
  });

  it("closes the owning project-list window after a project loads", async () => {
    const manager = new ProjectManager();
    await manager.list({});

    const { onProjectLoaded } = projectList.configure.mock.calls[0][0];
    onProjectLoaded("NEXT");

    expect(projectListWindow.close).toHaveBeenCalledWith("project-loaded");

    projectListWindow.close.mockClear();
    manager._projectListWindow = { close: vi.fn() };
    onProjectLoaded("LATE");
    expect(projectListWindow.close).not.toHaveBeenCalled();
  });

  it("opens the project list at the compact default width", async () => {
    const manager = new ProjectManager();
    await manager.list({});

    const config = windowManager.open.mock.calls.at(-1)[0];
    expect(config.geometry.width).toBe("min(760px, calc(100vw - 32px))");
    expect(config.resizable).toBe(true);
  });
});
