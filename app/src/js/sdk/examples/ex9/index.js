import { Manager } from "/dist/mxsdk.module.js";

const elCount = document.getElementById("inputCount");
const elZoom = document.getElementById("checkZoom");
const elCreate = document.getElementById("btnCreate");
const elDelete = document.getElementById("btnDelete");
const elView = document.getElementById("resView");

let idViewCurrent = null;

const mapx = new Manager({
  container: document.getElementById("mapx"),
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
  },
  static: true,
  verbose: false,
  params: {
    closePanels: true,
  },
});

mapx.on("ready", () => {
  elCreate.disabled = false;
  elCreate.addEventListener("click", createOrReplace);
  elDelete.addEventListener("click", remove);
});

/**
 * Create a GeoJSON view, then delete the previous one.
 * With zoomToView false, the camera stays where the user left it.
 */
async function createOrReplace() {
  try {
    elCreate.disabled = true;
    const view = await mapx.ask("view_geojson_create", {
      random: {
        n: Number(elCount.value),
        latRange: [-40, 40],
        lngRange: [-60, 60],
      },
      save: false,
      zoomToView: elZoom.checked,
    });
    await remove();
    setCurrent(view.id);
  } catch (e) {
    console.warn(e);
  } finally {
    elCreate.disabled = false;
  }
}

/**
 * Delete the current GeoJSON view
 */
async function remove() {
  if (!idViewCurrent) {
    return;
  }
  try {
    await mapx.ask("view_geojson_delete", { idView: idViewCurrent });
    setCurrent(null);
  } catch (e) {
    console.warn(e);
  }
}

function setCurrent(idView) {
  idViewCurrent = idView;
  elView.innerText = idView || "none";
  elDelete.disabled = !idView;
}
