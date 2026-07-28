import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  makeId: () => "channel_id",
}));

import {
  EditChannel,
  createLockHeartbeat,
  defaults,
  events,
  roomId,
} from "./channel.js";

describe("roomId", () => {
  it("builds the shared room id format", () => {
    expect(roomId("mx_vector_a_b_c_d_e")).toBe(
      "room/source/edit/table/mx_vector_a_b_c_d_e",
    );
  });
});

describe("createLockHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits on interval after start, stops on stop", async () => {
    const emit = vi.fn().mockResolvedValue(true);
    const hb = createLockHeartbeat(emit, 1000);

    hb.start();
    expect(emit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(emit).toHaveBeenCalledTimes(2);

    hb.stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("does not start twice", async () => {
    const emit = vi.fn().mockResolvedValue(true);
    const hb = createLockHeartbeat(emit, 1000);
    hb.start();
    hb.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(emit).toHaveBeenCalledTimes(1);
    hb.stop();
  });

  it("swallows emit errors", async () => {
    const emit = vi.fn().mockRejectedValue(new Error("offline"));
    const hb = createLockHeartbeat(emit, 1000);
    hb.start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(emit).toHaveBeenCalledTimes(3);
    hb.stop();
  });
});

describe("EditChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats messages with table, room and session ids", () => {
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });
    ec._id_session = "session_id";

    expect(ec.message({ type: "feature", gid: 2 })).toEqual({
      id_table: "mx_vector_a_b_c_d_e",
      id_room: "room/source/edit/table/mx_vector_a_b_c_d_e",
      id_session: "session_id",
      type: "feature",
      gid: 2,
    });
  });

  it("requests trusted geometry column metadata", async () => {
    const info = {
      type: "MULTIPOINT",
      srid: 4326,
      simpleType: "point",
    };
    wsMock.emitAsync.mockResolvedValue(info);
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });
    ec._id_session = "session_id";

    await expect(ec.getGeometryInfo()).resolves.toBe(info);
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_get,
      expect.objectContaining({
        id_session: "session_id",
        type: "geometry_info",
      }),
      defaults.timeout_emit,
    );
  });

  it("treats an invalid gid identity as an edit lock", () => {
    expect(
      EditChannel.isStatusLocked({
        locked: false,
        geometryEditLock: null,
        identity: { valid: false },
      }),
    ).toBe(true);
    expect(
      EditChannel.isStatusLocked({
        locked: false,
        geometryEditLock: null,
        identity: { valid: true },
      }),
    ).toBe(false);
  });

  it("requests an explicit identity repair", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });

    await EditChannel.repairIdentity("mx_vector_a_b_c_d_e");

    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_identity_repair,
      { id_table: "mx_vector_a_b_c_d_e" },
      defaults.timeout_emit,
    );
  });

  it("joins the edit room and resolves on server_joined", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });

    const init = ec.init();
    // simulate the server join event
    ec.onJoined({
      id_room: ec._id_room,
      id_session: "session_id",
      members: [{ id: 1 }],
    });

    await expect(init).resolves.toBe(true);
    expect(ec.id_session).toBe("session_id");
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_edit_start,
      {
        id_table: "mx_vector_a_b_c_d_e",
        send_table: false,
        lightweight: true,
      },
      defaults.timeout_emit,
    );
    expect(wsMock.socket.on).toHaveBeenCalledWith(
      events.server_joined,
      ec.onJoined,
    );
    await ec.destroy();
  });

  it("rejects init on server error for its room", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });

    const init = ec.init();
    ec.onServerError({
      id_room: ec._id_room,
      message: "Not allowed",
    });

    await expect(init).rejects.toThrow("Not allowed");
    await ec.destroy();
  });

  it("emits exit on destroy and removes listeners", async () => {
    wsMock.emitAsync.mockResolvedValue(true);
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });
    ec._id_session = "session_id";

    await ec.destroy();

    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_exit,
      expect.objectContaining({
        id_session: "session_id",
      }),
      defaults.timeout_emit_short,
    );
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      events.server_joined,
      ec.onJoined,
    );
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      events.server_error,
      ec.onServerError,
    );
  });

  it("does not emit exit when never joined", async () => {
    const ec = new EditChannel({ id_table: "mx_vector_a_b_c_d_e" });
    await ec.destroy();
    expect(wsMock.emitAsync).not.toHaveBeenCalled();
  });
});
