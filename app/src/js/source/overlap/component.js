// @ts-check
import { settings } from "../../settings";
import { ws } from "../../mx";
import { getDictItem } from "../../language";
import { makeId } from "../../mx_helper_misc";
import { SelectAuto } from "../../select_auto";
import "./style.less";

const resultEvent = "/server/source/overlap/result";
const progressEvent = "/server/source/overlap/progress";

function make(doc, tag, options = {}) {
  const element = doc.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = `${options.text}`;
  if (options.type) element.type = options.type;
  return element;
}

export class MxSourceOverlapElement extends HTMLElement {
  constructor() {
    super();
    this.labels = {};
    this.onResult = this.onResult.bind(this);
    this.onProgress = this.onProgress.bind(this);
  }

  connectedCallback() {
    if (this.ready) {
      this.attachSocketListeners();
      return;
    }
    if (this.initialized) return;
    this.initialize().catch((error) => {
      const message = error?.message || "Unable to load the overlap tool";
      this.replaceChildren(
        make(this.ownerDocument, "p", {
          className: "alert alert-danger",
          text: message,
        }),
      );
    });
  }

  disconnectedCallback() {
    ws.socket.off(resultEvent, this.onResult);
    ws.socket.off(progressEvent, this.onProgress);
    this.sourceSelect?.destroy();
    this.countrySelect?.destroy();
    this.sourceSelect = null;
    this.countrySelect = null;
    this.ready = false;
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    this.language = settings.language || "en";
    this.labels = await this.loadLabels();
    this.render();
    await this.initializeSelects();
    this.ready = true;
    if (this.isConnected) {
      this.attachSocketListeners();
    }
  }

  async initializeSelects() {
    this.sourceSelect = new SelectAuto({
      target: this.refs.sources,
      type: "sources",
      config: {
        closeAfterSelect: false,
        maxItems: 3,
        plugins: ["remove_button", "drag_drop"],
        onChange: () => this.clearValidationResult(),
        loader_config: {
          types: ["vector"],
          readable: true,
          editable: false,
          add_global: true,
          add_views: true,
          include_dimensions: false,
          disable_missing: false,
          disable_large: false,
          update_on_init: false,
        },
      },
    });
    this.countrySelect = new SelectAuto({
      target: this.refs.country,
      type: "countries",
      config: {
        loader_config: {
          update_on_init: false,
        },
      },
    });

    await Promise.all([this.sourceSelect.init(), this.countrySelect.init()]);
    await Promise.all([
      this.sourceSelect.update(),
      this.countrySelect.update(),
    ]);

    const projectCountry = settings.project?.countries?.[0];
    if (projectCountry) {
      this.countrySelect.value = projectCountry;
    }
  }

  attachSocketListeners() {
    ws.socket.off(resultEvent, this.onResult);
    ws.socket.off(progressEvent, this.onProgress);
    ws.socket.on(resultEvent, this.onResult);
    ws.socket.on(progressEvent, this.onProgress);
  }

  async loadLabels() {
    const keys = [
      "radio_source_overlap_mode",
      "source_overlap_mode_area",
      "source_overlap_mode_create_source",
      "select_overlap_layers",
      "select_overlap_countries",
      "source_title",
      "logs",
      "btn_analyse",
    ];
    const values = await getDictItem(keys, this.language);
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  }

  render() {
    const doc = this.ownerDocument;
    const form = make(doc, "form", { className: "mx-source-overlap" });
    const mode = this.makeModeField();
    const sources = this.makeSelectField("select_overlap_layers", true);
    const country = this.makeSelectField("select_overlap_countries");
    const title = this.makeInput("source_title");
    const run = make(doc, "button", {
      type: "submit",
      text: this.labels.btn_analyse,
      className: "btn btn-primary mx-source-overlap__run",
    });
    const outputWrapper = make(doc, "div", {
      className: "mx-source-overlap__status",
    });
    outputWrapper.hidden = true;
    const output = make(doc, "output", {
      className: "mx-source-overlap__result",
    });
    output.setAttribute("aria-live", "polite");
    outputWrapper.append(output);

    const logsDetails = make(doc, "details", {
      className: "mx-source-overlap__logs-details",
    });
    logsDetails.hidden = true;
    const logsSummary = make(doc, "summary", { text: this.labels.logs });
    const logs = make(doc, "ul", {
      className: "mx-source-overlap__logs",
    });
    logsDetails.append(logsSummary, logs);

    form.append(
      mode.wrapper,
      sources.wrapper,
      country.wrapper,
      title.wrapper,
      run,
      outputWrapper,
      logsDetails,
    );
    this.replaceChildren(form);
    this.refs = {
      form,
      modeArea: mode.area,
      modeCreate: mode.create,
      sources: sources.control,
      country: country.control,
      title: title.control,
      titleWrapper: title.wrapper,
      run,
      outputWrapper,
      output,
      logsDetails,
      logs,
    };

    mode.wrapper.addEventListener("change", () => this.updateMode());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.run();
    });
    this.updateMode();
  }

  makeModeField() {
    const doc = this.ownerDocument;
    const wrapper = make(doc, "fieldset", {
      className: "mx-source-overlap__mode",
    });
    wrapper.append(
      make(doc, "legend", { text: this.labels.radio_source_overlap_mode }),
    );
    const choices = make(doc, "div", {
      className: "mx-source-overlap__mode-options",
    });
    const inputs = {};
    for (const option of [
      {
        key: "area",
        label: this.labels.source_overlap_mode_area,
      },
      {
        key: "create",
        label: this.labels.source_overlap_mode_create_source,
      },
    ]) {
      const label = make(doc, "label", {
        className: "mx-source-overlap__mode-option",
      });
      const input = make(doc, "input", { type: "radio" });
      input.name = "source-overlap-mode";
      input.value = option.key === "area" ? "area" : "create_source";
      input.checked = option.key === "area";
      label.append(input, make(doc, "span", { text: option.label }));
      choices.append(label);
      inputs[option.key] = input;
    }
    wrapper.append(choices);
    return { wrapper, area: inputs.area, create: inputs.create };
  }

  makeSelectField(labelKey, multiple = false) {
    const doc = this.ownerDocument;
    const wrapper = make(doc, "label", { className: "form-group" });
    wrapper.append(make(doc, "span", { text: this.labels[labelKey] }));
    const control = make(doc, "select", { className: "form-control" });
    control.multiple = multiple;
    wrapper.append(control);
    return { wrapper, control };
  }

  makeInput(labelKey) {
    const doc = this.ownerDocument;
    const wrapper = make(doc, "label", { className: "form-group" });
    wrapper.append(make(doc, "span", { text: this.labels[labelKey] }));
    const control = make(doc, "input", {
      type: "text",
      className: "form-control",
    });
    control.minLength = 5;
    control.maxLength = 200;
    wrapper.append(control);
    return { wrapper, control };
  }

  getMode() {
    return this.refs.modeCreate.checked ? "create_source" : "area";
  }

  getSelectedSources() {
    const value = this.sourceSelect?.value;
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  updateMode() {
    const create = this.getMode() === "create_source";
    this.refs.titleWrapper.hidden = !create;
    this.refs.title.required = create;
    this.clearValidationResult();
  }

  clearValidationResult() {
    if (
      this.refs?.output?.classList.contains("mx-source-overlap__result--error")
    ) {
      this.setResult("");
    }
  }

  validate() {
    const sources = this.getSelectedSources();
    if (sources.length < 1 || sources.length > 3) {
      return this.labels.select_overlap_layers;
    }
    if (!this.countrySelect?.value) {
      return this.labels.select_overlap_countries;
    }
    if (
      this.getMode() === "create_source" &&
      (this.refs.title.value.trim().length < 5 ||
        this.refs.title.value.trim().length > 200)
    ) {
      return this.labels.source_title;
    }
    return null;
  }

  async run() {
    const error = this.validate();
    if (error) {
      this.setResult(error, true);
      return;
    }
    this.idRequest = makeId(16);
    this.resetRunState();
    this.setBusy(true);
    this.appendLog("Request accepted");
    try {
      const response = await ws.emitAsync(
        "/client/source/overlap/run",
        {
          id_request: this.idRequest,
          mode: this.getMode(),
          layers: [...this.getSelectedSources()],
          country: this.countrySelect.value,
          title: this.refs.title.value.trim(),
          language: this.language,
        },
        10 * 1000,
      );
      if (response?.accepted) {
        return;
      }
      this.setBusy(false);
      const message = response?.error || "Overlap request failed";
      this.setResult(message, true);
      this.appendLog(message);
    } catch (errorRequest) {
      this.setBusy(false);
      const message = errorRequest?.message || "Overlap request failed";
      this.setResult(message, true);
      this.appendLog(message);
    }
  }

  onResult(result) {
    if (result?.id_request !== this.idRequest) return;
    this.setBusy(false);
    if (!result.success) {
      this.setResult(result.error || "Overlap request failed", true);
      this.appendLog(result.error || "Failed");
      return;
    }
    if (result.mode === "area") {
      const areaKm2 = (Number(result.area_m2) || 0) / 1e6;
      this.setResult(`${areaKm2.toLocaleString(this.language)} km²`);
    } else {
      this.setResult(
        `${result.source?.title || "Source"} (${result.source?.id || ""})`,
      );
    }
    this.appendLog(`Completed in ${result.duration_ms} ms`);
  }

  onProgress(progress) {
    if (progress?.id_request !== this.idRequest) return;
    this.appendLog(progress.message);
  }

  resetRunState() {
    this.setResult("");
    this.refs.logs.replaceChildren();
    this.refs.logsDetails.hidden = true;
    this.refs.logsDetails.open = false;
  }

  setBusy(busy) {
    this.refs.run.disabled = busy;
    this.refs.modeArea.disabled = busy;
    this.refs.modeCreate.disabled = busy;
    this.refs.title.disabled = busy;
    this.sourceSelect?.[busy ? "disable" : "enable"]();
    this.countrySelect?.[busy ? "disable" : "enable"]();
    this.refs.form.setAttribute("aria-busy", `${busy}`);
  }

  setResult(message, error = false) {
    this.refs.output.textContent = message;
    this.refs.outputWrapper.hidden = !message;
    this.refs.output.classList.toggle(
      "mx-source-overlap__result--error",
      error,
    );
  }

  appendLog(message) {
    if (!message) return;
    const firstMessage = this.refs.logsDetails.hidden;
    this.refs.logsDetails.hidden = false;
    if (firstMessage) {
      this.refs.logsDetails.open = true;
    }
    this.refs.logs.append(make(this.ownerDocument, "li", { text: message }));
  }
}

if (!customElements.get("mx-source-overlap")) {
  customElements.define("mx-source-overlap", MxSourceOverlapElement);
}
