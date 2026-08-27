import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSourceEditPermission: vi.fn(),
  getSourceEditors: vi.fn(),
}));

vi.mock("#mapx/source", () => ({
  getSourceEditors: mocks.getSourceEditors,
}));

vi.mock("../permissions.js", () => ({
  getSourceEditPermission: mocks.getSourceEditPermission,
}));

import { isSocketAllowedToEditGeometry } from "./permissions.js";

const idTable = "mx_vector_a_b_c_d_e";
const client = { query: vi.fn() };

function createSocket(overrides = {}) {
  return {
    session: {
      user_authenticated: true,
      user_id: 17,
      project_id: "MX-AAA-BBB-CCC-DDD-EEE",
      user_roles: { developer: false },
      ...overrides,
    },
    data: {},
  };
}

describe("geometry edit permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated sockets without querying source ACLs", async () => {
    const socket = createSocket({ user_authenticated: false });

    await expect(
      isSocketAllowedToEditGeometry(socket, idTable, client),
    ).resolves.toBe(false);
    expect(mocks.getSourceEditPermission).not.toHaveBeenCalled();
  });

  it("requires both current source access and developer role", async () => {
    const roles = { developer: true, publisher: true, group: ["publishers"] };
    mocks.getSourceEditPermission.mockResolvedValue({
      allowed: true,
      roles,
    });
    const socket = createSocket();

    await expect(
      isSocketAllowedToEditGeometry(socket, idTable, client),
    ).resolves.toBe(true);
    expect(mocks.getSourceEditPermission).toHaveBeenCalledWith({
      client,
      idSource: idTable,
      idUser: 17,
      idProject: "MX-AAA-BBB-CCC-DDD-EEE",
    });
    expect(socket.session.user_roles).toBe(roles);
    expect(socket.data.user_roles).toBe(roles);
  });

  it.each([
    { allowed: true, roles: { developer: false, publisher: true } },
    { allowed: false, roles: { developer: true, publisher: true } },
  ])("rejects incomplete permission: %o", async (permission) => {
    mocks.getSourceEditPermission.mockResolvedValue(permission);

    await expect(
      isSocketAllowedToEditGeometry(createSocket(), idTable, client),
    ).resolves.toBe(false);
  });
});
