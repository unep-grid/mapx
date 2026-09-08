// @ts-check
import { ElementCreator } from "../../el/src/index.js";
import { getDictItem } from "../../language/index.js";
import { moduleLoad } from "../../modules_loader_async/index.js";
import { events, ws } from "../../mx.js";
import { settings } from "../../settings/index.js";
import { openConfirmDialog, openNoticeDialog } from "../../window/dialog.js";
import { getMapxWindowManager } from "../../window/index.js";
import {
  triggerSourceSettingsChanged,
  triggerUpdateSourcesList,
} from "../../map_helpers/index.js";
import "./style.less";

let instanceId = 0;
const PAGE_SIZE = 25;

const labelKeys = [
  "source_title",
  "source_id",
  "email_editor",
  "source_target_readers",
  "source_target_editors",
  "source_services",
  "project",
  "check_source_global_enable",
  "check_source_global_enable_desc",
  "btn_update",
  "btn_delete",
  "btn_confirm",
  "btn_cancel",
  "btn_close",
  "publishers",
  "admins",
  "mx_download",
  "gs_ws_b",
  "mx_postgis_tiler",
  "source_settings_loading",
  "source_settings_load_error",
  "source_settings_retry",
  "source_settings_views_count",
  "source_settings_dependencies_count",
  "source_settings_load_more",
  "source_settings_saved",
  "source_settings_delete_title",
  "source_settings_delete_description",
  "source_settings_deleted",
  "source_settings_force_global",
  "source_settings_publishers_required",
  "source_settings_delete_blocked",
];

export class MxSourceSettingsElement extends HTMLElement {
  constructor() {
    super();
    this.instance = ++instanceId;
    this.eventGroup = `source-settings-${this.instance}`;
    this.requestId = 0;
    this.selects = [];
    this.usage = new Map();
    this.onLanguageChange = this.onLanguageChange.bind(this);
  }

  get elements() {
    if (this.elementCreator?.document !== this.ownerDocument) {
      this.elementCreator = new ElementCreator({
        document: this.ownerDocument,
      });
    }
    return this.elementCreator;
  }

  connectedCallback() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    events.on({
      type: "language_change",
      idGroup: this.eventGroup,
      cb: this.onLanguageChange,
    });
    this.renderLoading();
    this.load().catch((error) => this.renderError(error));
  }

  disconnectedCallback() {
    this.requestId += 1;
    events.offGroup(this.eventGroup);
    this.destroySelects();
    this.initialized = false;
  }

  async loadLabels() {
    this.language = settings.language || "en";
    const values = await getDictItem(labelKeys, this.language);
    this.labels = Object.fromEntries(
      labelKeys.map((key, index) => [key, values[index]]),
    );
  }

  async load() {
    const requestId = ++this.requestId;
    await this.loadLabels();
    const response = await ws.emitAsync(
      "/client/source/settings/get",
      { idSource: this.idSource, language: this.language },
      30 * 1000,
    );
    if (!this.isCurrent(requestId)) {
      return;
    }
    if (!response?.ok) {
      throw new Error(
        response?.error || this.labels.source_settings_load_error,
      );
    }
    this.overview = response;
    this.usage.clear();
    await this.render();
  }

  isCurrent(requestId) {
    return this.isConnected && requestId === this.requestId;
  }

  renderLoading() {
    const { el } = this.elements;
    this.setActionsDisabled(true);
    this.replaceChildren(
      el(
        "div",
        {
          class: "mx-source-settings mx-source-settings--loading",
          "aria-busy": "true",
        },
        el("p", { class: ["mx-source-settings__loading", "text-muted"] }, [
          el("i", {
            class: ["fa", "fa-circle-o-notch", "fa-spin"],
            "aria-hidden": "true",
          }),
          " ",
          this.labels?.source_settings_loading || "…",
        ]),
      ),
    );
  }

  renderError(error) {
    if (!this.isConnected) {
      return;
    }
    this.setActionsDisabled(true);
    const { el } = this.elements;
    const message =
      error?.message ||
      this.labels?.source_settings_load_error ||
      "Unable to load source settings";
    const retry = el(
      "button",
      {
        type: "button",
        class: ["btn", "btn-default"],
        on: {
          click: () => {
            this.renderLoading();
            this.load().catch((loadError) => this.renderError(loadError));
          },
        },
      },
      this.labels?.source_settings_retry || "Retry",
    );
    this.replaceChildren(
      el("div", { class: "mx-source-settings" }, [
        el("p", { class: ["alert", "alert-danger"], role: "alert" }, message),
        retry,
      ]),
    );
  }

  async render() {
    this.destroySelects();
    const { el } = this.elements;
    const source = this.overview.source;
    this.ensureActions();
    this.refs = {};
    const form = el("form", { class: "mx-source-settings" });
    const title = this.makeReadOnlyField(
      "source_title",
      source.title || source.id,
    );
    const id = this.makeReadOnlyField(
      "source_id",
      `${source.id} · ${source.type}`,
    );
    const editor = this.makeReadOnlyField(
      "email_editor",
      source.editorEmail || "—",
    );
    const readers = this.makeSelect("source_target_readers", "readers");
    const editors = this.makeSelect("source_target_editors", "editors");
    const services = this.makeSelect("source_services", "services");
    const global = this.makeGlobalField();
    const warnings = el("aside", {
      class: ["mx-source-settings__warnings", "alert", "alert-warning"],
      role: "status",
    });
    const fields = el("section", { class: "mx-source-settings__fields" }, [
      title.wrapper,
      id.wrapper,
      editor.wrapper,
      readers.wrapper,
      editors.wrapper,
      services.wrapper,
      global,
    ]);
    const usage = el("div", { class: "mx-source-settings__usage" }, [
      this.makeUsageDetails("views"),
      this.makeUsageDetails("sources"),
    ]);
    form.append(fields, usage, warnings);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.save();
    });
    this.replaceChildren(form);
    this.refs = {
      form,
      warnings,
      readers: readers.control,
      editors: editors.control,
      services: services.control,
      global: global.querySelector("input"),
      save: this.actionElements.save,
      remove: this.actionElements.remove,
    };
    this.renderConstraints();
    await this.initializeSelects(this.refs);
    this.setBusy(false);
  }

  makeReadOnlyField(labelKey, value) {
    const { el } = this.elements;
    const id = `source-settings-${this.instance}-${labelKey}`;
    const input = el("input", {
      id,
      type: "text",
      class: ["form-control", "mx-source-settings__readonly"],
      value,
      readonly: true,
    });
    const wrapper = this.makeFieldRow(
      el(
        "label",
        {
          for: id,
          class: "control-label",
          "data-lang_key": labelKey,
        },
        this.labels[labelKey],
      ),
      input,
    );
    return { wrapper, control: input };
  }

  ensureActions() {
    if (this.actionElements?.save && this.actionElements?.remove) {
      return;
    }
    const { el } = this.elements;
    this.actionElements = {
      save: el(
        "button",
        {
          type: "button",
          on: { click: () => this.save() },
        },
        this.labels.btn_update,
      ),
      remove: el(
        "button",
        {
          type: "button",
          on: { click: () => this.remove() },
        },
        this.labels.btn_delete,
      ),
    };
  }

  makeSelect(labelKey, name) {
    const { el } = this.elements;
    const id = `source-settings-${this.instance}-${name}`;
    const label = el(
      "label",
      { for: id, class: "control-label", "data-lang_key": labelKey },
      this.labels[labelKey],
    );
    const control = el("select", {
      id,
      class: "form-control",
      multiple: true,
    });
    control.dataset.setting = name;
    const choices = this.overview.choices[name] || [];
    for (const value of choices) {
      const option = el("option", { value }, this.labels[value] || value);
      option.selected = (this.overview.source[name] || []).includes(value);
      control.append(option);
    }
    return { wrapper: this.makeFieldRow(label, control), control };
  }

  makeFieldRow(label, control) {
    const { el } = this.elements;
    return el("div", { class: "mx-source-settings__field" }, [
      el("div", { class: "mx-source-settings__field-label" }, label),
      el("div", { class: "mx-source-settings__field-control" }, control),
    ]);
  }

  makeGlobalField() {
    const { el } = this.elements;
    const id = `source-settings-${this.instance}-global`;
    const input = el("input", {
      id,
      type: "checkbox",
      "data-lang_key": "check_source_global_enable_desc",
      "data-lang_type": "tooltip",
      title: this.labels.check_source_global_enable_desc,
    });
    input.checked =
      this.overview.constraints.forceGlobal || this.overview.source.global;
    input.disabled =
      !this.overview.permissions.canSetGlobal ||
      this.overview.constraints.forceGlobal;
    return this.makeFieldRow(
      el(
        "label",
        {
          for: id,
          class: "control-label",
          "data-lang_key": "check_source_global_enable",
        },
        this.labels.check_source_global_enable,
      ),
      el("div", { class: "checkbox" }, input),
    );
  }

  makeUsageDetails(category) {
    const { el } = this.elements;
    const isViews = category === "views";
    const count = this.overview.usage[category];
    const key = isViews
      ? "source_settings_views_count"
      : "source_settings_dependencies_count";
    const details = el("details", { class: "mx-source-settings__usage-group" });
    const summary = el("summary", this.format(this.labels[key], { count }));
    const content = el("div", { class: "mx-source-settings__usage-content" });
    details.append(summary, content);
    details.addEventListener("toggle", () => {
      if (details.open && !this.usage.has(category)) {
        this.loadUsage(category, content);
      }
    });
    if (count === 0) {
      details.hidden = true;
    }
    return details;
  }

  async initializeSelects(refs) {
    const TomSelect = await moduleLoad("tom-select");
    if (!this.isConnected || this.refs !== refs) {
      return;
    }
    for (const control of [refs.readers, refs.editors, refs.services]) {
      this.selects.push(
        new TomSelect(control, {
          plugins: ["remove_button"],
          create: false,
          sortField: { field: "text", direction: "asc" },
        }),
      );
    }
  }

  destroySelects() {
    for (const select of this.selects || []) {
      select.destroy?.();
    }
    this.selects = [];
  }

  renderConstraints() {
    const messages = [];
    const constraints = this.overview.constraints;
    if (constraints.forceGlobal) {
      messages.push(this.labels.source_settings_force_global);
    }
    if (constraints.protectPublisherReaders) {
      messages.push(this.labels.source_settings_publishers_required);
    }
    if (constraints.blockDelete) {
      messages.push(this.labels.source_settings_delete_blocked);
    }
    const { el } = this.elements;
    this.refs.warnings.replaceChildren(
      el("i", {
        class: ["fa", "fa-exclamation-triangle"],
        "aria-hidden": "true",
      }),
      el(
        "ul",
        messages.map((message) => el("li", message)),
      ),
    );
    this.refs.warnings.hidden = messages.length === 0;
    this.refs.remove.disabled = constraints.blockDelete;
  }

  async loadUsage(category, content, offset = 0) {
    const state = this.usage.get(category) || { rows: [], loading: false };
    if (state.loading) {
      return;
    }
    state.loading = true;
    this.usage.set(category, state);
    this.renderUsage(category, content, state);
    try {
      const response = await ws.emitAsync(
        "/client/source/settings/usage",
        {
          idSource: this.idSource,
          category,
          language: this.language,
          limit: PAGE_SIZE,
          offset,
        },
        30 * 1000,
      );
      if (!response?.ok) {
        throw new Error(
          response?.error || this.labels.source_settings_load_error,
        );
      }
      state.rows.push(...response.rows);
      state.total = response.total;
      state.loading = false;
      this.renderUsage(category, content, state);
    } catch (error) {
      state.loading = false;
      state.error = error?.message || this.labels.source_settings_load_error;
      this.renderUsage(category, content, state);
    }
  }

  renderUsage(category, content, state) {
    const { el } = this.elements;
    if (state.loading && state.rows.length === 0) {
      content.replaceChildren(el("p", this.labels.source_settings_loading));
      return;
    }
    if (state.error) {
      content.replaceChildren(
        el("p", { class: "alert alert-danger" }, state.error),
      );
      return;
    }
    const table = el("table", {
      class: ["table", "table-condensed", "table-striped"],
    });
    table.append(
      el(
        "thead",
        el("tr", [
          el("th", this.labels.source_title),
          el("th", this.labels.email_editor),
          el("th", this.labels.project),
        ]),
      ),
      el(
        "tbody",
        state.rows.map((row) =>
          el("tr", [
            el("td", row.title || row.id),
            el("td", row.email_editor || "—"),
            el("td", row.title_project || row.project || "—"),
          ]),
        ),
      ),
    );
    const nodes = [table];
    if (state.rows.length < (state.total || 0)) {
      nodes.push(
        el(
          "button",
          {
            type: "button",
            class: ["btn", "btn-default", "btn-sm"],
            disabled: state.loading,
            on: {
              click: () => this.loadUsage(category, content, state.rows.length),
            },
          },
          this.labels.source_settings_load_more,
        ),
      );
    }
    content.replaceChildren(...nodes);
  }

  values(control) {
    return Array.from(control.selectedOptions, (option) => option.value);
  }

  async save() {
    this.setBusy(true);
    this.setFeedback("");
    const changes = {
      readers: this.values(this.refs.readers),
      editors: this.values(this.refs.editors),
      services: this.values(this.refs.services),
    };
    if (this.overview.permissions.canSetGlobal) {
      changes.global = this.refs.global.checked;
    }
    try {
      const response = await ws.emitAsync(
        "/client/source/revise",
        { method: "settings", idSource: this.idSource, changes },
        30 * 1000,
      );
      if (!response?.ok) {
        if (response?.status === 409) {
          await this.load();
        }
        throw new Error(
          response?.error || this.labels.source_settings_load_error,
        );
      }
      triggerUpdateSourcesList();
      triggerSourceSettingsChanged();
      await this.load();
      this.setFeedback(this.labels.source_settings_saved);
    } catch (error) {
      this.setFeedback(
        error?.message || this.labels.source_settings_load_error,
        true,
      );
    } finally {
      this.setBusy(false);
    }
  }

  async remove() {
    const manager = getMapxWindowManager(
      this.applicationRoot || this.ownerDocument.body,
    );
    const confirmed = await openConfirmDialog({
      manager,
      key: "source-settings-delete-confirm",
      title: this.labels.source_settings_delete_title,
      content: this.labels.source_settings_delete_description,
      confirmLabel: this.labels.btn_confirm,
      cancelLabel: this.labels.btn_cancel,
    });
    if (!confirmed) {
      return;
    }
    this.setBusy(true);
    try {
      const response = await ws.emitAsync(
        "/client/source/revise",
        { method: "delete", idSource: this.idSource, changes: {} },
        30 * 1000,
      );
      if (!response?.ok) {
        if (response?.status === 409) {
          await this.load();
        }
        throw new Error(
          response?.error || this.labels.source_settings_load_error,
        );
      }
      triggerUpdateSourcesList();
      triggerSourceSettingsChanged();
      this.window?.close("deleted");
      await openNoticeDialog({
        manager,
        title: this.labels.source_settings_delete_title,
        content: this.labels.source_settings_deleted,
        closeLabel: this.labels.btn_close,
      });
    } catch (error) {
      this.setFeedback(
        error?.message || this.labels.source_settings_load_error,
        true,
      );
      this.setBusy(false);
    }
  }

  setBusy(busy) {
    if (!this.refs) {
      return;
    }
    this.refs.form.setAttribute("aria-busy", String(busy));
    this.refs.save.disabled = busy;
    this.refs.remove.disabled = busy || this.overview.constraints.blockDelete;
    this.refs.global.disabled =
      busy ||
      !this.overview.permissions.canSetGlobal ||
      this.overview.constraints.forceGlobal;
    for (const select of this.selects) {
      select[busy ? "disable" : "enable"]?.();
    }
  }

  setActionsDisabled(disabled) {
    if (!this.actionElements) {
      return;
    }
    this.actionElements.save.disabled = disabled;
    this.actionElements.remove.disabled = disabled;
  }

  setFeedback(message, error = false) {
    const target = this.statusElement;
    if (!target) {
      return;
    }
    target.textContent = message;
    target.hidden = !message;
    target.classList.toggle("text-danger", error);
    target.classList.toggle("text-success", Boolean(message) && !error);
  }

  async onLanguageChange() {
    if (!this.isConnected) {
      return;
    }
    this.renderLoading();
    try {
      await this.load();
    } catch (error) {
      this.renderError(error);
    }
  }

  format(template, values) {
    return String(template).replace(
      /\{\{(\w+)\}\}/g,
      (_match, key) => values[key] ?? "",
    );
  }
}

if (!customElements.get("mx-source-settings")) {
  customElements.define("mx-source-settings", MxSourceSettingsElement);
}
