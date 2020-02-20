const mngr = new mxsdk.Manager({
  //url:   'http://dev.mapx.localhost:8880/static.html?project=MX-HPP-OWB-3SI-3FF-Q3R&views=MX-T8GJQ-GIC8X-AHLA9&zoomToViews=true&lat=-4.087&lng=21.754&z=4.886'
  url:
    'http://dev.mapx.localhost:8880/?project=MX-HPP-OWB-3SI-3FF-Q3R&language=en'
});

mngr.on('ready', () => {
  /* mngr.ask('get_views').then((views) => {*/
  //const max = 15;
  //let j = 0;
  //views.forEach((v, i) => {
  //j++;
  //if (j >= max) {
  //return;
  //}
  //mngr.ask('get_view_meta', v.id);
  //});
  /*});*/
  //mngr.ask('set_panel_left_visibility', {panel: 'views', show: false});
});

mngr.on('message', (message) => {
  console.log(message);
});
