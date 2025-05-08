const mapx = new mxsdk.Manager({
  container: document.getElementById("mapx"),
  verbose: true,
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
  },
});

mapx.on("view_added", (o) => {
  console.log("view added", o);
});

mapx.on("view_closed", (o) => {
  console.log("view closed", o);
});

mapx.on("mapx_disconnected", () => {
  alert("mapx_disconnected");
});

mapx.on("project_change", (d) => {
  console.log("Project changed", d);
});

mapx.once("ready", () => {
  mapx.ask("set_features_click_sdk_only", {
    enable: true,
  });
  mapx.on("click_attributes", console.log);
});
