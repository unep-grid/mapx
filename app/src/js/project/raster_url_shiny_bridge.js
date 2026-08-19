// @ts-check
import { RasterUrlConfigurator } from "./raster_url_configurator.js";
import { ws } from "../mx.js";
import { el, tt } from "../el_mapx/index.js";

const installedRoots = new WeakSet();

/**
 * Mount the raster health/actions strip in the legacy Shiny view editor.
 * Shiny only receives a lightweight refresh notification; configuration is
 * fetched and saved by the client/API boundary.
 */
export function installRasterUrlShinyBridge({ root, shiny }) {
  if (!root || !shiny?.addCustomMessageHandler || installedRoots.has(root)) {
    return;
  }
  installedRoots.add(root);
  shiny.addCustomMessageHandler("mx-raster-url-tools", ({ idView }) => {
    const host = [...root.querySelectorAll("[data-raster-url-view]")].find(
      (element) => element.dataset.rasterUrlView === idView,
    );
    if (host) mountRasterTools(host, idView, shiny);
  });
}

function mountRasterTools(host, idView, shiny) {
  const configurator = new RasterUrlConfigurator();
  const refs = {
    tiles: el("span", { class: "label label-default" }),
    legend: el("span", { class: "label label-default" }),
  };

  const refresh = async () => {
    try {
      const data = await ws.emitAsync(
        "/client/view/raster/config/get",
        { idView },
        15 * 1000,
      );
      if (data.error) throw new Error(data.error);
      renderHealth(data.config?.health);
    } catch (error) {
      refs.tiles.className = "label label-danger";
      refs.tiles.textContent = error.message || String(error);
      refs.legend.className = "label label-default";
      refs.legend.textContent = "";
    }
  };

  const renderHealth = (health) => {
    if (!health) {
      refs.tiles.replaceChildren(tt("project_tiles_report_status_unchecked"));
      refs.legend.replaceChildren(tt("project_tiles_report_status_unchecked"));
      return;
    }
    refs.tiles.replaceChildren(
      tt(health.tile_valid ? "project_tiles_report_status_valid" : "project_tiles_report_status_invalid"),
    );
    refs.legend.replaceChildren(
      tt(!health.legend_configured
        ? "project_tiles_report_status_not_configured"
        : health.legend_valid
          ? "project_tiles_report_status_valid"
          : "project_tiles_report_status_invalid"),
    );
    refs.tiles.className = `label label-${health.tile_valid ? "success" : "danger"}`;
    refs.legend.className = `label label-${!health.legend_configured ? "default" : health.legend_valid ? "success" : "danger"}`;
  };

  const edit = el(
    "button",
    {
      class: ["btn-circle", "btn-circle-small"],
      type: "button",
      title: "Configure raster URLs",
      "aria-label": "Configure raster URLs",
      on: {
        click: async () => {
          try {
            await configurator.show({
              idView,
              onSaved: async () => {
                await refresh();
                shiny.setInputValue?.("viewRasterConfigSaved", { idView, update: Date.now() }, { priority: "event" });
              },
            });
          } catch (error) {
            refs.tiles.className = "label label-danger";
            refs.tiles.textContent = error.message || String(error);
          }
        },
      },
    },
    el("i", { class: ["fa", "fa-pencil"], "aria-hidden": "true" }),
  );
  const check = el(
    "button",
    {
      class: ["btn-circle", "btn-circle-small"],
      type: "button",
      title: "Check now",
      "aria-label": "Check now",
      on: {
        click: async () => {
          try {
            const data = await ws.emitAsync(
              "/client/project/tiles_check/run_one",
              { idView },
              30 * 1000,
            );
            if (data.error) throw new Error(data.error);
            renderHealth(data.row);
            shiny.setInputValue?.("viewRasterConfigSaved", { idView, update: Date.now() }, { priority: "event" });
          } catch (error) {
            refs.tiles.className = "label label-danger";
            refs.tiles.textContent = error.message || String(error);
          }
        },
      },
    },
    el("i", { class: ["fa", "fa-heartbeat"], "aria-hidden": "true" }),
  );

  host.replaceChildren(
    el("div", { class: "raster-url-tools__row" }, [
      el("span", { class: "raster-url-health-label" }, [tt("project_tiles_report_col_tiles"), ": ", refs.tiles]),
      el("span", { class: "raster-url-health-label" }, [tt("project_tiles_report_col_legend"), ": ", refs.legend]),
      el("span", { class: "raster-url-tools__actions" }, [edit, check]),
    ]),
  );
  refresh();
}
