const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: {
    host: 'dev.mapx.localhost',
    port: 8880
  },
  static: true,
  verbose : true,
  params: {
    views: ['MX-0ISDC-GCFBK-VZ0F9', 'MX-T7PXA-39GK2-QIH5T'],
    zoomToViews: true,
    closePanels: true
  }
});

mapx.on('ready', main);

const elSelect = document.getElementById('selLoc');
elSelect.addEventListener('change', updateLocation);


async function main() {
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
}
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
