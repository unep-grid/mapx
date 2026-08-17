import { beforeEach, describe, expect, it, vi } from "vitest";

const wsMock = vi.hoisted(() => ({
  emitAsync: vi.fn(),
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("../mx.js", () => ({ ws: wsMock }));

import { ProjectDeleteChannel, events } from "./delete_channel.js";

const idProject = "MX-DELETE-ME";

describe("ProjectDeleteChannel.analyze", () => {
  beforeEach(() => {
    wsMock.emitAsync.mockReset();
  });

  it("emits the analyze event with the project id and language", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });
    await ProjectDeleteChannel.analyze(idProject, "fr", 1000);
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_analyze,
      { id_project: idProject, language: "fr" },
      1000,
    );
  });
});

describe("ProjectDeleteChannel session", () => {
  beforeEach(() => {
    wsMock.emitAsync.mockReset();
    wsMock.socket.on.mockReset();
    wsMock.socket.off.mockReset();
  });

  it("binds server listeners and emits the start event", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });
    const channel = new ProjectDeleteChannel({});

    await channel.start(idProject);

    expect(wsMock.socket.on).toHaveBeenCalledWith(
      events.server_progress,
      channel.onProgress,
    );
    expect(wsMock.socket.on).toHaveBeenCalledWith(
      events.server_rolled_back,
      channel.onRolledBack,
    );
    expect(wsMock.socket.on).toHaveBeenCalledWith(
      events.server_error,
      channel.onError,
    );
    expect(wsMock.socket.on).toHaveBeenCalledWith(
      events.server_done,
      channel.onDone,
    );
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_start,
      { id_project: idProject },
      expect.any(Number),
    );
  });

  it("unbinds and throws when the server rejects the start request", async () => {
    wsMock.emitAsync.mockResolvedValue({
      success: false,
      error: "project_delete_not_legacy_forbidden",
    });
    const channel = new ProjectDeleteChannel({});

    await expect(channel.start(idProject)).rejects.toThrow(
      "project_delete_not_legacy_forbidden",
    );
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      events.server_progress,
      channel.onProgress,
    );
  });

  it("emits stop/commit scoped to the started project", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });
    const channel = new ProjectDeleteChannel({});
    await channel.start(idProject);

    wsMock.emitAsync.mockClear();
    await channel.stop();
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_stop,
      { id_project: idProject },
      expect.any(Number),
    );

    wsMock.emitAsync.mockClear();
    await channel.commit();
    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      events.client_commit,
      { id_project: idProject },
      expect.any(Number),
    );
  });

  it("ignores progress/error/done messages for a different project", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const channel = new ProjectDeleteChannel({ onProgress, onDone });
    await channel.start(idProject);

    channel.onProgress({ id_project: "OTHER", step: "views" });
    channel.onDone({ id_project: "OTHER" });

    expect(onProgress).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("routes matching messages to callbacks and tears down on terminal events", async () => {
    wsMock.emitAsync.mockResolvedValue({ success: true });
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const channel = new ProjectDeleteChannel({ onProgress, onDone });
    await channel.start(idProject);

    channel.onProgress({ id_project: idProject, step: "views", total: 3 });
    expect(onProgress).toHaveBeenCalledWith({
      id_project: idProject,
      step: "views",
      total: 3,
    });

    wsMock.socket.off.mockClear();
    channel.onDone({ id_project: idProject, removed: 4 });
    expect(onDone).toHaveBeenCalledWith({ id_project: idProject, removed: 4 });
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      events.server_done,
      channel.onDone,
    );

    // destroy() is idempotent, off() isn't called a second time
    wsMock.socket.off.mockClear();
    channel.onRolledBack({ id_project: idProject, reason: "stopped" });
    expect(wsMock.socket.off).not.toHaveBeenCalled();
  });
});
