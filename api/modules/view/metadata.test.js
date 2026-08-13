import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSourceEditPermission: vi.fn(),
  createSourceRevision: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: vi.fn() },
  pgWrite: { connect: vi.fn() },
}));
vi.mock("#mapx/source", () => ({
  createSourceRevision: mocks.createSourceRevision,
  getSourceMetadata: vi.fn(),
  getSourceEditPermission: mocks.getSourceEditPermission,
}));
vi.mock("#mapx/view", () => ({ getView: vi.fn() }));
vi.mock("#mapx/template", () => ({ templates: {} }));

import {
  getViewSourceMetadataEditAccess,
  setViewSourceMetaBbox,
} from "./metadata.js";

const idView = "MX-J9P0S-B421T-2NTTN";
const idSource = "mx_vector_a_b_c_d_e";

describe("view source metadata edit access", () => {
  let socket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = {
      session: {
        user_authenticated: true,
        user_id: 7,
        project_id: "MX-CURRENT",
        user_roles: { publisher: true, root: false, group: ["publishers"] },
      },
    };
    mocks.getSourceEditPermission.mockResolvedValue({ allowed: true });
  });

  function clientFor(view) {
    return { query: vi.fn().mockResolvedValue({ rows: view ? [view] : [] }) };
  }

  it("returns the server-derived source id for an editable current VT view", async () => {
    const client = clientFor({
      type: "vt",
      project: "MX-CURRENT",
      id_source: idSource,
    });
    await expect(
      getViewSourceMetadataEditAccess(socket, { idView }, client),
    ).resolves.toEqual({ allowed: true, idSource });
    expect(mocks.getSourceEditPermission).toHaveBeenCalledWith({
      client,
      idSource,
      idUser: 7,
      idProject: "MX-CURRENT",
      allowRoot: false,
      roles: socket.session.user_roles,
    });
  });

  it("supports an external metadata entry linked by an RT view", async () => {
    const client = clientFor({
      type: "rt",
      project: "MX-CURRENT",
      id_source: "mx_extern_a_b_c_d_e",
      source_type: "external",
    });
    await expect(
      getViewSourceMetadataEditAccess(socket, { idView }, client),
    ).resolves.toEqual({
      allowed: true,
      idSource: "mx_extern_a_b_c_d_e",
    });
  });

  it.each([
    ["an unauthenticated session", { authenticated: false }],
    ["a malformed view id", { requestedId: "not-a-view" }],
    ["an unsupported view", { type: "sm" }],
    ["a view outside the current project", { project: "MX-OTHER" }],
    ["a view without a valid source", { source: "invalid" }],
  ])("rejects %s", async (_name, variant) => {
    if (variant.authenticated === false) {
      socket.session.user_authenticated = false;
    }
    const client = clientFor({
      type: variant.type || "vt",
      project: variant.project || "MX-CURRENT",
      id_source: variant.source || idSource,
    });
    await expect(
      getViewSourceMetadataEditAccess(
        socket,
        { idView: variant.requestedId || idView },
        client,
      ),
    ).resolves.toEqual({ allowed: false });
  });

  it("does not disclose the source id when its ACL denies editing", async () => {
    mocks.getSourceEditPermission.mockResolvedValue({ allowed: false });
    const client = clientFor({
      type: "vt",
      project: "MX-CURRENT",
      id_source: idSource,
    });
    await expect(
      getViewSourceMetadataEditAccess(socket, { idView }, client),
    ).resolves.toEqual({ allowed: false });
  });
});

describe("view source metadata bbox revisions", () => {
  let session;
  let client;

  beforeEach(() => {
    vi.clearAllMocks();
    session = {
      user_authenticated: true,
      user_id: 7,
      project_id: "MX-CURRENT",
      user_roles: { publisher: true, root: false, group: ["publishers"] },
    };
    client = { query: vi.fn() };
    mocks.getSourceEditPermission.mockResolvedValue({
      allowed: true,
      source: { data: { meta: {} } },
    });
    mocks.createSourceRevision.mockResolvedValue({ pid: 12 });
  });

  function resolveView({
    type = "rt",
    project = "MX-CURRENT",
    sourceType = "external",
    source = "mx_extern_a_b_c_d_e",
  } = {}) {
    client.query.mockResolvedValueOnce({
      rows: [
        {
          type,
          project,
          id_source: source,
          source_type: sourceType,
        },
      ],
    });
  }

  it("authorizes the server-resolved source before inserting a revision", async () => {
    resolveView();
    client.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      setViewSourceMetaBbox(
        idView,
        { lat1: 1, lat2: 2, lng1: 3, lng2: 4 },
        false,
        session,
        client,
      ),
    ).resolves.toEqual({ pid: 12 });

    expect(mocks.getSourceEditPermission).toHaveBeenCalledWith({
      client,
      idSource: "mx_extern_a_b_c_d_e",
      idUser: 7,
      idProject: "MX-CURRENT",
      roles: session.user_roles,
    });
    expect(mocks.createSourceRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        idSource: "mx_extern_a_b_c_d_e",
        idUser: 7,
        client,
      }),
    );
  });

  it.each([
    ["a view outside the session project", { project: "MX-OTHER" }],
    ["a non-external RT source", { sourceType: "vector" }],
    ["an unsupported view type", { type: "sm" }],
  ])("rejects %s", async (_label, view) => {
    resolveView(view);
    await expect(
      setViewSourceMetaBbox(idView, {}, true, session, client),
    ).rejects.toThrow("View has no editable metadata source");
    expect(mocks.createSourceRevision).not.toHaveBeenCalled();
  });

  it("rejects a session without current publisher authority", async () => {
    session.user_roles.publisher = false;
    await expect(
      setViewSourceMetaBbox(idView, {}, true, session, client),
    ).rejects.toThrow("Not allowed");
    expect(client.query).not.toHaveBeenCalled();
  });

  it("rejects a source denied by its current ACL", async () => {
    resolveView();
    client.query.mockResolvedValueOnce({ rows: [] });
    mocks.getSourceEditPermission.mockResolvedValue({ allowed: false });

    await expect(
      setViewSourceMetaBbox(idView, {}, true, session, client),
    ).rejects.toThrow("Source edit not allowed");
    expect(mocks.createSourceRevision).not.toHaveBeenCalled();
  });
});
