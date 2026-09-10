import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventSimple } from "../event_simple/index.js";
import { ProjectSwitch } from "./switch.js";

vi.mock("../mx.js", () => ({
  events: new EventSimple(),
  ws: { connect: vi.fn() },
  theme: { init: vi.fn() },
}));
vi.mock("../settings", () => ({ settings: { project: { id: "A" } } }));
vi.mock("../is_test/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  isProjectId: vi.fn(() => true),
}));
vi.mock("../mx_helper_misc.js", () => ({ isShinyReady: vi.fn(() => true) }));
vi.mock("../map_helpers", () => ({
  requestProjectSelection: vi.fn(),
  updateViewsList: vi.fn(),
}));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
  }
};

describe("project switch", () => {
  let coordinator, d, project, progress, changed;
  beforeEach(() => {
    vi.useFakeTimers();
    project = "A";
    progress = {
      begin: vi.fn(() => Symbol()),
      fail: vi.fn(),
      close: vi.fn(),
      update: vi.fn(),
      finishing: vi.fn(),
    };
    changed = vi.fn();
    d = {
      events: new EventSimple(),
      currentProject: () => project,
      validProject: (id) => ["A", "B", "C"].includes(id),
      available: () => true,
      confirm: vi.fn(async () => true),
      prepare: vi.fn(async () => {}),
      request: vi.fn(),
      connect: vi.fn(async () => {}),
      initTheme: vi.fn(async () => {}),
      feedback: progress,
      reloadViews: (id) => coordinator.updateViews(id, async () => [], true),
      reportError: vi.fn(),
    };
    d.events.on("project_changed", changed);
    coordinator = new ProjectSwitch(d);
  });
  afterEach(() => vi.useRealTimers());
  async function settings(id = "B") {
    const old = project;
    project = id;
    await d.events.fire("settings_project_change", {
      old_project: old,
      new_project: id,
    });
    await flush();
  }

  it("keeps waiting without treating ten seconds as failure and gates early views on authentication", async () => {
    const connection = deferred();
    d.connect.mockReturnValue(connection.promise);
    const onRequest = vi.fn();
    const result = coordinator.set("B", { onRequest });
    await flush();
    expect(onRequest).toHaveBeenCalledWith("B");
    const render = vi.fn(async () => ["new views"]);
    const update = coordinator.updateViews("B", render, true);
    await vi.advanceTimersByTimeAsync(11000);
    expect(progress.fail).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    await settings();
    expect(render).not.toHaveBeenCalled();
    connection.resolve();
    await expect(update).resolves.toEqual(["new views"]);
    await expect(result).resolves.toBe(true);
    expect(d.connect).toHaveBeenCalledOnce();
    expect(d.initTheme).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledWith(
      { old_project: "A", new_project: "B" },
      "project_changed",
    );
    expect(progress.close).toHaveBeenCalledOnce();
    expect(d.events._cbs).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not open the blocking overlay for a full refresh with no pending switch", async () => {
    await coordinator.updateViews("A", async () => [], true);
    expect(progress.begin).not.toHaveBeenCalled();
  });

  it("isBlocked() mirrors an active or failed switch", async () => {
    expect(coordinator.isBlocked()).toBe(false);
    coordinator.set("B");
    await flush();
    expect(coordinator.isBlocked()).toBe(true);
    await settings();
    await coordinator.updateViews("B", async () => [], true);
    expect(coordinator.isBlocked()).toBe(false);
  });

  it("does not miss settings and views emitted immediately by the request", async () => {
    d.request.mockImplementation(() => {
      void settings();
      void coordinator.updateViews("B", async () => [], true);
    });
    await expect(coordinator.set("B")).resolves.toBe(true);
  });

  it("shares duplicates and serializes the last choice without installing the intermediate project", async () => {
    const first = coordinator.set("B");
    expect(coordinator.set("B")).toBe(first);
    await flush();
    const last = coordinator.set("C");
    await expect(first).resolves.toBe(false);
    expect(d.request).toHaveBeenCalledTimes(1);
    const obsolete = vi.fn();
    await settings("B");
    await coordinator.updateViews("B", obsolete, true);
    expect(obsolete).not.toHaveBeenCalled();
    expect(d.request.mock.calls.map(([id]) => id)).toEqual(["B", "C"]);
    await settings("C");
    await coordinator.updateViews("C", async () => [], true);
    await expect(last).resolves.toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(
      { old_project: "A", new_project: "C" },
      "project_changed",
    );
  });

  it("replaces a queued destination, including returning to the original project", async () => {
    const first = coordinator.set("B");
    await flush();
    const replaced = coordinator.set("C");
    const last = coordinator.set("A");
    await expect(first).resolves.toBe(false);
    await expect(replaced).resolves.toBe(false);
    await settings("B");
    expect(d.request.mock.calls.map(([id]) => id)).toEqual(["B", "A"]);
    await settings("A");
    await coordinator.updateViews("A", async () => [], true);
    await expect(last).resolves.toBe(true);
  });

  it("can return to the in-flight destination without resending the same Shiny input", async () => {
    const first = coordinator.set("B");
    await flush();
    const replaced = coordinator.set("C");
    const last = coordinator.set("B");
    await settings("B");
    await expect(first).resolves.toBe(false);
    await expect(replaced).resolves.toBe(false);
    await expect(last).resolves.toBe(true);
    expect(d.request).toHaveBeenCalledTimes(1);
  });

  it("ignores metadata changes, other project views, and partial view additions", async () => {
    const result = coordinator.set("B");
    const settled = vi.fn();
    result.then(settled);
    await flush();
    await d.events.fire("settings_project_change", {
      old_project: "A",
      new_project: "A",
    });
    await d.events.fire("views_list_updated", { project: "B" });
    expect(d.connect).not.toHaveBeenCalled();
    const stale = vi.fn();
    await coordinator.updateViews("A", stale, true);
    expect(stale).not.toHaveBeenCalled();
    await settings();
    await coordinator.updateViews("B", async () => [], false);
    expect(settled).not.toHaveBeenCalled();
    await coordinator.updateViews("B", async () => [], true);
    await expect(result).resolves.toBe(true);
  });

  it("invalidates an in-flight old render and does not let it finish a switch", async () => {
    const fetching = deferred();
    const render = vi.fn();
    const oldUpdate = coordinator.updateViews(
      "A",
      async (isCurrent) => {
        await fetching.promise;
        if (isCurrent()) {
          render();
        }
      },
      true,
    );
    const result = coordinator.set("B");
    await flush();
    fetching.resolve();
    await oldUpdate;
    expect(render).not.toHaveBeenCalled();
    await settings();
    await coordinator.updateViews("B", async () => [], true);
    await expect(result).resolves.toBe(true);
  });

  it.each(["connection", "theme", "views", "fallback"])(
    "offers recovery after %s failure and releases queued views",
    async (failure) => {
      const error = new Error("failed");
      if (failure === "connection") {
        d.connect.mockRejectedValue(error);
      }
      if (failure === "theme") {
        d.initTheme.mockRejectedValue(error);
      }
      const result = coordinator.set("B");
      await flush();
      const render = vi.fn(async () => {
        if (failure === "views") {
          throw error;
        }
        return [];
      });
      const update = coordinator.updateViews("B", render, true);
      const caught = update.catch((e) => e);
      await settings(failure === "fallback" ? "C" : "B");
      await caught;
      await expect(result).resolves.toBe(false);
      expect(progress.fail).toHaveBeenCalledOnce();
      expect(progress.close).not.toHaveBeenCalled();
      expect(changed).not.toHaveBeenCalled();
      await expect(coordinator.updateViews("B", render, true)).resolves.toEqual(
        [],
      );
      expect(d.events._cbs).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("retries a known server project without another R selection", async () => {
    d.connect.mockRejectedValueOnce(new Error("offline"));
    const first = coordinator.set("B");
    await flush();
    await settings("B");
    await expect(first).resolves.toBe(false);
    const retry = progress.fail.mock.calls[0][1];
    await expect(retry()).resolves.toBe(true);
    expect(d.request).toHaveBeenCalledTimes(1);
    expect(coordinator.canInteract("B")).toBe(true);
  });

  it("does not send more selections after a missing R acknowledgement", async () => {
    const result = coordinator.set("B");
    await flush();
    await vi.advanceTimersByTimeAsync(60000);
    await expect(result).resolves.toBe(false);
    expect(progress.fail).toHaveBeenCalledWith(expect.any(Symbol), null);
    await expect(coordinator.set("C")).resolves.toBe(false);
    await settings("B");
    const render = vi.fn();
    await coordinator.updateViews("B", render, true);
    expect(render).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for an old commit to exit before preparing the next project", async () => {
    const gate = deferred();
    const oldCommit = coordinator.commit(
      () => gate.promise,
      () => true,
    );
    await flush();
    const result = coordinator.set("B");
    await flush();
    expect(d.prepare).not.toHaveBeenCalled();
    expect(coordinator.canInteract("A")).toBe(false);
    gate.resolve();
    await oldCommit;
    await flush();
    expect(d.prepare).toHaveBeenCalledOnce();
    await settings("B");
    await coordinator.updateViews("B", async () => [], true);
    await expect(result).resolves.toBe(true);
    expect(coordinator.canInteract("A")).toBe(false);
    expect(coordinator.canInteract("B")).toBe(true);
  });

  it("cancels without preparing or sending and supports another attempt", async () => {
    d.confirm.mockResolvedValueOnce(false);
    await expect(coordinator.set("B")).resolves.toBe(false);
    expect(d.prepare).not.toHaveBeenCalled();
    expect(d.request).not.toHaveBeenCalled();
    expect(coordinator.failure).toBeNull();
    await expect(coordinator.set("A")).resolves.toBe(false);
    await expect(coordinator.set("invalid")).resolves.toBe(false);
  });
});

it("continues current-project updates while confirmation is pending and then cancelled", async () => {
  const confirmation = deferred();
  const render = vi.fn(async () => ["A"]);
  const coordinator = new ProjectSwitch({
    events: new EventSimple(),
    currentProject: () => "A",
    validProject: () => true,
    available: () => true,
    confirm: () => confirmation.promise,
  });
  const result = coordinator.set("B");
  await expect(coordinator.updateViews("A", render, true)).resolves.toEqual([
    "A",
  ]);
  confirmation.resolve(false);
  await expect(result).resolves.toBe(false);
});

it("establishes the initial installed project without requiring a switch", async () => {
  let project = "A";
  const coordinator = new ProjectSwitch({ currentProject: () => project });
  project = "B";
  await coordinator.updateViews("B", async () => [], true);
  expect(coordinator.canInteract("B")).toBe(true);
});

it("aborts obsolete fetches and serializes only the installation boundary", async () => {
  let project = "A";
  const coordinator = new ProjectSwitch({ currentProject: () => project });
  const cancelled = vi.fn();
  const staleCommit = vi.fn();
  const first = coordinator.updateViews(
    "A",
    async (_isCurrent, commit, signal) => {
      await new Promise((resolve) =>
        signal.addEventListener("abort", () => {
          cancelled();
          resolve();
        }),
      );
      return commit(staleCommit);
    },
    true,
  );
  coordinator.invalidate();
  project = "B";
  const installed = vi.fn(async () => ["B"]);
  await expect(
    coordinator.updateViews(
      "B",
      (_isCurrent, commit) => commit(installed),
      true,
    ),
  ).resolves.toEqual(["B"]);
  await first;
  expect(cancelled).toHaveBeenCalledOnce();
  expect(staleCommit).not.toHaveBeenCalled();
  expect(installed).toHaveBeenCalledOnce();
});

it("does not lose the final choice when an obsolete handshake fails", async () => {
  const events = new EventSimple();
  const connection = deferred();
  let project = "A";
  const progress = {
    begin: vi.fn(() => Symbol()),
    close: vi.fn(),
    fail: vi.fn(),
  };
  const request = vi.fn();
  const coordinator = new ProjectSwitch({
    events,
    currentProject: () => project,
    validProject: () => true,
    available: () => true,
    confirm: async () => true,
    prepare: async () => {},
    request,
    connect: vi
      .fn()
      .mockReturnValueOnce(connection.promise)
      .mockResolvedValue(),
    initTheme: async () => {},
    feedback: progress,
    reportError: vi.fn(),
  });
  const first = coordinator.set("B");
  await flush();
  project = "B";
  await events.fire("settings_project_change", {
    old_project: "A",
    new_project: "B",
  });
  const last = coordinator.set("C");
  connection.reject(new Error("old connection failed"));
  await flush();
  expect(request.mock.calls.map(([id]) => id)).toEqual(["B", "C"]);
  expect(progress.begin).toHaveBeenCalledOnce();
  expect(progress.close).not.toHaveBeenCalled();
  project = "C";
  await events.fire("settings_project_change", {
    old_project: "B",
    new_project: "C",
  });
  await coordinator.updateViews("C", async () => [], true);
  await expect(first).resolves.toBe(false);
  await expect(last).resolves.toBe(true);
  expect(progress.fail).not.toHaveBeenCalled();
  expect(progress.close).toHaveBeenCalledOnce();
});

it("keeps windows when a queued choice is cancelled after the server already changed", async () => {
  const events = new EventSimple();
  let project = "A";
  const prepare = vi.fn(async () => {});
  const coordinator = new ProjectSwitch({
    events,
    currentProject: () => project,
    available: () => true,
    validProject: () => true,
    confirm: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    prepare,
    request: vi.fn(),
    connect: async () => {},
    initTheme: async () => {},
    feedback: { begin: () => Symbol(), close: vi.fn(), fail: vi.fn() },
    reportError: vi.fn(),
    reloadViews: (id) => coordinator.updateViews(id, async () => [], true),
  });
  const first = coordinator.set("B");
  await flush();
  const cancelled = coordinator.set("C");
  project = "B";
  await events.fire("settings_project_change", {
    old_project: "A",
    new_project: "B",
  });
  await flush();
  await expect(first).resolves.toBe(false);
  await expect(cancelled).resolves.toBe(false);
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(coordinator.canInteract("B")).toBe(true);
});

it("keeps the installed list valid when queued selections are cancelled before approval", async () => {
  const confirmation = deferred();
  const coordinator = new ProjectSwitch({
    currentProject: () => "A",
    available: () => true,
    validProject: () => true,
    confirm: () => confirmation.promise,
  });
  let isCurrent;
  await coordinator.updateViews(
    "A",
    async (guard) => {
      isCurrent = guard;
      return [];
    },
    true,
  );
  const first = coordinator.set("B");
  const last = coordinator.set("C");
  confirmation.resolve(false);
  await expect(first).resolves.toBe(false);
  await expect(last).resolves.toBe(false);
  expect(isCurrent()).toBe(true);
  expect(coordinator.canInteract("A")).toBe(true);
});
