const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: 'http://dev.mapx.localhost:8880'
});
const elSelect = document.getElementById('selLoc');

elSelect.addEventListener('change', updateLocation);

async function updateLocation() {
  const code = elSelect.value;

  if (code === 'default') {
    return;
  }
  try {
    await mapx.ask('common_loc_fit_bbox', {
      code
    });
  } catch (e) {
    console.warn(e);
  }
}

mapx.on('ready', async () => {
  const locs = await mapx.ask('common_loc_get_table_codes');
  locs.unshift({code: 'default', name: 'Choose...'});
  const elFrag = document.createDocumentFragment();
  for (const l of locs) {
    const elOpt = document.createElement('option');
    elOpt.value = l.code;
    elOpt.innerText = l.name;
    elFrag.appendChild(elOpt);
  }
  elSelect.replaceChildren(elFrag);
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

