import { beforeEach, describe, expect, it, vi } from "vitest";

const wsMock = vi.hoisted(() => ({
  emitAsync: vi.fn(),
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("../../mx.js", () => ({
  ws: wsMock,
}));

vi.mock("../../mx_helper_misc.js", () => ({
  makeId: () => "quick_edit_id",
}));

import { QuickGeometryEditSession } from "./quick_geometry.js";

describe("QuickGeometryEditSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads lock state with a session-scoped get message", async () => {
    wsMock.emitAsync.mockResolvedValueOnce(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await expect(session.isTableLocked()).resolves.toBe(true);
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      "/client/get",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        type: "lock_table",
      },
      60000,
    );
  });

  it("emits lock_table state updates for lock and unlock", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await session.setTableLock(true);
    await session.setTableLock(false);

    expect(wsMock.emitAsync).toHaveBeenNthCalledWith(
      1,
      "/client/source/edit/table/update",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        update_state: true,
        updates: [
          {
            type: "lock_table",
            lock: true,
          },
        ],
      },
      60000,
    );
    expect(wsMock.emitAsync).toHaveBeenNthCalledWith(
      2,
      "/client/source/edit/table/update",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        update_state: true,
        updates: [
          {
            type: "lock_table",
            lock: false,
          },
        ],
      },
      60000,
    );
  });
});
