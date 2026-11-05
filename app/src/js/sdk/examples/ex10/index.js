import { Manager } from "/dist/mxsdk.module.js";

const elInteractions = document.getElementById("interactions");
const elModifiers = document.getElementById("btnModifiers");

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

mapx.on("ready", async () => {
  /**
   * One checkbox per interaction, e.g. {boxZoom:true, dragRotate:true, ...}
   */
  const state = await mapx.ask("get_map_interactions");
  render(state);

  /**
   * Typical use case : avoid accidental box zoom / rotation, keep the rest
   */
  elModifiers.disabled = false;
  elModifiers.addEventListener("click", async () => {
    const state = await mapx.ask("set_map_interactions", {
      boxZoom: false,
      dragRotate: false,
    });
    render(state);
  });
});

/**
 * Build or update the checkboxes from the interactions state
 * @param {Object<string, boolean>} state
 */
function render(state) {
  elInteractions.replaceChildren();
  for (const [name, enabled] of Object.entries(state)) {
    const elGroup = document.createElement("div");
    const elLabel = document.createElement("label");
    const elCheck = document.createElement("input");
    elGroup.className = "input-group";
    elCheck.type = "checkbox";
    elCheck.checked = enabled;
    elCheck.addEventListener("change", () => toggle(name, elCheck.checked));
    elLabel.append(elCheck, ` ${name}`);
    elGroup.append(elLabel);
    elInteractions.append(elGroup);
  }
}

async function toggle(name, enabled) {
  try {
    const state = await mapx.ask("set_map_interactions", { [name]: enabled });
    render(state);
  } catch (e) {
    console.warn(e);
  }
}
