import {modal} from './../mx_helper_modal.js';
import {TextFilter} from './../text_filter_simple';
import {el} from './../el/src';

const urlRemote =
  'https://raw.githubusercontent.com/unep-grid/map-x-mgl/main/CHANGELOG.md';

export async function changeLogHtml(remote) {
  let txt;
  const showdown = await import('showdown');
  if (remote) {
    const res = await fetch(urlRemote);
    txt = await res.text();
  }
  if (!txt) {
    txt = await import('../../../../CHANGELOG.md');
  }
  const converter = new showdown.Converter();
  const html = converter.makeHtml(txt);
  return html;
}

export async function modalChangelog(remote) {
  const elLog = await changeLogHtml(remote);
  const elContainer = el('div');
  const textFilter = new TextFilter({
    elContent: elLog,
    elContainer: elContainer
  });
  modal({
    title: 'Changelog',
    content: elContainer,
    onClose: () => {
      textFilter.destroy();
    }
  });
}
