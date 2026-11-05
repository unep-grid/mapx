import { Manager } from "/dist/mxsdk.module.js";

const elSelect = document.getElementById("selectView");
const elProvider = document.getElementById("resProvider");
const elLegend = document.getElementById("legend");
const elJson = document.getElementById("resJson");

let idViewCurrent = null;

/**
 * Raster views from other projects : view_add loads them on demand
 */
const RASTER_VIEWS = ["MX-DSJNT-4AJM4-MNPX4", "MX-UUDXB-R5TEV-L4LS3"];

const mapx = new Manager({
  container: document.getElementById("mapx"),
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
  },
  verbose: false,
  params: {
    closePanels: true,
  },
});

mapx.on("ready", async () => {
  const views = await mapx.ask("get_views");
  const elEmpty = new Option("Select a view", "");
  elSelect.append(elEmpty);
  for (const id of RASTER_VIEWS) {
    elSelect.append(new Option(`[rt] ${id}`, id));
  }
  for (const view of views) {
    if (RASTER_VIEWS.includes(view.id)) {
      continue;
    }
    if (!["vt", "rt"].includes(view.type)) {
      continue;
    }
    const title = view?.data?.title?.en || view.id;
    elSelect.append(new Option(`[${view.type}] ${title}`, view.id));
  }
  elSelect.disabled = false;
  elSelect.addEventListener("change", () => update(elSelect.value));
});

/**
 * Show the view and render its legend
 * @param {string} idView
 */
async function update(idView) {
  try {
    if (idViewCurrent) {
      await mapx.ask("view_remove", { idView: idViewCurrent });
    }
    idViewCurrent = idView || null;
    elLegend.replaceChildren();
    elJson.textContent = "";
    elProvider.textContent = "-";
    if (!idView) {
      return;
    }
    await mapx.ask("view_add", { idView });
    await updateOptionTitle(idView);

    /**
     * {idView, type, provider, supported, data, reason}
     */
    const legend = await mapx.ask("get_view_legend_json", { idView });
    elJson.textContent = JSON.stringify(legend, null, 2);
    elProvider.textContent = legend.supported
      ? legend.provider
      : `none (${legend.reason})`;

    switch (legend.provider) {
      case "mapx":
        renderMapx(legend.data);
        break;
      case "geoserver":
        renderGeoServer(legend.data);
        break;
      default:
        await renderImage(idView);
    }
  } catch (e) {
    console.warn(e);
  }
}

/**
 * MapX vector legend : one item per rule
 * @param {Object} data {title, geometry, attribute, rules}
 */
function renderMapx(data) {
  if (data.title) {
    elLegend.append(elTitle(data.title));
  }
  for (const rule of data.rules) {
    /**
     * rule.label : translated label, or the value when not labelled.
     * A null value is the "no data" rule.
     */
    const hasLabel = Object.keys(rule.labels).length > 0;
    const isRange = rule.value_to !== null;
    const label = hasLabel
      ? rule.label
      : isRange
        ? `${rule.value} – ${rule.value_to}`
        : (rule.value ?? "No data");
    elLegend.append(elItem(rule.color, rule.opacity, label));
  }
}

/**
 * GeoServer raster legend : color map entries of each raster symbolizer
 * @param {Object} data {Legend:[{title, rules:[{symbolizers:[{Raster}]}]}]}
 */
function renderGeoServer(data) {
  for (const layer of data.Legend) {
    elLegend.append(elTitle(layer.title || layer.layerName));
    for (const rule of layer.rules || []) {
      for (const symbolizer of rule.symbolizers || []) {
        const colormap = symbolizer?.Raster?.colormap;
        if (!colormap) {
          continue;
        }
        for (const entry of colormap.entries || []) {
          const label = entry.label || entry.quantity;
          elLegend.append(elItem(entry.color, entry.opacity ?? 1, label));
        }
      }
    }
  }
}

/**
 * Fallback : legend image
 * @param {string} idView
 */
async function renderImage(idView) {
  try {
    const img = new Image();
    img.alt = "Legend";
    img.src = await mapx.ask("get_view_legend_image", { idView });
    elLegend.append(img);
  } catch (e) {
    console.warn(e);
    elLegend.append("No legend");
  }
}

function elTitle(text) {
  const el = document.createElement("strong");
  el.textContent = text;
  return el;
}

function elItem(color, opacity, label) {
  const elRow = document.createElement("div");
  const elSwatch = document.createElement("span");
  const elLabel = document.createElement("span");
  elRow.className = "legend-item";
  elSwatch.className = "legend-swatch";
  elSwatch.style.backgroundColor = color;
  elSwatch.style.opacity = opacity;
  elLabel.textContent = label;
  elRow.append(elSwatch, elLabel);
  return elRow;
}

/**
 * Replace the option label by the view title, once the view is loaded
 * @param {string} idView
 */
async function updateOptionTitle(idView) {
  const views = await mapx.ask("get_views");
  const view = views.find((v) => v.id === idView);
  const title = view?.data?.title?.en;
  const elOption = elSelect.selectedOptions[0];
  if (title && elOption?.value === idView) {
    elOption.textContent = elOption.textContent.replace(idView, title);
  }
}
