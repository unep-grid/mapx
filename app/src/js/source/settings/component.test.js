import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tomSelectInstances = [];
  class TomSelect {
    constructor(input) {
      this.input = input;
      this.destroy = vi.fn();
      this.disable = vi.fn();
      this.enable = vi.fn();
      tomSelectInstances.push(this);
    }
  }
  return {
    tomSelectInstances,
    moduleLoad: vi.fn(async () => TomSelect),
    ws: { emitAsync: vi.fn() },
    events: {
      on: vi.fn(),
      offGroup: vi.fn(),
    },
    triggerUpdateSourcesList: vi.fn(),
    triggerSourceSettingsChanged: vi.fn(),
    openConfirmDialog: vi.fn(),
    openNoticeDialog: vi.fn(),
  };
});

vi.mock("../../settings/index.js", () => ({
  settings: { language: "en" },
}));
vi.mock("../../language/index.js", () => ({
  getDictItem: vi.fn(async (keys) => (Array.isArray(keys) ? keys : keys)),
}));
vi.mock("../../modules_loader_async/index.js", () => ({
  moduleLoad: mocks.moduleLoad,
}));
vi.mock("../../mx.js", () => ({
  ws: mocks.ws,
  events: mocks.events,
}));
vi.mock("../../map_helpers/index.js", () => ({
  triggerUpdateSourcesList: mocks.triggerUpdateSourcesList,
  triggerSourceSettingsChanged: mocks.triggerSourceSettingsChanged,
}));
vi.mock("../../window/dialog.js", () => ({
  openConfirmDialog: mocks.openConfirmDialog,
  openNoticeDialog: mocks.openNoticeDialog,
}));

import "./component.js";

const overview = {
  ok: true,
  source: {
    id: "mx_vector_a_b_c_d_e",
    type: "vector",
    title: "Roads",
    editorEmail: "editor@example.test",
    readers: ["publishers"],
    editors: ["admins"],
    services: ["mx_download"],
    global: false,
  },
  choices: {
    readers: ["publishers", "admins"],
    editors: ["publishers", "admins"],
    services: ["mx_download", "gs_ws_b", "mx_postgis_tiler"],
  },
  permissions: { canSetGlobal: false },
  usage: {
    sources: 1,
    views: 2,
    hasDependencies: true,
    hasOtherProject: false,
    hasOtherEditor: true,
  },
  constraints: {
    forceGlobal: false,
    blockDelete: true,
    protectPublisherReaders: true,
  },
};

describe("MxSourceSettingsElement", () => {
  let component;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tomSelectInstances.length = 0;
    mocks.ws.emitAsync.mockImplementation(async (route) => {
      if (route === "/client/source/settings/get") {
        return structuredClone(overview);
      }
      if (route === "/client/source/settings/usage") {
        return {
          ok: true,
          rows: [
            {
              id: "view_1",
              title: "Dependent view",
              email_editor: "other@example.test",
              project: "MX-PROJECT",
              title_project: "Project",
            },
          ],
          total: 1,
          limit: 25,
          offset: 0,
        };
      }
      if (route === "/client/source/revise") {
        return { ok: true, pid: 2 };
      }
      throw new Error(`Unexpected route: ${route}`);
    });
    component = document.createElement("mx-source-settings");
    component.idSource = overview.source.id;
    component.applicationRoot = document.body;
    document.body.append(component);
  });

  afterEach(() => component.remove());

  it("renders scoped controls and server-derived blocking state", async () => {
    await vi.waitFor(() => expect(component.refs?.form).toBeTruthy());
    expect(component.elements.document).toBe(component.ownerDocument);
    expect(mocks.tomSelectInstances).toHaveLength(3);
    const fields = component.querySelectorAll(".mx-source-settings__field");
    const readonly = component.querySelectorAll(
      ".mx-source-settings__readonly",
    );
    expect(fields).toHaveLength(7);
    expect(component.querySelectorAll(".control-label")).toHaveLength(7);
    expect(readonly).toHaveLength(3);
    expect(readonly[0].readOnly).toBe(true);
    expect(readonly[0].value).toBe("Roads");
    expect(readonly[1].value).toBe(`${overview.source.id} · vector`);
    expect(readonly[2].value).toBe("editor@example.test");
    expect(component.refs.remove.disabled).toBe(true);
    expect(component.refs.global.disabled).toBe(true);
    expect(component.textContent).toContain(
      "source_settings_publishers_required",
    );
    expect(component.refs.warnings.classList).toContain("alert-warning");
    expect(
      component.querySelector(".mx-source-settings__usage").nextElementSibling,
    ).toBe(component.refs.warnings);
  });

  it("loads dependency rows only when their details are expanded", async () => {
    await vi.waitFor(() => expect(component.refs?.form).toBeTruthy());
    expect(mocks.ws.emitAsync).toHaveBeenCalledTimes(1);
    const details = component.querySelector("details");
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await vi.waitFor(() =>
      expect(mocks.ws.emitAsync).toHaveBeenCalledWith(
        "/client/source/settings/usage",
        expect.objectContaining({
          idSource: overview.source.id,
          category: "views",
        }),
        30000,
      ),
    );
    expect(details.textContent).toContain("Dependent view");
  });

  it("submits typed settings and refreshes legacy caches", async () => {
    const editableOverview = structuredClone(overview);
    editableOverview.constraints.blockDelete = false;
    editableOverview.permissions.canSetGlobal = true;
    mocks.ws.emitAsync.mockImplementation(async (route) => {
      if (route === "/client/source/settings/get") {
        return editableOverview;
      }
      if (route === "/client/source/revise") {
        return { ok: true, pid: 2 };
      }
      return { ok: true, rows: [], total: 0 };
    });
    component.remove();
    component = document.createElement("mx-source-settings");
    component.idSource = overview.source.id;
    component.applicationRoot = document.body;
    document.body.append(component);
    await vi.waitFor(() => expect(component.refs?.form).toBeTruthy());

    await component.save();

    expect(mocks.ws.emitAsync).toHaveBeenCalledWith(
      "/client/source/revise",
      expect.objectContaining({
        method: "settings",
        idSource: overview.source.id,
        changes: expect.objectContaining({
          readers: ["publishers"],
          editors: ["admins"],
          services: ["mx_download"],
          global: false,
        }),
      }),
      30000,
    );
    expect(mocks.triggerUpdateSourcesList).toHaveBeenCalledOnce();
    expect(mocks.triggerSourceSettingsChanged).toHaveBeenCalledOnce();
  });

  it("destroys Tom Select and language listeners on disconnect", async () => {
    await vi.waitFor(() => expect(mocks.tomSelectInstances).toHaveLength(3));
    const instances = [...mocks.tomSelectInstances];
    component.disconnectedCallback();
    component.remove();
    await vi.waitFor(() => {
      expect(
        instances.map((instance) => instance.destroy.mock.calls.length),
      ).toEqual([1, 1, 1]);
      expect(mocks.events.offGroup).toHaveBeenCalledWith(component.eventGroup);
    });
  });
});
