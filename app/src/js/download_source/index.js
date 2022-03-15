import {modal} from './../mx_helper_modal';
import {SelectAuto} from '../select_auto';
import {buildForm} from './form.js';
import {fetchSourceMetadata} from './../mx_helper_map_view_metadata';
import {el, elSpanTranslate} from './../el_mapx';
import {getLanguageItem} from './../mx_helper_language';
import {settings} from './../settings';

const options = {
  idSource: null,
  idSocket: null,
  email: null,
  format: 'GPKG',
  srid: 4326,
  filename: null,
  iso3codes: [],
  language: 'en'
};

export class ModalDownloadSource {
  constructor(opt) {
    const me = this;
    me.init(opt).catch(console.error);
    me.destroy = me.destroy.bind(me);
  }

  async init(opt) {
    const me = this;
    me._opt = Object.assign({}, options, opt);
    try {
      me._destroy_store = [];
      const meta = await fetchSourceMetadata(me._opt.idSource);
      const isDownloadable = !!meta?._services?.includes('mx_download');
      if (!isDownloadable) {
        return await me.buildNotAllowed();
      }
      if (!opt.language) {
        me._opt.language = settings.language;
      }

      if (!opt.filename) {
        me._opt.filename = getLanguageItem(
          meta?.text?.title || {},
          me._opt.language
        );
      }

      await me.build();
    } catch (e) {
      console.error(e);
    }
  }

  destroy() {
    const me = this;
    if (me._destroyed) {
      return;
    }
    me._destroyed = true;
    for (const d of me._destroy_store) {
      if (d.destroy) {
        d.destroy();
      }
    }
    me._modal.close();
  }

  async buildNotAllowed() {
    me._modal = modal({
      title: elSpanTranslate('dl_title_not_allowed'),
      content: el('div', elSpanTranslate('dl_title_not_allowed')),
      onClose: me.destroy,
      addSelectize: false,
      noShinyBinding: true
    });
  }

  async build() {
    const me = this;
    const {elForm, elFormEpsg, elFormFormat, elFormCountries} = buildForm(
      me._opt
    );

    me._modal = modal({
      title: elSpanTranslate('dl_title'),
      content: elForm,
      onClose: me.destroy,
      addSelectize: false,
      noShinyBinding: true
    });

    /**
     * Build drop down select
     */
    const selectEpsg = new SelectAuto(elFormEpsg);
    const selectFormat = new SelectAuto(elFormFormat);
    const selectCountries = new SelectAuto(elFormCountries);
    me._destroy_store.push(selectEpsg);
    me._destroy_store.push(selectFormat);
    me._destroy_store.push(selectCountries);
  }
}
