// @ts-check
import { settings } from "../../settings";
import { ws } from "../../mx";
import { getDictItem } from "../../language";
import { makeId } from "../../mx_helper_misc";
import { SelectAuto } from "../../select_auto";
import { ElementCreator } from "../../el/src/index.js";
import "../picker/index.js";
import "./style.less";

const resultEvent = "/server/source/overlap/result";
const progressEvent = "/server/source/overlap/progress";

export class MxSourceOverlapElement extends HTMLElement {
  constructor() {
    super();
    this.labels = {};
    this.onResult = this.onResult.bind(this);
    this.onProgress = this.onProgress.bind(this);
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
    if (this.ready) {
      this.attachSocketListeners();
      return;
    }
    if (this.initialized) return;
    this.initialize().catch((error) => {
      const message = error?.message || "Unable to load the overlap tool";
      this.replaceChildren(
        this.elements.el("p", { class: "alert alert-danger" }, message),
      );
    });
  }

  disconnectedCallback() {
    ws.socket.off(resultEvent, this.onResult);
    ws.socket.off(progressEvent, this.onProgress);
    this.countrySelect?.destroy();
    this.sourcePicker = null;
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
    this.countrySelect = new SelectAuto({
      target: this.refs.country,
      type: "countries",
      config: {
        loader_config: {
          update_on_init: false,
        },
      },
    });

    await this.countrySelect.init();
    await this.countrySelect.update();

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
    const { el } = this.elements;
    const form = el("form", { class: "mx-source-overlap" });
    const mode = this.makeModeField();
    const sources = this.makeSourcePicker();
    const country = this.makeSelectField("select_overlap_countries");
    const title = this.makeInput("source_title");
    const run = el(
      "button",
      {
        type: "submit",
        class: "btn btn-primary mx-source-overlap__run",
      },
      this.labels.btn_analyse,
    );
    const outputWrapper = el("div", {
      class: "mx-source-overlap__status",
    });
    outputWrapper.hidden = true;
    const output = el("output", {
      class: "mx-source-overlap__result",
    });
    output.setAttribute("aria-live", "polite");
    outputWrapper.append(output);

    const logsDetails = el("details", {
      class: "mx-source-overlap__logs-details",
    });
    logsDetails.hidden = true;
    const logsSummary = el("summary", this.labels.logs);
    const logs = el("ul", {
      class: "mx-source-overlap__logs",
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
    this.sourcePicker.addEventListener("mx-source-picker-change", () =>
      this.clearValidationResult(),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.run();
    });
    this.updateMode();
  }

  makeModeField() {
    const { el } = this.elements;
    const wrapper = el("fieldset", {
      class: "mx-source-overlap__mode",
    });
    wrapper.append(el("legend", this.labels.radio_source_overlap_mode));
    const choices = el("div", {
      class: "mx-source-overlap__mode-options",
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
      const label = el("label", {
        class: "mx-source-overlap__mode-option",
      });
      const input = el("input", { type: "radio" });
      input.name = "source-overlap-mode";
      input.value = option.key === "area" ? "area" : "create_source";
      input.checked = option.key === "area";
      label.append(input, el("span", option.label));
      choices.append(label);
      inputs[option.key] = input;
    }
    wrapper.append(choices);
    return { wrapper, area: inputs.area, create: inputs.create };
  }

  makeSelectField(labelKey, multiple = false) {
    const { el } = this.elements;
    const wrapper = el("label", { class: "form-group" });
    wrapper.append(el("span", this.labels[labelKey]));
    const control = el("select", { class: "form-control" });
    control.multiple = multiple;
    wrapper.append(control);
    return { wrapper, control };
  }

  makeSourcePicker() {
    const picker = /** @type {import("../picker/index.js").MxSourcePickerElement} */ (
      this.ownerDocument.createElement("mx-source-picker")
    );
    picker.config = {
      label: this.labels.select_overlap_layers,
      multiple: true,
      maxItems: 3,
      reorderable: true,
      acceptedTypes: ["vector"],
      requiredCapabilities: ["geometry"],
      accessMode: "readable",
      language: this.language,
    };
    this.sourcePicker = picker;
    return { wrapper: picker, control: picker };
  }

  makeInput(labelKey) {
    const { el } = this.elements;
    const wrapper = el("label", { class: "form-group" });
    wrapper.append(el("span", this.labels[labelKey]));
    const control = el("input", {
      type: "text",
      class: "form-control",
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
    const value = this.sourcePicker?.value;
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
    if (this.sourcePicker) this.sourcePicker.disabled = busy;
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
    const item = this.elements.el("li");
    item.textContent = message;
    this.refs.logs.append(item);
  }
}

if (!customElements.get("mx-source-overlap")) {
  customElements.define("mx-source-overlap", MxSourceOverlapElement);
}
