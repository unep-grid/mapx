function makeApp(mcId, viewId) {
  const mc = document.getElementById(mcId);
  const m = new mxsdk.Manager({
    url: {
      host: "dev.mapx.localhost",
      port: 8880,
    },
    container: mc,
    static: true,
    verbose: true,
    params: {
      closePanels: true,
    },
  });
  window[mcId] = m;
  m.on("ready", async () => {
    mc.classList.add("loaded");
    await m.ask("set_immersive_mode", { toggle: true });
    await m.ask("view_add", { idView: viewId });
    const view = await m.ask("get_view_meta", { idView: viewId });
    const info = document.createElement("div");
    info.className = "info";
    info.innerText = `${viewId}: ${view?.meta?.title?.en}`;
    mc.appendChild(info);
  });
}

makeApp("mapx1", "MX-6EH7N-INM1L-P1PJ9");
makeApp("mapx2", "MX-ML9PZ-PZ1SI-WVV85");
makeApp("mapx3", "MX-3PH1G-OOJHT-6FS0X");
