import {modal} from './../mx_helper_modal.js';
import {TextFilter} from './../text_filter_simple';
import {el} from './../el/src';

const urlRemote =
  'https://raw.githubusercontent.com/unep-grid/map-x-mgl/master/CHANGELOG.md';

export async function changeLogHtml(remote) {
  let txt;
  const {marked} = await import('marked');
  if (remote) {
    const res = await fetch(urlRemote);
    txt = await res.text();
  } else {
    txt = await import('../../../../CHANGELOG.md');
  }

  /**
   * TODO: sanitized output
   */
  return marked(txt, {gfm: true, smartLists: true});
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
