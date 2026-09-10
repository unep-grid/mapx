/**
 * @typedef {Object} SwitchOptions
 * @property {boolean} [askConfirm]
 * @property {boolean} [askConfirmIfModal]
 * @property {(projectId: string) => void} [onRequest]
 */

/**
 * @typedef {Object} PendingSwitch
 * @property {string} id
 * @property {SwitchOptions} options
 * @property {boolean} requested
 * @property {boolean} acknowledged
 * @property {boolean} [started]
 * @property {boolean} [synchronizing]
 * @property {Promise<boolean>} result
 * @property {(success: boolean) => void} resolve
 * @property {Promise<boolean>} ready
 * @property {(ready: boolean) => void} releaseViews
 * @property {ReturnType<typeof setTimeout>} [timer]
 * @property {(data: {old_project: string, new_project: string}) => void} [settingsListener]
 * @property {symbol} [progress]
 */

/**
 * Coordinates the legacy server acknowledgement and the authenticated view list.
 * Only one selection is sent to R at a time. Rendering has a separate serial
 * boundary so an obsolete fetch cannot clear a newer list.
 */
export class ProjectSwitch {
  /**
 * @param {Object} dependencies
   * @param {import('../event_simple/index.js').EventSimple} dependencies.events
   * @param {() => string} dependencies.currentProject
   * @param {(id: string) => boolean} dependencies.validProject
   * @param {() => boolean} dependencies.available
   * @param {(options: SwitchOptions) => Promise<boolean>} dependencies.confirm
   * @param {() => Promise<void>} dependencies.prepare
   * @param {(id: string) => void} dependencies.request
   * @param {() => Promise<void>} dependencies.connect
   * @param {() => Promise<void>} dependencies.initTheme
   * @param {(id: string) => Promise<unknown>} dependencies.reloadViews
   * @param {import("./loading_feedback.js").ProjectLoadingFeedback} [dependencies.feedback]
   * @param {(active: boolean) => void} [dependencies.setSwitchActive]
   * @param {(error: unknown) => void} dependencies.reportError
   * @param {number} [dependencies.timeout] Failure deadline, never a presentation delay
   */
  constructor(dependencies) {
    this.dependencies = dependencies;
    /** @type {PendingSwitch | null} */
    this.pending = null;
    /** @type {PendingSwitch | null} */
    this.queued = null;
    this.failure = null;
    this.generation = 0;
    this.updates = new Set();
    this.commits = Promise.resolve();
    this.displayedProject = dependencies.currentProject();
  }

  /** @param {string} id @param {SwitchOptions} [options] @returns {Promise<boolean>} */
  set(id, options = {}) {
    const d = this.dependencies;
    if (
      !d.available() ||
      typeof id !== "string" ||
      !d.validProject(id) ||
      this.failure?.unknown
    ) {
      return Promise.resolve(false);
    }
    if (this.queued?.id === id) {
      return this.queued.result;
    }
    if (this.pending?.id === id && !this.queued) {
      return this.pending.result;
    }
    if (!this.pending && !this.failure && id === d.currentProject()) {
      return Promise.resolve(false);
    }
    const next = this.create(id, options);
    if (this.pending) {
      this.queued?.resolve(false);
      this.queued = next;
      this.pending.resolve(false);
      if (this.pending.started) {
        this.invalidate();
      }
      // Even returning to the in-flight destination creates a new generation.
      // R must acknowledge the outstanding request before it can be reused.
      if (this.pending.acknowledged && !this.pending.synchronizing) {
        this.finish(this.pending, false);
      }
    } else {
      this.launch(next);
    }
    return next.result;
  }

  /** Cancel only work owned by obsolete project updates. */
  invalidate() {
    this.generation++;
    for (const controller of this.updates) {
      controller.abort();
    }
  }

  /** @param {string} id @param {SwitchOptions} options @returns {PendingSwitch} */
  create(id, options) {
    let resolve, releaseViews;
    const result = new Promise((done) => {
      resolve = done;
    });
    const ready = new Promise((done) => {
      releaseViews = done;
    });
    const pending = {
      id,
      options: { ...options },
      requested: false,
      acknowledged: false,
      result,
      ready,
      resolve,
      releaseViews,
    };
    return pending;
  }

  /** @param {PendingSwitch} pending */
  launch(pending) {
    this.pending = pending;
    if (this.failure) {
      this.dependencies.feedback?.close(this.failure.progress);
    }
    this.failure = null;
    void this.start(pending);
  }

  /** @param {PendingSwitch} pending */
  async start(pending) {
    const d = this.dependencies;
    try {
      const confirmed = await d.confirm(pending.options);
      if (!confirmed) {
        // Cancellation also cancels choices made while the dialog was open.
        this.queued?.resolve(false);
        this.queued = null;
        if (d.currentProject() === this.displayedProject) {
          this.finish(pending, false);
          return;
        }
        // An earlier, approved selection already reached R. Restore that
        // project's list without closing windows the user just chose to keep.
        pending.resolve(false);
        pending.id = d.currentProject();
      }
      pending.started = true;
      this.invalidate();
      pending.progress ||= d.feedback?.begin();
      d.setSwitchActive?.(true);
      await this.commits;
      if (confirmed) {
        await d.prepare();
      }
      if (this.pending !== pending) {
        return;
      }
      pending.timer = setTimeout(() => {
        this.fail(pending, new Error("Project transition timed out"));
      }, d.timeout ?? 60000);
      pending.settingsListener = (data) => {
        if (
          !pending.requested ||
          pending.acknowledged ||
          data?.new_project === data?.old_project
        ) {
          return;
        }
        pending.acknowledged = true;
        if (data?.new_project !== pending.id) {
          this.fail(
            pending,
            new Error("Project selection returned a different project"),
          );
        } else if (this.queued) {
          this.finish(pending, false);
        } else {
          void this.synchronize(pending);
        }
      };
      d.events.on("settings_project_change", pending.settingsListener);
      if (pending.id === d.currentProject()) {
        pending.acknowledged = true;
        void this.synchronize(pending, true);
      } else {
        pending.requested = true;
        d.request(pending.id);
        pending.options.onRequest?.(pending.id);
      }
    } catch (error) {
      this.fail(pending, error);
    }
  }

  /** @param {PendingSwitch} pending @param {boolean} reload */
  async synchronize(pending, reload = false) {
    pending.synchronizing = true;
    try {
      // Coalesce with an abandoned switch's still-in-flight reconnect instead
      // of starting a second one back-to-back.
      this.connecting ||= this.dependencies.connect().finally(() => {
        this.connecting = null;
      });
      await this.connecting;
      if (this.pending !== pending) {
        return;
      }
      if (this.queued) {
        this.finish(pending, false);
        return;
      }
      await this.dependencies.initTheme();
      if (this.pending !== pending) {
        return;
      }
      if (this.queued) {
        this.finish(pending, false);
        return;
      }
      pending.synchronizing = false;
      pending.releaseViews(true);
      if (reload) {
        await this.dependencies.reloadViews(pending.id);
      }
    } catch (error) {
      if (this.pending === pending && this.queued) {
        this.finish(pending, false);
      } else {
        this.fail(pending, error);
      }
    }
  }

  /** Serialize shared list mutations, without serializing network requests.
   * @param {() => Promise<unknown>} work
   * @param {() => boolean} isCurrent
   */
  commit(work, isCurrent) {
    const result = this.commits.then(() => (isCurrent() ? work() : []));
    this.commits = result.catch(() => {});
    return result;
  }

  /**
   * @param {string} project
   * @param {(isCurrent: () => boolean, commit: (work: () => Promise<unknown>) => Promise<unknown>, signal: AbortSignal, loading?: {update: (data: Object) => void, finishing: () => void}) => Promise<unknown>} render
   * @param {boolean} full
   */
  async updateViews(project, render, full) {
    const generation = this.generation;
    const pending = this.pending?.started ? this.pending : null;
    if (this.failure || (pending && (project !== pending.id || this.queued))) {
      return [];
    }
    if (pending && !(await pending.ready)) {
      return [];
    }
    const isCurrent = () =>
      !this.failure &&
      generation === this.generation &&
      project === this.dependencies.currentProject();
    if (!isCurrent()) {
      return [];
    }
    const feedback = this.dependencies.feedback;
    // Only a started switch owns the blocking overlay; a bare full refresh
    // (e.g. an R settings change with no explicit view list) must not pop it.
    const progress = pending ? pending.progress : null;
    const controller = new AbortController();
    this.updates.add(controller);
    try {
      const result = await render(
        isCurrent,
        (work) => this.commit(work, isCurrent),
        controller.signal,
        pending
          ? {
              update: (data) => {
                if (isCurrent()) {
                  feedback?.update(progress, data);
                }
              },
              finishing: () => {
                if (isCurrent()) {
                  feedback?.finishing(progress);
                }
              },
            }
          : undefined,
      );
      if (pending && full && isCurrent() && this.pending === pending) {
        this.finish(pending, true);
      }
      if (!pending && full && isCurrent()) {
        this.displayedProject = project;
      }
      return isCurrent() ? result : [];
    } catch (error) {
      if (pending && isCurrent()) {
        this.fail(pending, error);
      }
      if (generation !== this.generation) {
        return [];
      }
      throw error;
    } finally {
      this.updates.delete(controller);
    }
  }

  /** Whether a switch is in progress or failed, blocking interaction generally. */
  isBlocked() {
    return !!this.pending?.started || !!this.failure;
  }

  /** Whether an action belongs to the installed, current project context.
   * @param {string} id
   */
  canInteract(id) {
    return (
      !this.failure &&
      !this.pending?.started &&
      id === this.displayedProject &&
      id === this.dependencies.currentProject()
    );
  }

  /** @param {PendingSwitch} pending @param {unknown} error */
  fail(pending, error) {
    if (this.pending !== pending) {
      return;
    }
    this.dependencies.reportError(error);
    this.invalidate();
    this.queued?.resolve(false);
    this.queued = null;
    const unknown = pending.requested && !pending.acknowledged;
    if (pending.started) {
      this.failure = { unknown, progress: pending.progress };
      this.dependencies.feedback?.fail(
        pending.progress,
        unknown ? null : () => this.set(this.dependencies.currentProject()),
      );
    }
    this.finish(pending, false);
  }

  /** @param {PendingSwitch} pending @param {boolean} success */
  finish(pending, success) {
    if (this.pending !== pending) {
      return;
    }
    clearTimeout(pending.timer);
    if (pending.settingsListener) {
      this.dependencies.events.off(
        "settings_project_change",
        pending.settingsListener,
      );
    }
    pending.releaseViews(false);
    if (this.queued) {
      this.queued.progress = pending.progress;
    } else if (!this.failure) {
      this.dependencies.feedback?.close(pending.progress);
      this.dependencies.setSwitchActive?.(false);
    }
    this.pending = null;
    if (success) {
      const old = this.displayedProject;
      this.displayedProject = pending.id;
      void this.dependencies.events.fire("project_changed", {
        new_project: pending.id,
        old_project: old,
      });
    }
    pending.resolve(success);
    if (this.queued) {
      const next = this.queued;
      this.queued = null;
      this.launch(next);
    }
  }
}
