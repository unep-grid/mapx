import { settings } from "./../settings";
import { modalConfirm, modalPrompt } from "./../mx_helper_modal.js";
import { ws } from "./../mx.js";
import { el } from "./../el/src/index.js";
import { bindAll } from "../bind_class_methods";
import { requestProjectMembership, setProject } from "../map_helpers";
import { tt } from "../el_mapx";
import { getDictItem } from "./../language";
import { getQueryParameterInit } from "../url_utils/url_utils.js";
import { parseInitialProjectListFilters } from "./list_helpers.js";
import { RoleMatrix } from "./roles_matrix.js";
import { getMapxWindowManager } from "../window/index.js";

const options = {
  roles: ["root", "project_creator"],
};

export class ProjectManager {
  constructor() {
    const pm = this;
    pm.disable();
    bindAll(pm);
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

  async open(idProject) {
    await setProject(idProject);
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

  async delete() {}
  async remove() {}
  // Shiny.addCustomMessageHandler requires a handler whose Function.length is 1.
  // Keep this parameter required syntactically and normalize it inside.
  async list(request) {
    const pm = this;
    request = request || {};
    const windowManager = getMapxWindowManager();
    if (pm._projectListWindow) {
      windowManager.close(pm._projectListWindow, "replace");
    }
    const projectList =
      windowManager.root.ownerDocument.createElement("mx-project-list");
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
      onProjectLoaded: () => {
        if (pm._projectListWindow === projectListWindow) {
          projectListWindow?.close("project-loaded");
        }
      },
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
      const button = el(
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

    const closeButton = el(
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
