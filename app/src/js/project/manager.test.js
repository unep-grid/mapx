import { beforeEach, describe, expect, it, vi } from "vitest";

const { projectList, projectListWindow, windowManager } = vi.hoisted(() => {
  const projectList = { configure: vi.fn() };
  const projectListWindow = { close: vi.fn() };
  const el = vi.fn((tag, ...args) => {
    if (tag === "mx-project-list") return projectList;
    const node = document.createElement(tag);
    for (const arg of args) {
      if (arg === null || arg === undefined) continue;
      if (arg instanceof Node) {
        node.appendChild(arg);
      } else if (typeof arg === "string" || typeof arg === "number") {
        node.appendChild(document.createTextNode(String(arg)));
      } else if (typeof arg === "object") {
        for (const [key, value] of Object.entries(arg)) {
          if (value === undefined) continue;
          if (key === "class") {
            node.className = Array.isArray(value) ? value.join(" ") : value;
          } else if (key === "on" && value) {
            for (const [evt, handler] of Object.entries(value)) {
              node.addEventListener(evt, handler);
            }
          } else if (key === "dataset" && value) {
            Object.assign(node.dataset, value);
          } else {
            node.setAttribute(key, value);
          }
        }
      }
    }
    return node;
  });
  const windowManager = {
    el,
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
  getQueryParameter: vi.fn(() => []),
  getQueryParameterInit: vi.fn(() => []),
}));
vi.mock("./roles_matrix.js", () => ({ RoleMatrix: vi.fn() }));
vi.mock("../window/index.js", () => ({
  getMapxWindowManager: vi.fn(() => windowManager),
}));

const { openConfirmDialog, analyze, channelInstances } = vi.hoisted(() => ({
  openConfirmDialog: vi.fn(),
  analyze: vi.fn(),
  channelInstances: [],
}));
const openNoticeDialog = vi.hoisted(() =>
  vi.fn(({ manager, windowConfig = {}, ...config }) =>
    new Promise((resolve) => {
      manager.open({
        ...config,
        ...windowConfig,
        onClose: resolve,
      });
    }),
  ),
);
vi.mock("../window/dialog.js", () => ({
  openConfirmDialog,
  openNoticeDialog,
}));
vi.mock("./delete_channel.js", () => {
  class ProjectDeleteChannel {
    constructor(config) {
      this.config = config;
      this.start = vi.fn(async () => true);
      this.stop = vi.fn(async () => true);
      this.commit = vi.fn(async () => true);
      channelInstances.push(this);
    }
  }
  ProjectDeleteChannel.analyze = analyze;
  return { ProjectDeleteChannel };
});

import { ProjectManager } from "./manager.js";

/** Resolve once windowManager.open's latest onClose fires ( simulated user click ) */
function closeLatestWindow(reason) {
  const config = windowManager.open.mock.calls.at(-1)[0];
  config.onClose?.(reason);
}

describe("ProjectManager Shiny bridge", () => {
  it("keeps the project-list handler arity required by Shiny", () => {
    const manager = new ProjectManager();
    expect(ProjectManager.prototype.list.length).toBe(1);
    expect(manager.list.length).toBe(1);
  });

  it("closes the owning project-list window when a project is requested", async () => {
    const manager = new ProjectManager();
    await manager.list({});

    const { onProjectRequested } = projectList.configure.mock.calls[0][0];
    onProjectRequested("NEXT");

    expect(projectListWindow.close).toHaveBeenCalledWith("project-requested");

    projectListWindow.close.mockClear();
    manager._projectListWindow = { close: vi.fn() };
    onProjectRequested("LATE");
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

describe("ProjectManager delete", () => {
  const idProject = "MX-DELETE-ME";
  const projectTitle = "Old Project";

  beforeEach(() => {
    openConfirmDialog.mockReset();
    openNoticeDialog.mockClear();
    analyze.mockReset();
    channelInstances.length = 0;
    windowManager.open.mockClear();
  });

  it("stops without calling analyze when the typed name is cancelled", async () => {
    openConfirmDialog.mockResolvedValueOnce(false);
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const result = await manager.delete(idProject, projectTitle);

    expect(result).toBe(false);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("only enables the confirm button once the typed value matches the title", async () => {
    openConfirmDialog.mockImplementationOnce(async (opt) => {
      const confirmButton = { disabled: true };
      const input = opt.content.querySelector("input");
      opt.onReady({ confirmButton });

      input.value = "wrong name";
      input.dispatchEvent(new Event("input"));
      expect(confirmButton.disabled).toBe(true);

      input.value = projectTitle;
      input.dispatchEvent(new Event("input"));
      expect(confirmButton.disabled).toBe(false);

      expect(opt.getValue()).toBe(projectTitle);
      return false;
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    await manager.delete(idProject, projectTitle);

    expect(openConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it("shows a notice and returns false when analyze reports an error", async () => {
    openConfirmDialog.mockResolvedValueOnce("Old Project");
    analyze.mockResolvedValueOnce({ error: "project_delete_not_legacy_forbidden" });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const resultPromise = manager.delete(idProject, projectTitle);
    await vi.waitUntil(() => windowManager.open.mock.calls.length > 0);
    closeLatestWindow("close");

    expect(await resultPromise).toBe(false);
    expect(channelInstances).toHaveLength(0);
  });

  it("returns false without starting a session when the analyze summary is cancelled", async () => {
    openConfirmDialog
      .mockResolvedValueOnce("Old Project") // typed name
      .mockResolvedValueOnce(false); // analyze summary confirm
    analyze.mockResolvedValueOnce({
      views: [],
      sources: [],
      themes: [],
      viewsDependent: [],
      sourcesDependent: [],
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const result = await manager.delete(idProject, projectTitle);

    expect(result).toBe(false);
    expect(channelInstances).toHaveLength(0);
  });

  it("starts the delete session and resolves true when the server reports done", async () => {
    openConfirmDialog
      .mockResolvedValueOnce("Old Project") // typed name
      .mockResolvedValueOnce(true); // analyze summary confirm
    analyze.mockResolvedValueOnce({
      views: [{ id: "v1" }],
      sources: [{ id: "s1" }],
      themes: [],
      viewsDependent: [],
      sourcesDependent: [],
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const resultPromise = manager.delete(idProject, projectTitle);
    await vi.waitUntil(() => channelInstances.length > 0);
    const channel = channelInstances[0];
    expect(channel.start).toHaveBeenCalledWith(idProject);

    channel.config.onDone({ id_project: idProject, removed: 3 });
    await vi.waitUntil(() => windowManager.open.mock.calls.length > 0);
    closeLatestWindow("close");

    expect(await resultPromise).toBe(true);
  });

  it("resolves false when the server reports a rollback", async () => {
    openConfirmDialog
      .mockResolvedValueOnce("Old Project")
      .mockResolvedValueOnce(true);
    analyze.mockResolvedValueOnce({
      views: [],
      sources: [],
      themes: [],
      viewsDependent: [],
      sourcesDependent: [],
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const resultPromise = manager.delete(idProject, projectTitle);
    await vi.waitUntil(() => channelInstances.length > 0);
    const channel = channelInstances[0];

    channel.config.onRolledBack({ id_project: idProject, reason: "stopped" });
    await vi.waitUntil(() =>
      windowManager.open.mock.calls.some((call) => call[0].onClose),
    );
    closeLatestWindow("close");

    expect(await resultPromise).toBe(false);
  });

  it("sends a commit confirmation when the user confirms the final gate", async () => {
    openConfirmDialog
      .mockResolvedValueOnce("Old Project") // typed name
      .mockResolvedValueOnce(true) // analyze summary confirm
      .mockResolvedValueOnce(true); // commit gate confirm
    analyze.mockResolvedValueOnce({
      views: [],
      sources: [],
      themes: [],
      viewsDependent: [],
      sourcesDependent: [],
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const resultPromise = manager.delete(idProject, projectTitle);
    await vi.waitUntil(() => channelInstances.length > 0);
    const channel = channelInstances[0];

    await channel.config.onProgress({
      id_project: idProject,
      step: "awaiting_commit",
      project_title: projectTitle,
      removed: { total: 5 },
    });
    expect(channel.commit).toHaveBeenCalled();

    channel.config.onDone({ id_project: idProject });
    await vi.waitUntil(() =>
      windowManager.open.mock.calls.some((call) => call[0].onClose),
    );
    closeLatestWindow("close");
    await resultPromise;
  });

  it("stops instead of committing when the commit gate resolves to its cancel value", async () => {
    // openConfirmDialog resolves to cancelValue ( false ) identically whether
    // the user clicked Cancel, pressed Escape, or closed the window via the
    // header X — window/dialog.test.js's "header close" case proves that
    // equivalence at the dialog level ; this proves manager.js reacts the
    // same way regardless of which of those triggered it.
    openConfirmDialog
      .mockResolvedValueOnce("Old Project") // typed name
      .mockResolvedValueOnce(true) // analyze summary confirm
      .mockResolvedValueOnce(false); // commit gate : Cancel / Escape / header X
    analyze.mockResolvedValueOnce({
      views: [],
      sources: [],
      themes: [],
      viewsDependent: [],
      sourcesDependent: [],
    });
    const manager = new ProjectManager();
    manager.testAuth = vi.fn().mockResolvedValue(true);

    const resultPromise = manager.delete(idProject, projectTitle);
    await vi.waitUntil(() => channelInstances.length > 0);
    const channel = channelInstances[0];

    await channel.config.onProgress({
      id_project: idProject,
      step: "awaiting_commit",
      project_title: projectTitle,
      removed: { total: 5 },
    });
    expect(channel.stop).toHaveBeenCalled();
    expect(channel.commit).not.toHaveBeenCalled();

    channel.config.onRolledBack({ id_project: idProject, reason: "stopped" });
    await vi.waitUntil(() =>
      windowManager.open.mock.calls.some((call) => call[0].onClose),
    );
    closeLatestWindow("close");
    expect(await resultPromise).toBe(false);
  });
});
