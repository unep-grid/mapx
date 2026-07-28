import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  repair: vi.fn(),
  confirm: vi.fn(),
  dialog: vi.fn(),
}));

vi.mock("./channel.js", () => ({
  EditChannel: {
    getStatus: mocks.status,
    repairIdentity: mocks.repair,
  },
}));

vi.mock("../../mx_helper_modal.js", () => ({
  modalConfirm: mocks.confirm,
  modalDialog: mocks.dialog,
}));

vi.mock("../../language/index.js", () => ({
  getDictItem: vi.fn(async (key) => key),
  getDictTemplate: vi.fn(async (key, data) => `${key}:${data.issues}`),
}));

import { ensureEditableSourceIdentity } from "./identity_client.js";

describe("ensureEditableSourceIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues without prompting for a valid source", async () => {
    mocks.status.mockResolvedValue({ identity: { valid: true } });

    await expect(
      ensureEditableSourceIdentity("mx_vector_a_b_c_d_e"),
    ).resolves.toBe(true);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("repairs an invalid source after explicit confirmation", async () => {
    mocks.status.mockResolvedValue({
      identity: { valid: false, issues: ["duplicate_gid"] },
    });
    mocks.confirm.mockResolvedValue(true);
    mocks.repair.mockResolvedValue({ success: true });

    await expect(
      ensureEditableSourceIdentity("mx_vector_a_b_c_d_e"),
    ).resolves.toBe(true);
    expect(mocks.repair).toHaveBeenCalledWith("mx_vector_a_b_c_d_e");
  });

  it("keeps the editor closed when repair is ambiguous", async () => {
    mocks.status.mockResolvedValue({
      identity: { valid: false, issues: ["duplicate_gid"] },
    });
    mocks.confirm.mockResolvedValue(true);
    mocks.repair.mockResolvedValue({
      success: false,
      error: "Conflicting duplicate gids",
    });

    await expect(
      ensureEditableSourceIdentity("mx_vector_a_b_c_d_e"),
    ).resolves.toBe(false);
    expect(mocks.dialog).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Conflicting duplicate gids" }),
    );
  });
});
