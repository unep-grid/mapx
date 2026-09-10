import { ProjectSwitch } from "./switch.js";
import { ProjectLoadingFeedback } from "./loading_feedback.js";
import { isShinyReady } from "../mx_helper_misc.js";
import { isProjectId } from "../is_test/index.js";
import { setQueryParametersInitReset } from "../url_utils/index.js";
import { settings } from "./../settings";
import {
  modalConfirm,
  modalPrompt,
  modalGetAll,
  modalCloseAll,
} from "./../mx_helper_modal.js";
import { ws } from "./../mx.js";
import { el } from "./../el/src/index.js";
import { bindAll } from "../bind_class_methods";
import {
  requestProjectMembership,
  requestProjectSelection,
  viewsCloseAll,
  updateViewsList,
} from "../map_helpers";
import { tt } from "../el_mapx";
import { getDictItem } from "./../language";
import { getQueryParameterInit } from "../url_utils/url_utils.js";
import { parseInitialProjectListFilters } from "./list_helpers.js";
import { RoleMatrix } from "./roles_matrix.js";
import { TilesReport } from "./tiles_report.js";
import { getMapxWindowManager } from "../window/index.js";
import { openConfirmDialog, openNoticeDialog } from "../window/dialog.js";
import { ProjectDeleteChannel } from "./delete_channel.js";

const options = {
  roles: ["root", "project_creator"],
};

export class ProjectManager {
  /** @param {ConstructorParameters<typeof ProjectSwitch>[0]} [switchDependencies] */
  constructor(switchDependencies) {
    const pm = this;
    pm.disable();
    bindAll(pm);
    this.transition = switchDependencies
      ? new ProjectSwitch(switchDependencies)
      : null;
  }
  /**
   * Create new project
   * @param {Object} config
   * @param {string} config.name Name of the project (optional)
   * @return {boolean} project added
   */
  async create(config) {
    const pm = this;
    try {
      await pm.testAuth();
      /**
       * Modal
       */
      const name =
        config?.name ||
        (await modalPrompt({
          title: tt("project_manage_create_title"),
          label: tt("project_manage_create_label"),
          confirm: tt("project_manage_btn_create"),
          inputOptions: {
            type: "text",
            value: ``,
            placeholder: await getDictItem("project_manage_create_placeholder"),
          },
          onInput: pm.validateCreatePrompt,
        }));

      if (!name) {
        return false;
      }

      const result = await pm.validate(name);

      if (!result.valid) {
        return false;
      }

      const project = await ws.emitAsync(
        "/client/project/create",
        {
          name,
        },
        60 * 1e3,
      );

      if (project.error) {
        console.error(project.error);
        return false;
      }

      const open = await modalConfirm({
        title: tt("project_manage_load_title"),
        content: tt("project_manage_load_content", {
          data: { name: project?.title?.en },
        }),
        confirm: tt("btn_confirm"),
        cancel: tt("btn_cancel"),
      });

      if (open) {
        await pm.open(project.id);
      }
      return true;
    } catch (e) {
      console.warn(e.message || e);
      return false;
    }
  }

  async validateCreatePrompt(name, btnCreate, elMessage) {
    const pm = this;
    const result = await pm.validate(name);

    const elFrag = document.createDocumentFragment();
    if (!result.valid) {
      for (const issue of result.issues) {
        const elIssue = el("span", tt(issue));
        elFrag.appendChild(elIssue);
      }
      btnCreate.setAttribute("disabled", "disabled");
      btnCreate.classList.add("disabled");
      pm.disable();
    } else {
      elFrag.appendChild(el("span", tt("project_manage_name_ok")));
      btnCreate.removeAttribute("disabled");
      btnCreate.classList.remove("disabled");
      pm.enable();
    }
    elMessage.innerHTML = "";
    elMessage.appendChild(elFrag);
    return result.valid;
  }

  disable() {
    this._disabled = true;
  }
  get disabled() {
    return !!this._disabled;
  }
  enable() {
    this._disabled = true;
  }
  get enabled() {
    return !!this._enabled;
  }

  async validate(name) {
    const valid = await ws.emitAsync(
      "/client/project/validate/name",
      { name },
      100,
    );
    return valid;
  }

  /** Configure the legacy adapters once, at the application composition root.
   * @param {{events: import('../event_simple/index.js').EventSimple, ws: import('../ws_handler/ws_handler.js').WsHandler, theme: Object, root: HTMLElement}} context
   */
  configureTransition({ events, ws: socket, theme, root }) {
    if (this.transition) {
      throw new Error("Project transition already configured");
    }
    this.loadingFeedback = new ProjectLoadingFeedback(root);
    this.transitionRoot = root;
    this.onLegacyProjectAction = this.guardLegacyProjectAction.bind(this);
    root.addEventListener("click", this.onLegacyProjectAction, true);
    this.transition = new ProjectSwitch({
      events,
      currentProject: () => settings.project.id,
      validProject: isProjectId,
      available: isShinyReady,
      confirm: async (options) => {
        const manager = getMapxWindowManager(root);
        const hasWindows = [...manager.windows.keys()].some(
          (key) => key !== "project-list",
        );
        const hasModals =
          modalGetAll({ ignoreSelectors: ["#uiSelectProject"] }).length > 0;
        if (
          !options.askConfirm &&
          !(options.askConfirmIfModal !== false && (hasWindows || hasModals))
        ) {
          return true;
        }
        return openConfirmDialog({
          manager,
          title: tt("modal_check_confirm_project_change_title"),
          content: tt("modal_check_confirm_project_change_txt"),
          confirmLabel: tt("btn_confirm"),
          cancelLabel: tt("btn_cancel"),
        });
      },
      prepare: async () => {
        modalCloseAll();
        getMapxWindowManager(root).closeAll();
        setQueryParametersInitReset();
        await viewsCloseAll();
      },
      request: requestProjectSelection,
      connect: () => socket.connect({ waitForConnection: true }),
      initTheme: () => theme.init(),
      reloadViews: (id) =>
        updateViewsList({ project: id, useQueryFilters: false }),
      feedback: this.loadingFeedback,
      setSwitchActive: (active) =>
        root.classList.toggle("mx-project-switch-active", active),
      reportError: (error) => console.error("Project change failed", error),
    });
  }

  /** Boundary for buttons still bound directly by Shiny. @param {MouseEvent} event */
  guardLegacyProjectAction(event) {
    if (!this.transition?.isBlocked()) {
      return;
    }
    if (
      !event.target.closest?.(
        ".mx-tools-group.shiny-html-output .action-button",
      )
    ) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.transition.pending?.started) {
      this.loadingFeedback.reveal(this.loadingFeedback.active);
    }
  }

  destroy() {
    this.transitionRoot?.removeEventListener(
      "click",
      this.onLegacyProjectAction,
      true,
    );
    this.loadingFeedback?.destroy();
  }

  /** @param {string} idProject @param {import('./switch.js').SwitchOptions} [options] */
  set(idProject, options) {
    return this.transition.set(idProject, options);
  }

  /** @param {string} idProject @returns {Promise<boolean>} */
  open(idProject) {
    return this.set(idProject);
  }

  /**
   * Show role matrix modal for current project
   * Only available to admin users
   * -requires one argument for shiny binding
   */
  async showRoleMatrix(_) {
    const pm = this;

    try {
      // Check if user is admin
      const isAdmin = settings.user.roles?.admin;
      if (!isAdmin) {
        throw new Error("project_roles_access_denied");
      }

      // Create and show role matrix
      const roleMatrix = new RoleMatrix(pm);
      await roleMatrix.show();
    } catch (e) {
      console.error("Role matrix error:", e);
      // Could show error modal here if needed
    }
  }

  /**
   * Show tile links report modal for current project
   * Only available to admin users
   * -requires one argument for shiny binding
   */
  async showTilesReport(_) {
    const pm = this;

    try {
      const isAdmin = settings.user.roles?.admin;
      if (!isAdmin) {
        throw new Error("project_tiles_check_access_denied");
      }

      if (pm._tilesReport?.window?.isConnected) {
        await pm._tilesReport.show();
        return;
      }
      pm._tilesReport = new TilesReport(pm);
      await pm._tilesReport.show();
    } catch (e) {
      console.error("Tiles report error:", e);
    }
  }

  /**
   * Delete a project : type-the-name confirmation, then an analyze
   * summary of what will be removed, then a live-progress delete
   * session ending in a final "commit ?" gate before anything is
   * durably committed.
   * @param {String} idProject Project to delete ( never the user's
   *   own currently active project ; the server enforces this too )
   * @param {String} [projectTitle] Display title, from the list row
   * @return {Promise<boolean>} true if the project was deleted
   */
  async delete(idProject, projectTitle) {
    const pm = this;
    try {
      await pm.testAuth();
      if (!idProject) {
        return false;
      }
      const title = projectTitle || idProject;
      const modalTitle = `${await getDictItem(
        "project_delete_title",
      )} "${title}"`;
      const windowManager = getMapxWindowManager();
      const key = "project-delete";

      const typedName = await pm.promptDeleteConfirmName({
        windowManager,
        key,
        modalTitle,
        title,
      });
      if (!typedName) {
        return false;
      }

      const analysis = await ProjectDeleteChannel.analyze(
        idProject,
        settings.language,
      );
      if (analysis?.error) {
        await pm.showDeleteNotice({
          windowManager,
          key,
          title: modalTitle,
          message: analysis.error,
        });
        return false;
      }

      const proceed = await pm.showDeleteAnalysis({
        windowManager,
        key,
        modalTitle,
        analysis,
      });
      if (!proceed) {
        return false;
      }

      return await pm.runDeleteSession({
        idProject,
        title,
        modalTitle,
        windowManager,
        key,
      });
    } catch (e) {
      console.warn(e.message || e);
      return false;
    }
  }

  /**
   * Type-the-project-name destructive-action confirmation, in an
   * <mx-window> rather than the legacy modal system.
   */
  async promptDeleteConfirmName({ windowManager, key, modalTitle, title }) {
    const createElement = windowManager.el;
    const input = createElement("input", {
      class: "form-control",
      type: "text",
      autocomplete: "off",
    });
    const content = createElement(
      "div",
      { class: "mx-project-delete-confirm" },
      createElement("label", tt("project_delete_confirm_title"), input),
    );

    const typedName = await openConfirmDialog({
      manager: windowManager,
      key,
      title: modalTitle,
      content,
      confirmLabel: tt("btn_confirm"),
      cancelLabel: tt("btn_cancel"),
      getValue: () => input.value,
      onReady: ({ confirmButton }) => {
        const update = () => {
          const valid =
            input.value.trim().toLowerCase() === title.trim().toLowerCase();
          confirmButton.disabled = !valid;
        };
        input.addEventListener("input", update);
        update();
        input.focus();
      },
    });
    return typedName || null;
  }

  /**
   * Single-action notice window ( success / cancelled / error ),
   * replacing the legacy modalDialog for this flow.
   */
  showDeleteNotice({ windowManager, key, title, message }) {
    const content = windowManager.el(
      "div",
      { class: "mx-project-delete-notice" },
      message,
    );
    return openNoticeDialog({
      manager: windowManager,
      key,
      title,
      content,
      closeLabel: tt("btn_close"),
      windowConfig: {
        geometry: {
          width: "min(520px, calc(100vw - 32px))",
          height: "auto",
          minHeight: 0,
        },
      },
    });
  }

  /**
   * Summary of views/sources/themes about to be removed, including
   * cross-project dependents of this project's global sources.
   */
  async showDeleteAnalysis({ windowManager, key, modalTitle, analysis }) {
    const createElement = windowManager.el;
    const rows = [
      [analysis.views?.length || 0, "project_delete_table_views"],
      [analysis.sources?.length || 0, "project_delete_table_sources"],
      [analysis.themes?.length || 0, "project_delete_table_themes"],
      [analysis.viewsDependent?.length || 0, "project_delete_table_views_dep"],
      [
        analysis.sourcesDependent?.length || 0,
        "project_delete_table_sources_dep",
      ],
    ];
    const labels = await Promise.all(rows.map(([, key]) => getDictItem(key)));
    const summaryList = createElement(
      "ul",
      { class: "mx-project-delete-summary" },
      ...rows.map(([count], index) =>
        createElement("li", `${labels[index]}: ${count}`),
      ),
    );

    return openConfirmDialog({
      manager: windowManager,
      key,
      title: modalTitle,
      content: summaryList,
      confirmLabel: tt("btn_confirm"),
      cancelLabel: tt("btn_cancel"),
    });
  }

  /**
   * Live-progress delete session : start, stream progress, handle the
   * final commit gate, and report the terminal outcome.
   */
  runDeleteSession({ idProject, title, modalTitle, windowManager, key }) {
    const pm = this;
    const createElement = windowManager.el;

    return new Promise((resolve) => {
      let settled = false;
      let channel = null;

      const finish = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };

      const closeWithNotice = async (contentKey, message) => {
        const text = message || (await getDictItem(contentKey));
        await pm.showDeleteNotice({
          windowManager,
          key,
          title: modalTitle,
          message: text,
        });
      };

      const progressLabel = createElement("div", {
        class: "mx-project-delete-progress-label",
      });
      const stopButton = createElement(
        "button",
        {
          class: ["btn", "btn-default"],
          type: "button",
          on: { click: () => channel?.stop() },
        },
        tt("btn_stop"),
      );

      windowManager.open({
        key,
        modal: true,
        closeable: false,
        collapsible: false,
        resizable: false,
        snappable: false,
        title: modalTitle,
        content: progressLabel,
        footerEnd: [stopButton],
        geometry: {
          width: "min(520px, calc(100vw - 32px))",
          height: "auto",
          minHeight: 0,
        },
      });

      channel = new ProjectDeleteChannel({
        onProgress: async (message) => {
          if (message.step === "source") {
            progressLabel.textContent = `${message.index}/${message.total}`;
            return;
          }
          if (message.step === "awaiting_commit") {
            const question = await getDictItem(
              "project_delete_commit_question",
            );
            const text = question
              .replace("{{title}}", message.project_title || title)
              .replace("{{count}}", String(message.removed?.total ?? ""));
            const confirmed = await openConfirmDialog({
              manager: windowManager,
              key,
              title: modalTitle,
              content: text,
              confirmLabel: tt("btn_commit"),
              cancelLabel: tt("btn_stop"),
            });
            if (confirmed) {
              await channel.commit();
            } else {
              await channel.stop();
            }
            return;
          }
          progressLabel.textContent = await getDictItem(
            "project_delete_analyze",
          );
        },
        onDone: async () => {
          await closeWithNotice("project_deleted");
          finish(true);
        },
        onRolledBack: async () => {
          await closeWithNotice("project_delete_rolled_back");
          finish(false);
        },
        onError: async (message) => {
          await closeWithNotice("project_delete_error", message?.message);
          finish(false);
        },
      });

      channel.start(idProject).catch(async (error) => {
        console.error(error);
        await closeWithNotice("project_delete_error", error.message);
        finish(false);
      });
    });
  }
  // Shiny.addCustomMessageHandler requires a handler whose Function.length is 1.
  // Keep this parameter required syntactically and normalize it inside.
  async list(request) {
    const pm = this;
    request = request || {};
    const windowManager = getMapxWindowManager();
    const createElement = windowManager.el;
    if (pm._projectListWindow) {
      windowManager.close(pm._projectListWindow, "replace");
    }
    const projectList = createElement("mx-project-list");
    let projectListWindow = null;
    const initialFilters = pm._projectListQueryConsumed
      ? {}
      : parseInitialProjectListFilters({
          role: getQueryParameterInit("showProjectsListByRole")[0],
          title: getQueryParameterInit("showProjectsListByTitle")[0],
        });
    pm._projectListQueryConsumed = true;

    projectList.configure({
      request,
      language: settings.language,
      initialFilters,
      onProjectRequested: () => {
        if (pm._projectListWindow === projectListWindow) {
          projectListWindow?.close("project-requested");
        }
      },
      onDeleteRequested: (idProject, projectTitle) =>
        pm.delete(idProject, projectTitle),
    });

    const buttons = [];
    const roles = settings.user.roles || {};
    const isMember = roles.admin || roles.publisher || roles.member;
    if (
      settings.project.allow_join &&
      settings.user.guest !== true &&
      !isMember
    ) {
      const label = await getDictItem(
        "btn_join_current_project",
        settings.language,
      );
      const currentTitle =
        settings.project.title?.[settings.language] ||
        settings.project.title?.en ||
        settings.project.id;
      const button = createElement(
        "button",
        {
          class: ["btn", "btn-default"],
          on: {
            click: () => requestProjectMembership(settings.project.id),
          },
        },
        label.replace("%s", currentTitle),
      );
      buttons.push(button);
    }

    const closeButton = createElement(
      "button",
      {
        class: ["btn", "btn-default"],
        type: "button",
        on: { click: () => projectListWindow?.close("footer") },
      },
      await getDictItem("btn_close", settings.language),
    );
    buttons.unshift(closeButton);

    projectListWindow = windowManager.open({
      key: "project-list",
      replace: true,
      modal: true,
      title: await getDictItem("project_list", settings.language),
      content: projectList,
      footerStart: buttons,
      draggable: true,
      resizable: true,
      collapsible: true,
      snappable: true,
      closeable: true,
      geometry: {
        width: "min(760px, calc(100vw - 32px))",
        height: "min(88vh, 900px)",
        maxHeight: "calc(100vh - 32px)",
      },
      onClose: () => {
        if (pm._projectListWindow === projectListWindow) {
          pm._projectListWindow = null;
        }
      },
    });
    pm._projectListWindow = projectListWindow;
    return projectListWindow;
  }

  testAuth() {
    return new Promise((resolve, reject) => {
      const isAuthorized = options.roles.find((r) => settings.user.roles[r]);
      if (!isAuthorized) {
        return reject("project_manage_not_allowed");
      }
      return resolve(true);
    });
  }
}
