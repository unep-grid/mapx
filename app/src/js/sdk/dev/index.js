const mapx = new mxsdk.Manager({
  //url:   'http://dev.mapx.localhost:8880/static.html?project=MX-HPP-OWB-3SI-3FF-Q3R&views=MX-T8GJQ-GIC8X-AHLA9&zoomToViews=true&lat=-4.087&lng=21.754&z=4.886'
  container: document.getElementById('mapx'),
  url:
    'http://dev.mapx.localhost:8880/?project=MX-HPP-OWB-3SI-3FF-Q3R&language=en'
});

mapx.on('message', (message) => {
  if (message.level === 'log') {
    console.info(`%c 🤓 ${message.text}`, 'color: #76bbf7');
  } else if (message.level === 'message') {
    console.info(`%c 😎 ${message.text}`, 'color: #70e497');
  } else if (message.level === 'warning') {
    console.info(`%c 🥴 ${message.text}`, 'color: #d09c23');
  } else if (message.level === 'error') {
    console.info(`%c 🤬 ${message.text}`, 'color: #F00');
  }
});
mapx.on('view_added', (o) => {
  console.log('view added', o);
});
mapx.on('view_closed', (o) => {
  console.log('view closed', o);
});
mapx.on('mapx_disconnected', () => {
  alert('mapx_disconnected');
});
mapx.on('project_change', (d) => {
  console.log('Project changed', d);
});
mapx.on('click_attributes', (d) => {
  console.log(`Attributes clicked part ${d.part}/${d.nPart}`);
});


