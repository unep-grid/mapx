import socialLinks from './social_link.json';
import shareMode from './share_mode.json';
import {modal} from '../mx_helper_modal';
import {el, elButtonIcon, elSpanTranslate} from '../el_mapx';
import {isStoryPlaying, getStoryId, getViewsStep} from '../story_map/index.js';
import {parseTemplate} from '../mx_helper_misc.js';
import {getViewsLayersVisibles, getViewsOpen} from '../mx_helper_map.js';
import {FlashItem} from '../icon_flash/index.js';
import {getQueryParametersAsObject} from '../mx_helper_url.js';
import './style.less';

const t = elSpanTranslate;

const state = {
  modeCurrent: 'static',
  shareString: '',
  params: {
    views: null,
    project: null,
    zoomToViews: true
  },
  form: {
    share_link_txt: '',
    share_link_select: '',
    share_views_select: '',
    share_link_static: ''
  }
};

export class ShareModal {
  constructor(opt) {
    Object.assign(state, opt);
    this.open = this.open.bind(this);
    this.destroy = this.destroy.bind(this);
    this.copy = this.copy.bind(this);
    this.update = this.update.bind(this);
    this.init();
  }

  /**
   * Initialize modal
   */
  init() {
    if (window._share_modal) {
      window._share_modal.destroy();
    }
    window._share_modal = this;
    state.modeCurrent = isStoryPlaying()
      ? 'story'
      : !!mx.settings.mode.app
      ? 'app'
      : 'static';
    this.build();
    this.update();
  }

  /**
   * Remove + clean
   */
  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._modal.close();
    delete window._share_modal;
  }

  build() {
    this._el_content = el('div');

    /*
     * TODO: use schema
     */

    /**
     * Controls
     */

    const elButtons = [
      this.elButton('btn_close', 'times', this.destroy),
      this.elButton('btn_copy', 'clipboard', this.copy),
      (this._el_button_open = this.elButton(
        'btn_open',
        'external-link',
        this.open
      ))
    ];

    /**
     * Link / Code text
     */
    this._el_input = el('textarea', {
      name: 'share_link_txt',
      id: 'share_link_txt',
      rows: 5,
      class: 'form-control'
    });
    const elLinkText = el('div', {class: 'form-group'}, [
      el('label', {for: 'share_link_txt'}, t('share_link_title')),
      el('small', {class: 'help-block'}, t('share_mode_warn')),
      this._el_input
    ]);

    /**
     * Template selection
     */
    const elLinkSelect = el('div', {class: 'form-group'}, [
      el('label', {for: 'share_link_select'}, t('share_method')),
      el(
        'select',
        {
          name: 'share_link_select',
          id: 'share_link_select',
          class: 'form-control',
          on: ['change', this.update]
        },
        socialLinks.map((s) => el('option', {value: s.id}, s.label))
      )
    ]);

    /**
     * Views selection
     */
    const sModes = shareMode
      .filter((s) => s.mode.includes(state.modeCurrent))
      .map((s) => s.id);
    this._el_views_count = el('span', {class: 'share-modal--views-count'});
    const elViewsSelect = el('div', {class: 'form-group'}, [
      el(
        'label',
        {
          for: 'share_views_select'
        },
        t('share_views_select_method'),
        this._el_views_count
      ),
      el(
        'select',
        {
          name: 'share_views_select',
          id: 'share_views_select',
          class: 'form-control',
          on: ['change', this.update]
        },
        sModes.map((idMode) => el('option', {value: idMode}, t(idMode)))
      )
    ]);

    /**
     * Static /
     */
    const elLinkStatic = el('div', {class: 'checkbox'}, [
      el('label', {for: 'share_link_static'}, [
        el('input', {
          name: 'share_link_static',
          id: 'share_link_static',
          type: 'checkbox',
          checked: true,
          on: ['change', this.update]
        }),
        el('span', t('share_mode_static_label'))
      ])
    ]);

    /**
     * Form
     */
    this._el_form = el('form', {name: 'share_link_form', id: 'test'}, [
      elLinkText,
      elLinkSelect,
      elViewsSelect,
      elLinkStatic
    ]);
    this._el_content.appendChild(this._el_form);

    /**
     * Create modal
     */
    this._modal = modal({
      id: 'share_modal',
      content: this._el_content,
      title: t('share_manager_title'),
      buttons: elButtons,
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: false
    });
  }

  /**
   * Update
   */
  update() {
    this.updateState();
    this.updateViews();
    this.updateUrl();
    this.updateState();
  }

  /**
   * Update state
   */
  updateState() {
    const formData = new FormData(this._el_form);
    for (const x in state.form) {
      state.form[x] = formData.get(x);
    }
  }

  /**
   * Update views list
   */
  updateViews() {
    const views = (state.params.views = []);
    const sMode = state.form.share_views_select;
    switch (sMode) {
      case 'share_views_select_method_story_step':
        views.push(...getViewsStep());
        break;
      case 'share_views_select_method_story_itself':
        views.push(getStoryId());
        break;
      case 'share_views_select_method_map_layer':
        views.push(...getViewsLayersVisibles(true));
        break;
      case 'share_views_select_method_map_list_open':
        views.push(...getViewsOpen());
        break;
      case 'share_views_select_method_current_url':
        views.push(...getQueryParametersAsObject().views);
        break;
    }
    const nViews = views.length;
    this._el_views_count.innerText = nViews;
    return views;
  }

  /**
   * Update  URL to share
   */
  updateUrl() {
    const url = new URL(window.location.href);

    /**
     * Update searchParams
     */
    for (const p in state.params) {
      const val = state.params[p];
      if (val) {
        url.searchParams.set(p, val);
      }
    }

    /**
     * Handle template
     */
    const text = 'Shared from MapX';
    const title = 'MapX';
    const idLinkItem = state.form.share_link_select;
    const linkItem = this.getLinkItem(idLinkItem);
    if (!linkItem) {
      console.warn(`${idLinkItem} not found`);
      return;
    }
    const disableLink = !!linkItem.disable_link;
    const disableEncode = !!linkItem.disable_encode;
    const useStatic = state.form.share_link_static === 'on';
    if (useStatic) {
      url.pathname = '/static.html';
    } else {
      url.pathname = '/';
    }
    const txt = parseTemplate(
      linkItem.template,
      {
        url,
        text,
        title
      },
      {
        encodeURIComponent: !disableEncode
      }
    );
    this.setElDisable(this._el_button_open, disableLink);
    state.shareString = txt;
    this._el_input.innerText = txt;
    return txt;
  }

  /**
   * Helpers
   */

  /**
   * Disable/enable el
   */
  setElDisable(target, disable) {
    if (disable) {
      target.setAttribute('disabled', true);
    } else {
      target.removeAttribute('disabled');
    }
  }

  /**
   * Get link item
   * @param {String} id Link id
   */
  getLinkItem(id) {
    return socialLinks.find((s) => s.id === id);
  }

  /**
   * Follow social link
   */
  open() {
    window.open(this._el_input.value);
  }

  /**
   * Copy current url
   */
  copy() {
    const elTemp = el('input', {type: 'text'});
    elTemp.value = state.shareString;
    elTemp.select();
    //debugger;
    //elTemp.setSelectRange(0, 1e6);
    navigator.clipboard.writeText(elTemp.value);
    new FlashItem('clipboard');
  }

  /**
   * Simple button
   */
  elButton(key, icon, action) {
    return elButtonIcon(key, {
      icon: `fa-${icon}`,
      mode: 'text_icon',
      config: {
        on: {click: action}
      }
    });
  }
}
