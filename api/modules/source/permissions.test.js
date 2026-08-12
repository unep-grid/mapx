import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
}));

vi.mock("#mapx/authentication", () => ({
  getUserRoles: mocks.getUserRoles,
}));

import { getSourceEditPermission } from "./permissions.js";

describe("source edit permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      root: false,
      group: ["publishers"],
    });
  });

  async function check(source, options = {}) {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: source ? [source] : [] }),
    };
    return getSourceEditPermission({
      client,
      idSource: "mx_vector_a_b_c_d_e",
      idUser: 7,
      ...options,
    });
  }

  it.each([
    { editor: 7, editors: [] },
    { editor: 8, editors: ["7"] },
    { editor: 8, editors: ["publishers"] },
  ])("allows a publisher matching the source ACL", async (acl) => {
    await expect(check({ ...acl, project: "MX-CURRENT" })).resolves.toEqual(
      expect.objectContaining({ allowed: true }),
    );
  });

  it("rejects a source outside the required project before loading roles", async () => {
    const result = await check(
      { editor: 7, editors: [], project: "MX-OTHER" },
      { idProject: "MX-CURRENT" },
    );
    expect(result.allowed).toBe(false);
    expect(mocks.getUserRoles).not.toHaveBeenCalled();
  });

  it("rejects a reader and an ACL-free root when root bypass is disabled", async () => {
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      root: true,
      group: ["admins"],
    });
    await expect(
      check(
        { editor: 8, editors: ["custom-editors"], project: "MX-CURRENT" },
        { allowRoot: false },
      ),
    ).resolves.toEqual(expect.objectContaining({ allowed: false }));
  });

  it("retains the source revision root bypass by default", async () => {
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      root: true,
      group: ["admins"],
    });
    await expect(
      check({ editor: 8, editors: [], project: "MX-CURRENT" }),
    ).resolves.toEqual(expect.objectContaining({ allowed: true }));
  });
});
