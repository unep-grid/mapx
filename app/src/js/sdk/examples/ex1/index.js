const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url:'http://dev.mapx.localhost:8880'
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
  console.log("Project changed", d);
});
