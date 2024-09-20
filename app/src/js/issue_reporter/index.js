import { elButtonFa } from "../el_mapx";
import { events, nc, settings, ws } from "../mx";
import { default as schema } from "./schema.json";
import { makeId } from "../mx_helper_misc";
import { jedInit } from "../json_editor";
import { el } from "../el_mapx";
import { modalConfirm, modalSimple } from "../mx_helper_modal";
import { isEmpty } from "../is_test";
import { getMapPos, getViewsActive, viewLink } from "../map_helpers";
import { isNotEmpty } from "../is_test";

export class IssueReporterClient {
  constructor() {
    this.validate = this.validate.bind(this);

    if (settings.mode.static) {
      const p = "project_issue";
      const id = schema.properties.type.enum.indexOf(p);
      if (isNotEmpty(id)) {
        schema.properties.type.enum.splice(id, 1);
        schema.properties.type.options.enum_titles.splice(id, 1);
      }
    }
    this._schema = schema;

    this._errors = [];
  }

  async init() {
    this.build();
    await this.loadEditor();
  }

  async reset() {
    this._jed.destroy();
    await this.loadEditor();
  }

  build() {
    const rc = this;
    rc._el_btn_submit = elButtonFa("btn_submit", {
      icon: "envelop",
      action: async () => {
        await rc.submit();
      },
    });
    rc._elValidationOutput = el("ul", {
      class: ["list-group", "mx-error-list-container"],
    });
    rc._elErrorContainer = el(
      "div",
      { class: "mx-error-container" },
      rc._elValidationOutput,
    );
    rc._el_editor = el("div", { class: "jed-container" });

    const elContent = el("div", [rc._elErrorContainer, rc._el_editor]);
    const buttons = [this._el_btn_submit];

    rc._modal = modalSimple({
      addBackground: false,
      title: "Report content",
      content: elContent,
      buttons: buttons,
      removeCloseButton: false,
      onClose: () => {
        rc.destroy("modal close");
      },
    });


    events.on(["view_added", "view_removed"], this.validate);
  }
  async submit() {
    const rc = this;
    try {
      if (!this.valid) {
        return false;
      }
      this.disable();

      const data = this.data;
      const idViews = getViewsActive();
      const mapPos = getMapPos();
      const mapPosStr = JSON.stringify(mapPos, null, 2);
      const idViewsStr = JSON.stringify(idViews, null, 2);

      // Create preview content
      const elPreview = el("div", [
        el("h3", "Report Type"),
        el("div", { class: "well" }, this._get_enum_title(data.type)),
        el("h3", "Priority"),
        el(
          "div",
          { class: "well" },
          data.priority.charAt(0).toUpperCase() + data.priority.slice(1),
        ),
        el("h3", "Subject"),
        el("div", { class: "well" }, data.subject),
        el("h3", "Description"),
        el("div", { class: "well" }, data.description),
        data.contactEmail
          ? el("div", [
              el("h3", "Contact Email"),
              el("div", { class: "well" }, data.contactEmail),
            ])
          : null,
        data.includeMapConfig
          ? el("div", el("h3", "Map configuration"), el("pre", mapPosStr))
          : null,
        data.includeActivatedViews
          ? el("div", el("h3", "Activated views"), el("pre", idViewsStr))
          : null,
      ]);

      // Show preview and ask for confirmation
      const ok = await modalConfirm({
        title: "Preview and Confirm Submission",
        content: elPreview,
      });

      if (!ok) {
        this.enable();
        return;
      }

      /**
       * Add context
       */
      data._context = {
        map_config: data.includeMapConfig ? mapPos : null,
        id_views: data.includeActivatedViews ? idViews : null,
      };

      // Submit the report
      const res = await ws.emitAsync("/client/issue/report", data);

      if (!res.ok) {
        if (res.type === "error") {
          this.notifyError(res.message);
        } else {
          throw new Error("Unexpected error", res);
        }
      } else {
        rc.notifySuccess("Message submitted successfully");
        console.warn("remove this in prod")
        //await this.reset();
      }
    } catch (e) {
      const errorMessage =
        e && e.message ? e.message : "An unexpected error occurred.";
      this.notifyError(errorMessage);
    } finally {
      if (this.valid) {
        this.enable();
      }
    }
  }

  notify(message, level = "success") {
    nc.open();
    nc.notify(
      {
        idGroup: "report_content",
        title: "Report Content",
        type: "info",
        level: level,
        message: message,
      },
      { open: true },
    );
  }

  notifyError(message) {
    this.notify(message, "error");
  }

  notifySuccess(message) {
    this.notify(message, "success");
  }

  disable() {
    this.enable(false);
  }

  enable(enable = true) {
    if (enable) {
      this.allow();
      this._jed.enable();
    } else {
      this.block();
      this._jed.disable();
    }
  }

  viewsLink(ids) {
    return ids.map((id) => {
      return {
        id: id,
        link: viewLink(id, { asString: true, useStatic: false }),
      };
    });
  }

  allow() {
    this._el_btn_submit.removeAttribute("disabled");
    this._el_btn_submit.classList.remove("disabled");
  }

  block() {
    this._el_btn_submit.setAttribute("disabled", true);
    this._el_btn_submit.classList.add("disabled");
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    events.off(["view_added", "view_removed"], this.validate);
    this._destroyed = true;
    this._modal.close();
  }

  async loadEditor() {
    const rc = this;

    const values = {
      contactEmail: settings.user.email || " ",
    };

    rc._jed = await jedInit({
      schema: this.schema,
      id: makeId(),
      target: rc._el_editor,
      startVal: values,
      options: {
        disable_properties: true,
        disable_collapse: true,
        disable_edit_json: true,
        required_by_default: true,
        use_default_values: true,
        show_errors: "always",
        no_additional_properties: true,
        prompt_before_delete: false,
        //schema: schema,
        show_errors: "interaction",
      },
    });
    /**
     * Workaround
     * - using startVal, email produce an error 'missing value'
     * - setting values after init, seems to work
     */
    rc._jed.on("ready", () => {
      //rc._jed.setValue(values);
      _fix_checkbox(rc._jed);
    });

    rc._jed.on("change", () => {
      rc.validate();
    });
  }

  get schema() {
    return this._schema;
  }
  get valid() {
    return isEmpty(this.issues);
  }

  get issues() {
    const jed_issues = this._jed.validation_results;
    const rc_issues = this.errors;
    const issues = [...jed_issues, ...rc_issues];
    return issues;
  }

  get data() {
    return this._jed.getValue();
  }

  get errors() {
    this._errors.length = 0;
    const data = this.data;
    switch (data.type) {
      case "view_dashboard_issue":
        {
          const checked = data.includeActivatedViews;
          if (!checked) {
            this._errors.push({
              message:
                "'Include current activated views list' must be checked'",
            });
          } else {
            if (!this.hasViews) {
              this._errors.push({
                message: "Missing views",
              });
            }
          }
        }
        break;
      default:
    }

    return this._errors;
  }

  renderErrors() {
    this.clearErrors();
    for (const err of this.errors) {
      this._elValidationOutput.appendChild(this.buildError(err.message));
    }
  }
  clearErrors() {
    this._elValidationOutput.innerHTML = "";
  }

  buildError(message) {
    return el(
      "li",
      { class: ["list-group-item", "mx-error-item"] },
      el("span", message),
    );
  }

  get hasViews() {
    const views = getViewsActive();
    return isNotEmpty(views);
  }

  validate() {
    const isValid = this.valid;
    if (isValid) {
      this.clearErrors();
      this.allow();
    } else {
      this.renderErrors();
      this.block();
    }
  }
  _get_enum_title(value) {
    const typeField = this.schema.properties.type;
    const index = typeField.enum.indexOf(value);
    return typeField.options.enum_titles[index];
  }
}

function _fix_checkbox(jed) {
  const cb = jed.element.querySelectorAll(
    "input[type=checkbox],input[type=radio]",
  );

  for (const c of cb) {
    if (c.parentElement.tagName === "LABEL") {
      c.parentElement.removeAttribute("for");
    }
  }
}
