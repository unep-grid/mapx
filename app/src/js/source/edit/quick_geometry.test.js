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

  it("reads edit status without joining an edit room", async () => {
    const status = {
      id_table: "mx_vector_a_b_c_d_e",
      locked: false,
      geometryEditLock: null,
      geometryEditAllowed: true,
    };
    wsMock.emitAsync.mockResolvedValueOnce(status);

    await expect(
      QuickGeometryEditSession.getStatus("mx_vector_a_b_c_d_e"),
    ).resolves.toBe(status);

    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      "/client/source/edit/table/status",
      {
        id_table: "mx_vector_a_b_c_d_e",
      },
      60000,
    );
    expect(wsMock.socket.on).not.toHaveBeenCalled();
    expect(wsMock.socket.off).not.toHaveBeenCalled();
  });

  it("detects locked edit status from table and geometry locks", () => {
    expect(
      QuickGeometryEditSession.isStatusLocked({
        locked: true,
        geometryEditLock: null,
        geometryEditAllowed: true,
      }),
    ).toBe(true);
    expect(
      QuickGeometryEditSession.isStatusLocked({
        locked: false,
        geometryEditLock: {
          locked: true,
        },
        geometryEditAllowed: true,
      }),
    ).toBe(true);
    expect(
      QuickGeometryEditSession.isStatusLocked({
        locked: false,
        geometryEditLock: null,
        geometryEditAllowed: true,
      }),
    ).toBe(false);
    expect(
      QuickGeometryEditSession.isStatusLocked({
        locked: false,
        geometryEditLock: null,
        geometryEditAllowed: false,
      }),
    ).toBe(true);
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

  it("reads geometry edit lock state with a session-scoped get message", async () => {
    wsMock.emitAsync.mockResolvedValueOnce({
      locked: true,
      id_session: "other_session_id",
    });
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await expect(session.isGeometryEditLocked()).resolves.toBe(true);
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      "/client/get",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        type: "geometry_edit_lock",
      },
      60000,
    );
  });

  it("does not treat its own geometry lock as locked", async () => {
    wsMock.emitAsync.mockResolvedValueOnce({
      locked: true,
      id_session: "server_session_id",
    });
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await expect(session.isGeometryEditLocked()).resolves.toBe(false);
  });

  it("emits geometry lock acquire and release messages", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await session.acquireGeometryEditLock(12);
    await session.releaseGeometryEditLock();

    expect(wsMock.emitAsync).toHaveBeenNthCalledWith(
      1,
      "/client/source/edit/table/update",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        update_state: true,
        updates: [
          {
            type: "geometry_edit_lock",
            action: "acquire",
            mode: "quick",
            gid: 12,
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
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        update_state: true,
        updates: [
          {
            type: "geometry_edit_lock",
            action: "release",
          },
        ],
      },
      60000,
    );
  });

  it("runs a callback inside a geometry edit lock and releases it afterward", async () => {
    wsMock.emitAsync
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";
    const callback = vi.fn().mockResolvedValue("saved");

    await expect(session.withGeometryEditLock(12, callback)).resolves.toBe(
      "saved",
    );

    expect(callback).toHaveBeenCalledOnce();
    expect(wsMock.emitAsync).toHaveBeenCalledTimes(4);
    expect(wsMock.emitAsync.mock.calls[2][1].updates[0]).toEqual({
      type: "geometry_edit_lock",
      action: "acquire",
      mode: "quick",
      gid: 12,
    });
    expect(wsMock.emitAsync.mock.calls[3][1].updates[0]).toEqual({
      type: "geometry_edit_lock",
      action: "release",
    });
  });

  it("rejects editing when table lock state is active", async () => {
    wsMock.emitAsync.mockResolvedValueOnce(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await expect(session.assertEditable()).rejects.toThrow(
      "This table is already being edited.",
    );
  });

  it("rejects editing when geometry lock state is active", async () => {
    wsMock.emitAsync.mockResolvedValueOnce(false).mockResolvedValueOnce({
      locked: true,
      id_session: "other_session_id",
    });
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await expect(session.assertEditable()).rejects.toThrow(
      "This table is already being edited.",
    );
  });

  it("emits geometry updates with a session-scoped update message", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const session = new QuickGeometryEditSession({
      id_table: "mx_vector_a_b_c_d_e",
    });
    session._id_session = "server_session_id";

    await session.updateGeometry(12, {
      type: "Point",
      coordinates: [1, 2],
    });

    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      "/client/source/edit/table/update",
      {
        id_table: "mx_vector_a_b_c_d_e",
        id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
        id_session: "server_session_id",
        nParts: 1,
        part: 1,
        start: true,
        end: true,
        write_db: true,
        updates: [
          {
            type: "update_geom",
            id_table: "mx_vector_a_b_c_d_e",
            gid: 12,
            geom: {
              type: "Point",
              coordinates: [1, 2],
            },
          },
        ],
      },
      60000,
    );
  });
});
