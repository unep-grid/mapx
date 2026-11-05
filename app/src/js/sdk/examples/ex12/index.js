import { Manager } from "/dist/mxsdk.module.js";

const elSelect = document.getElementById("selectView");
const elLngLat = document.getElementById("resLngLat");
const elResult = document.getElementById("result");

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
  /**
   * Only the SDK receives click results : MapX does not show its popup
   */
  await mapx.ask("set_features_click_sdk_only", { enable: true });
  mapx.on("click_features", render);

  const views = await mapx.ask("get_views");
  elSelect.append(new Option("Select a raster view", ""));
  for (const id of RASTER_VIEWS) {
    elSelect.append(new Option(id, id));
  }
  for (const view of views) {
    if (view.type !== "rt" || RASTER_VIEWS.includes(view.id)) {
      continue;
    }
    const title = view?.data?.title?.en || view.id;
    elSelect.append(new Option(title, view.id));
  }
  elSelect.disabled = false;
  elSelect.addEventListener("change", () => update(elSelect.value));
});

async function update(idView) {
  try {
    if (idViewCurrent) {
      await mapx.ask("view_remove", { idView: idViewCurrent });
    }
    idViewCurrent = idView || null;
    elResult.replaceChildren();
    if (idView) {
      await mapx.ask("view_add", { idView });
      await updateOptionTitle(idView);
    }
  } catch (e) {
    console.warn(e);
  }
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
    elOption.textContent = title;
  }
}

/**
 * Render one table per queried view.
 * - attributes : {[idView]: [{GRAY_INDEX: 12.3}, ...]}
 * - a view missing from attributes was not hit / not queried
 * - a null raster value means "no data" (GeoServer exclude_nodata_result)
 * @param {Object} data {attributes, lngLat, point}
 */
function render(data) {
  const { attributes, lngLat } = data;
  elLngLat.textContent = `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`;
  elResult.replaceChildren();

  const ids = Object.keys(attributes);
  if (ids.length === 0) {
    elResult.append("Nothing at this location");
    return;
  }

  for (const idView of ids) {
    const rows = attributes[idView];
    const elTable = document.createElement("table");
    const elCaption = elTable.createCaption();
    elCaption.textContent = idView;
    for (const row of rows) {
      for (const [name, value] of Object.entries(row)) {
        const elTr = elTable.insertRow();
        const elName = elTr.insertCell();
        const elValue = elTr.insertCell();
        elName.textContent = name;
        if (value === null) {
          elValue.textContent = "No data";
          elValue.className = "no-data";
        } else {
          elValue.textContent = value;
        }
      }
    }
    elResult.append(elTable);
  }
}
