import {el} from '@fxi/el';
import {elSpanTranslate} from './../el_mapx';
import {modal, modalPrompt} from './../mx_helper_modal';
import {isUrl} from './../is_test/index.js';
import {mirrorUrlCreate} from './index.js';
//const urlDummy = 'http://tile.openstreetmap.org/${z}/${x}/${y}.png';
const urlDummy ='https://app.staging.mapx.org/sprites/sprite.png';

export async function modalMirror() {
  try {
    const url = await modalPrompt({
      title: elSpanTranslate('tool_mirror_title'),
      label: elSpanTranslate('tool_mirror_enter_url'),
      confirm: elSpanTranslate('tool_mirror_btn_create'),
      inputOptions: {
        type: 'text',
        value: urlDummy
      },
      onInput: (url, elBtnConfirm) => {
        const valid = isUrl(url);
        if (valid) {
          elBtnConfirm.disabled = false;
          elBtnConfirm.classList.remove('disabled');
        } else {
          elBtnConfirm.disabled = true;
          elBtnConfirm.classList.add('disabled');
        }
      }
    });
    if(!url){
       return;
    }

    const urlMirror = mirrorUrlCreate(url);

    const elRes = el(
      'div',
      {style: {display: 'flex', flexDirection: 'column'}},
      el('label', elSpanTranslate('tool_mirror_res_url')),
      el(
        'textarea',
        {style: {fontFamily: 'monospace', padding: '10px'}},
        urlMirror
      ),
      el('a', {href: urlMirror, target: '_blank'}, 'Test link'),
      el(
        'small',
        elSpanTranslate('tool_mirror_res_warn'),
      )
    );

    modal({
      title: elSpanTranslate('tool_mirror_title'),
      content: elRes,
      addBackground: true
    });
  } catch (e) {
    console.warn(e);
  }
}
