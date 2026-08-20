// @ts-check
import { ElementCreator } from "../el/src/index.js";
import { RasterUrlConfigurator } from "./raster_url_configurator.js";
import { rasterStatusConfig, rasterStatusLabel } from "./raster_url_health.js";
import { ws } from "../mx.js";
import { tt } from "../el_mapx/index.js";

const installedRoots = new WeakSet();

/** Mount the browser-owned raster URL summary in the legacy Shiny editor. */
export function installRasterUrlShinyBridge({ root, shiny }) {
  if (!root || !shiny?.addCustomMessageHandler || installedRoots.has(root)) return;
  installedRoots.add(root);
  shiny.addCustomMessageHandler("mx-raster-url-tools", ({ idView }) => {
    const host = [...root.querySelectorAll("[data-raster-url-view]")].find(
      (element) => element.dataset.rasterUrlView === idView,
    );
    if (host) mountRasterTools({ host, idView, root, shiny });
  });
}

function mountRasterTools({ host, idView, root, shiny }) {
  const el = new ElementCreator({ document: root.ownerDocument }).el;
  const configurator = new RasterUrlConfigurator({ root });
  let currentConfig = null;
  let busy = false;

  const createPreview = (resource) => el("button", {
    class: ["form-control", "raster-url-summary__preview"],
    type: "button",
    dataset: { resource },
  });
  const refs = {
    tilesPreview: createPreview("tiles"),
    legendPreview: createPreview("legend"),
    tilesStatus: el("span"),
    legendStatus: el("span"),
    feedback: el("div", {
      class: ["help-block", "raster-url-summary__feedback"],
      "aria-live": "polite",
    }),
  };

  refs.configure = el("button", {
    class: ["btn", "btn-default", "btn-sm"],
    type: "button",
    on: { click: openConfigurator },
  }, [
    el("i", { class: ["fa", "fa-pencil"], "aria-hidden": "true" }),
    " ",
    tt("raster_url_action_configure"),
  ]);
  refs.check = el("button", {
    class: ["btn", "btn-default", "btn-sm"],
    type: "button",
    on: { click: checkNow },
  }, [
    el("i", { class: ["fa", "fa-heartbeat"], "aria-hidden": "true" }),
    " ",
    tt("project_tiles_report_btn_check"),
  ]);
  refs.tilesPreview.addEventListener("click", openConfigurator);
  refs.legendPreview.addEventListener("click", openConfigurator);

  function resourceRow(label, preview, status, id) {
    preview.id = id;
    return el("div", { class: ["form-group", "raster-url-summary__group"] }, [
      el("label", { class: "control-label", for: id }, label),
      el("div", { class: "raster-url-summary__field" }, [preview, status]),
    ]);
  }

  function renderStatus(target, status) {
    target.className = `label label-${status.className} raster-url-status`;
    target.dataset.state = status.state;
    target.replaceChildren(
      el("i", { class: status.icon, "aria-hidden": "true" }),
      " ",
      tt(status.translationKey),
    );
  }

  function renderPreview(target, value) {
    if (value) {
      target.textContent = value;
      target.title = value;
      return;
    }
    target.replaceChildren(tt("project_tiles_report_status_not_configured"));
    target.removeAttribute("title");
  }

  function renderConfig(config) {
    currentConfig = config;
    const health = config?.health;
    renderPreview(refs.tilesPreview, config?.tiles);
    renderPreview(refs.legendPreview, config?.legend);
    renderStatus(refs.tilesStatus, rasterStatusLabel(health, "tile", {
      configured: Boolean(config?.tiles),
    }));
    renderStatus(refs.legendStatus, rasterStatusLabel(health, "legend", {
      configured: Boolean(config?.legend),
    }));
  }

  function setBusy(value) {
    busy = value;
    refs.configure.disabled = value || !currentConfig;
    refs.check.disabled = value || !currentConfig;
    refs.tilesPreview.disabled = value || !currentConfig;
    refs.legendPreview.disabled = value || !currentConfig;
  }

  function notifyShiny() {
    shiny.setInputValue?.(
      "viewRasterConfigSaved",
      { idView, update: Date.now() },
      { priority: "event" },
    );
  }

  function showError(error) {
    refs.feedback.className = "help-block text-danger raster-url-summary__feedback";
    refs.feedback.textContent = error?.message || String(error);
  }

  async function refresh() {
    setBusy(true);
    refs.feedback.replaceChildren();
    try {
      const data = await ws.emitAsync(
        "/client/view/raster/config/get",
        { idView },
        15 * 1000,
      );
      if (data.error) throw new Error(data.error);
      renderConfig(data.config);
    } catch (error) {
      showError(error);
      renderStatus(refs.tilesStatus, rasterStatusConfig("incomplete"));
      renderStatus(refs.legendStatus, rasterStatusConfig("incomplete"));
    } finally {
      setBusy(false);
    }
  }

  async function openConfigurator() {
    if (busy || !currentConfig) return;
    try {
      await configurator.show({
        idView,
        config: currentConfig,
        onSaved: (row, config) => {
          renderConfig({ ...config, health: row });
          refs.feedback.replaceChildren();
          notifyShiny();
        },
      });
    } catch (error) {
      showError(error);
    }
  }

  async function checkNow() {
    if (busy || !currentConfig) return;
    setBusy(true);
    refs.feedback.replaceChildren();
    renderStatus(refs.tilesStatus, rasterStatusConfig("checking"));
    if (currentConfig.legend) {
      renderStatus(refs.legendStatus, rasterStatusConfig("checking"));
    }
    try {
      const data = await ws.emitAsync(
        "/client/project/tiles_check/run_one",
        { idView },
        30 * 1000,
      );
      if (data.error) throw new Error(data.error);
      renderConfig({ ...currentConfig, health: data.row });
      notifyShiny();
    } catch (error) {
      showError(error);
      renderStatus(refs.tilesStatus, rasterStatusConfig("incomplete"));
      renderStatus(
        refs.legendStatus,
        currentConfig.legend
          ? rasterStatusConfig("incomplete")
          : rasterStatusConfig("not_configured"),
      );
    } finally {
      setBusy(false);
    }
  }

  host.replaceChildren(el("fieldset", { class: "raster-url-summary" }, [
    el(
      "legend",
      { class: ["control-label", "raster-url-summary__title"] },
      tt("raster_url_summary_title"),
    ),
    resourceRow(
      tt("source_raster_tile_url"),
      refs.tilesPreview,
      refs.tilesStatus,
      `mx-raster-tiles-${idView}`,
    ),
    resourceRow(
      tt("source_raster_tile_legend"),
      refs.legendPreview,
      refs.legendStatus,
      `mx-raster-legend-${idView}`,
    ),
    el("div", { class: "raster-url-summary__actions" }, [
      refs.configure,
      refs.check,
    ]),
    refs.feedback,
  ]));
  setBusy(true);
  refresh();
}
