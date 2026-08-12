import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSourceEditPermission: vi.fn(),
}));

vi.mock("#mapx/db", () => ({ pgRead: { query: vi.fn() }, pgWrite: {} }));
vi.mock("#mapx/source", () => ({
  createSourceRevision: vi.fn(),
  getSourceMetadata: vi.fn(),
  getSourceEditPermission: mocks.getSourceEditPermission,
}));
vi.mock("#mapx/view", () => ({ getView: vi.fn() }));
vi.mock("#mapx/template", () => ({ templates: {} }));

import { getViewSourceMetadataEditAccess } from "./metadata.js";

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
    });
  });

  it.each([
    ["an unauthenticated session", { authenticated: false }],
    ["a malformed view id", { requestedId: "not-a-view" }],
    ["a non-VT view", { type: "rt" }],
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
