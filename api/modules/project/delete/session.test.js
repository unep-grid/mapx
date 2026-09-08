import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connect, assertProjectDeletable, getProjectDeleteImpact } = vi.hoisted(
  () => ({
    connect: vi.fn(),
    assertProjectDeletable: vi.fn(),
    getProjectDeleteImpact: vi.fn(),
  }),
);

vi.mock("#mapx/db", () => ({ pgWrite: { connect } }));
vi.mock("#mapx/template", () => ({
  templates: {
    removeDeletedViewsExternal: "REMOVE_DELETED_VIEWS_EXTERNAL_SQL",
  },
}));
vi.mock("./guards.js", () => ({ assertProjectDeletable }));
vi.mock("./impact.js", () => ({ getProjectDeleteImpact }));

import { events } from "./events.js";
import {
  ProjectDeleteSession,
  ioProjectDeleteStart,
  ioProjectDeleteStop,
  ioProjectDeleteCommit,
  def,
} from "./session.js";

const idProject = "MX-T6R-PJF-2DF-3OI-LBF";

const defaultImpact = {
  sources: [{ id: "src_vector" }, { id: "src_join" }, { id: "src_external" }],
  views: [{ id: "view_own" }],
  themes: [{ id: "theme_own" }],
  sourcesDependent: [{ id: "src_dependent" }],
  viewsDependent: [{ id: "view_dependent" }],
};

const typeById = {
  src_vector: "vector",
  src_join: "join",
  src_external: "external",
  src_dependent: "raster",
};

function makeClient({ sourceDeleteRowCount = {} } = {}) {
  const calls = [];
  const query = vi.fn(async (sql, params) => {
    calls.push([sql, params]);
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return {};
    }
    if (sql.startsWith("SELECT type FROM mx_sources_latest")) {
      return { rows: [{ type: typeById[params[0]] }] };
    }
    if (sql.startsWith("DROP")) {
      return {};
    }
    if (sql.startsWith("DELETE FROM mx_sources")) {
      const rowCount = sourceDeleteRowCount[params[0]] ?? 1;
      return { rowCount };
    }
    if (sql.includes("mx_views WHERE id = ANY")) {
      return {};
    }
    if (sql === "REMOVE_DELETED_VIEWS_EXTERNAL_SQL") {
      return {};
    }
    if (sql.startsWith("DELETE FROM mx_themes")) {
      return {};
    }
    if (sql.startsWith("DELETE FROM mx_projects")) {
      return { rowCount: 1 };
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  });
  return { query, release: vi.fn(), calls };
}

let socketCounter = 0;
function makeSocket() {
  socketCounter += 1;
  return {
    id: `socket-${socketCounter}`,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe("ProjectDeleteSession", () => {
  beforeEach(() => {
    connect.mockReset();
    assertProjectDeletable.mockReset();
    assertProjectDeletable.mockResolvedValue({ title: "Old Project" });
    getProjectDeleteImpact.mockReset();
    getProjectDeleteImpact.mockResolvedValue(defaultImpact);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes views/sources/themes/project, branches DROP by source type, and only commits after explicit confirmation", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    let awaitingCommitPayload = null;
    socket.emit.mockImplementation((event, payload) => {
      if (
        event === events.server_progress &&
        payload.step === "awaiting_commit"
      ) {
        awaitingCommitPayload = payload;
        session.confirmCommit();
      }
    });

    await session.run();

    expect(awaitingCommitPayload.project_title).toBe("Old Project");
    expect(awaitingCommitPayload.removed).toEqual({
      views: 2, // view_own + view_dependent
      sources: 4, // src_vector, src_join, src_external, src_dependent
      themes: 1,
      total: 8, // views + sources + themes + the project row itself
    });

    const sqlCalls = client.calls.map(([sql]) => sql);
    expect(sqlCalls[0]).toBe("BEGIN");
    expect(sqlCalls.at(-1)).toBe("COMMIT");
    expect(sqlCalls).not.toContain("ROLLBACK");

    expect(sqlCalls.some((s) => s.includes("mx_views WHERE id = ANY"))).toBe(
      true,
    );
    expect(
      sqlCalls.some((s) => s === 'DROP TABLE IF EXISTS "src_vector" CASCADE'),
    ).toBe(true);
    expect(sqlCalls.some((s) => s === 'DROP VIEW IF EXISTS "src_join"')).toBe(
      true,
    );
    expect(
      sqlCalls.some(
        (s) => s.includes('"src_external"') && s.startsWith("DROP"),
      ),
    ).toBe(false);
    expect(
      sqlCalls.some(
        (s) => s === 'DROP TABLE IF EXISTS "src_dependent" CASCADE',
      ),
    ).toBe(true);
    const externalViewsCleanup = client.calls.find(
      ([sql]) => sql === "REMOVE_DELETED_VIEWS_EXTERNAL_SQL",
    );
    expect(externalViewsCleanup?.[1]).toEqual([["view_own", "view_dependent"]]);
    expect(sqlCalls.some((s) => s.startsWith("DELETE FROM mx_themes"))).toBe(
      true,
    );
    expect(sqlCalls.some((s) => s.startsWith("DELETE FROM mx_projects"))).toBe(
      true,
    );

    expect(
      socket.emit.mock.calls.some(([event]) => event === events.server_done),
    ).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  it("does not run external-view cleanup when no views are deleted", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    getProjectDeleteImpact.mockResolvedValueOnce({
      sources: [],
      views: [],
      themes: [],
      sourcesDependent: [],
      viewsDependent: [],
    });
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    socket.emit.mockImplementation((event, payload) => {
      if (
        event === events.server_progress &&
        payload.step === "awaiting_commit"
      ) {
        session.confirmCommit();
      }
    });

    await session.run();

    expect(
      client.calls.some(([sql]) => sql === "REMOVE_DELETED_VIEWS_EXTERNAL_SQL"),
    ).toBe(false);
  });

  it("rolls back on stop mid-progress, without ever committing", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    socket.emit.mockImplementation((event, payload) => {
      if (event === events.server_progress && payload.step === "views") {
        session.requestStop();
      }
    });

    await session.run();

    const sqlCalls = client.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls.at(-1)).toBe("ROLLBACK");
    expect(
      socket.emit.mock.calls.some(
        ([event, payload]) =>
          event === events.server_rolled_back && payload.reason === "stopped",
      ),
    ).toBe(true);
  });

  it("rolls back on cancel at the final commit gate", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    socket.emit.mockImplementation((event, payload) => {
      if (
        event === events.server_progress &&
        payload.step === "awaiting_commit"
      ) {
        session.requestStop();
      }
    });

    await session.run();

    const sqlCalls = client.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls.at(-1)).toBe("ROLLBACK");
  });

  it("rolls back on disconnect and reports the disconnected reason", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    socket.emit.mockImplementation((event, payload) => {
      if (event === events.server_progress && payload.step === "views") {
        session.onDisconnect();
      }
    });

    await session.run();

    expect(
      socket.emit.mock.calls.some(
        ([event, payload]) =>
          event === events.server_rolled_back &&
          payload.reason === "disconnected",
      ),
    ).toBe(true);
  });

  it("rolls back and reports a timeout if the commit gate is never confirmed", async () => {
    vi.useFakeTimers();
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    const runPromise = session.run();
    await vi.advanceTimersByTimeAsync(def.await_commit_timeout_ms);
    await runPromise;

    const sqlCalls = client.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls.at(-1)).toBe("ROLLBACK");
    expect(
      socket.emit.mock.calls.some(
        ([event, payload]) =>
          event === events.server_rolled_back && payload.reason === "timeout",
      ),
    ).toBe(true);
  });

  it("rolls back and emits an error when a delete does not affect the expected row", async () => {
    const client = makeClient({ sourceDeleteRowCount: { src_vector: 0 } });
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    await session.run();

    const sqlCalls = client.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls.at(-1)).toBe("ROLLBACK");
    expect(
      socket.emit.mock.calls.some(([event]) => event === events.server_error),
    ).toBe(true);
  });

  it("ignores a commit confirmation received before the commit gate is reached", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    const socket = makeSocket();
    const session = new ProjectDeleteSession(socket, idProject);

    // fire immediately, before the session reaches "awaiting_commit"
    session.confirmCommit();

    socket.emit.mockImplementation((event, payload) => {
      if (
        event === events.server_progress &&
        payload.step === "awaiting_commit"
      ) {
        session.confirmCommit();
      }
    });

    await session.run();

    expect(client.calls.at(-1)[0]).toBe("COMMIT");
  });
});

describe("ioProjectDeleteStart / Stop / Commit", () => {
  beforeEach(() => {
    connect.mockReset();
    assertProjectDeletable.mockReset();
    assertProjectDeletable.mockResolvedValue({ title: "Old Project" });
    getProjectDeleteImpact.mockReset();
    getProjectDeleteImpact.mockResolvedValue({
      sources: [],
      views: [],
      themes: [],
      sourcesDependent: [],
      viewsDependent: [],
    });
  });

  it("rejects starting a second session on the same socket before the first ends", async () => {
    const client = makeClient();
    // never resolves the commit gate in this test ; session stays open
    connect.mockResolvedValue(client);
    const socket = makeSocket();

    const first = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(first.success).toBe(true);

    const second = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(second.success).toBe(false);
    expect(second.error).toBe("project_delete_already_running");

    // clean up : stop the still-open first session so it doesn't leak
    // into other tests via the module-level session map
    ioProjectDeleteStop(socket, {}, () => {});
  });

  it("rejects a concurrent start while the first guard is pending", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    let resolveGuard;
    assertProjectDeletable.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGuard = resolve;
        }),
    );
    const socket = makeSocket();

    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve);
    });
    await vi.waitFor(() =>
      expect(assertProjectDeletable).toHaveBeenCalledOnce(),
    );

    const second = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(second).toEqual({
      success: false,
      error: "project_delete_already_running",
    });
    expect(assertProjectDeletable).toHaveBeenCalledOnce();

    resolveGuard({ title: "Old Project" });
    await vi.waitFor(() => expect(resolveFirst).toBeDefined());
    await vi.waitFor(() =>
      expect(firstPromise).resolves.toEqual({ success: true }),
    );
    ioProjectDeleteStop(socket, {}, () => {});
  });

  it("releases a failed start reservation and allows a retry", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    assertProjectDeletable
      .mockRejectedValueOnce(new Error("project_delete_not_legacy_forbidden"))
      .mockResolvedValueOnce({ title: "Old Project" });
    const socket = makeSocket();

    const failed = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(failed.error).toBe("project_delete_not_legacy_forbidden");

    const retried = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(retried.success).toBe(true);
    ioProjectDeleteStop(socket, {}, () => {});
  });

  it("cancels a start stopped while its guard is pending", async () => {
    const client = makeClient();
    connect.mockResolvedValue(client);
    let resolveGuard;
    assertProjectDeletable.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGuard = resolve;
        }),
    );
    const socket = makeSocket();
    const start = new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );

    await vi.waitFor(() =>
      expect(assertProjectDeletable).toHaveBeenCalledOnce(),
    );
    ioProjectDeleteStop(socket, {}, () => {});
    resolveGuard({ title: "Old Project" });

    await expect(start).resolves.toEqual({
      success: false,
      error: "project_delete_stopped",
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it("reports the guard rejection reason without opening a transaction", async () => {
    assertProjectDeletable.mockRejectedValueOnce(
      new Error("project_delete_not_legacy_forbidden"),
    );
    const socket = makeSocket();
    const result = await new Promise((resolve) =>
      ioProjectDeleteStart(socket, { id_project: idProject }, resolve),
    );
    expect(result).toEqual({
      success: false,
      error: "project_delete_not_legacy_forbidden",
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it("stop/commit on a socket with no active session are safe no-ops", () => {
    const socket = makeSocket();
    expect(() => ioProjectDeleteStop(socket, {}, () => {})).not.toThrow();
    expect(() => ioProjectDeleteCommit(socket, {}, () => {})).not.toThrow();
  });
});
