const elMapx = document.getElementById("mapx");
const elOut = document.getElementById("out");

const mapx = new mxsdk.Manager({
  //url:   'http://dev.mapx.localhost:8880/static.html?project=MX-HPP-OWB-3SI-3FF-Q3R&views=MX-T8GJQ-GIC8X-AHLA9&zoomToViews=true&lat=-4.087&lng=21.754&z=4.886'
  container: elMapx,
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
    protocol: "http",
  },
  static: true,
  //static : false,
  verbose: true,
  params: {
    zoomToViews: true,
    closePanels: true,
    //views: ['MX-CRPXN-W8IAC-XWFLU'],
    views: ['MX-FI9VW-B0HTQ-EGB09'],// ecoregion afg
    //views: ['MX-V453A-JPA5O-8EIRD'],
    language: "en",
  },
});

mapx.on("ready", async () => {
  await mapx.ask("set_features_click_sdk_only", {
    enable: true,
  });
  await mapx.ask("view_add", {
    idView: "MX-NHM17-ATTWX-MQTKD",
    zoomToView: true,
  });


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
mapx.on("click_attributes", (d) => {
  console.log(`Attributes clicked part ${d.part}/${d.nPart}`);
  const str = JSON.stringify(d, 0, 2);
  out.innerText = str;
});
