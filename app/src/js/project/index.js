import { settings } from "./../settings";
import { modalConfirm, modalPrompt } from "./../mx_helper_modal.js";
import { ws } from "./../mx.js";
import { el } from "./../el/src/index.js";
import { bindAll } from "../bind_class_methods";
import { setProject } from "../map_helpers";
import { tt } from "../el_mapx";
import { getDictItem } from "./../language";

const options = {
  min_role: "root",
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
          title: tt("proj_manage_create_title"),
          label: tt("proj_manage_create_label"),
          confirm: tt("proj_manage_btn_create"),
          inputOptions: {
            type: "text",
            value: ``,
            placeholder: await getDictItem("proj_manage_create_placeholder"),
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
        60 * 1e3
      );

      if (project.error) {
        console.error(project.error);
        return false;
      }

      const open = await modalConfirm({
        title: tt("proj_manage_load_title"),
        content: tt("proj_manage_load_content", {
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
      elFrag.appendChild(el("span", tt("proj_manage_name_ok")));
      btnCreate.removeAttribute("disabled");
      btnCreate.classList.remove("disabled");
      pm.enable();
    }
    elMessage.innerHTML="";
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
      100
    );
    return valid;
  }

  async open(idProject) {
    await setProject(idProject);
  }

  async delete() {}
  async remove() {}
  async list() {}

  testAuth() {
    return new Promise((resolve, reject) => {
      const isAuthorized = settings.user.roles[options.min_role];
      if (!isAuthorized) {
        return reject("proj_manage_not_allowed");
      }
      return resolve(true);
    });
  }
}
