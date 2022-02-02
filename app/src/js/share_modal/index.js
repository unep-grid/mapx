import socialLinks from './social_link.json';
import shareMode from './share_mode.json';
import {modal} from '../mx_helper_modal';
import {
  el,
  elButtonFa,
  elSpanTranslate,
  elCheckbox,
  elSelect,
  elDetails,
  elAlert
} from '../el_mapx';
import {isStoryPlaying, getStoryId, getViewsStep} from '../story_map/index.js';
import {parseTemplate} from '../mx_helper_misc.js';
import {
  getViews,
  getViewsLayersVisibles,
  getViewsOpen,
  getMapPos
} from '../mx_helper_map.js';
import {FlashItem} from '../icon_flash/index.js';
import {getQueryParametersAsObject} from '../mx_helper_url.js';
import './style.less';

const t = elSpanTranslate;

const state = {
  modeCurrent: 'static',
  shareString: '',
  mapPosItems: ['p', 'b', 'z', 'lat', 'lng'],
  params: {
    views: null,
    project: null
  },
  /** note : unchecked checkbox are not included in formData.-
   * -> using keys of this object in loop is required to
   *    get all values during update..
   **/
  form: {
    share_code: null,
    share_template: null,
    share_views_select: null,
    share_views_zoom: null,
    share_map_pos: null,
    share_mode_static: null,
    share_category_hide: null,
    share_filter_activated: null,
    share_views_open: null
  }
};

export class ShareModal {
  constructor(opt) {
    const sm = this;
    Object.assign(state, opt);
    sm.open = sm.open.bind(sm);
    sm.destroy = sm.destroy.bind(sm);
    sm.copy = sm.copy.bind(sm);
    sm.update = sm.update.bind(sm);
    sm.init();
  }

  /**
   * Initialize modal
   */
  init() {
    const sm = this;
    if (window._share_modal) {
      window._share_modal.destroy();
    }
    window._share_modal = sm;
    state.modeCurrent = isStoryPlaying()
      ? 'story'
      : !!mx.settings.mode.app
      ? 'app'
      : 'static';
    sm.build();
    sm.update();
    sm._state = state;
  }

  /**
   * Remove + clean
   */
  destroy() {
    const sm = this;
    if (sm._destroyed) {
      return;
    }
    sm._destroyed = true;
    sm._modal.close();
    delete window._share_modal;
  }

  /**
   * Update
   */
  update() {
    const sm = this;
    // Inital state form update according to settings
    sm._update_state_form();
    // Update views selection based on settings
    sm._update_views();
    // Rebuild final URL
    sm._update_url();
    // re save state after url update
    sm._update_state_form();
    // validation
    sm.validate();
  }

  /**
   * Update state
   */
  _update_state_form() {
    const sm = this;
    const formData = new FormData(sm._el_form);
    for (const k in state.form) {
      state.form[k] = formData.get(k) || false;
    }
  }

  /**
   * Update views list
   */
  _update_views() {
    const views = (state.params.views = []);
    const sMode = state.form.share_views_select;
    switch (sMode) {
      case 'share_views_select_method_all':
        // Disabled 
        break;
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
    return views;
  }

  /**
   * Validate message
   */

  validate() {
    const sm = this;
    const msgs = [];
    const idViews = state.params.views;
    const useStatic = !!state.form.share_mode_static;
    const count = idViews.length;
    const hasStory = getViews({idView: idViews}).reduce(
      (a, c) => a || c.type === 'sm',
      false
    );
    const langData = {data: {n: count}};

    if (count === 1) {
      msgs.push({
        type: 'info',
        key: 'share_msg_views_count_single',
        data: langData
      });
    }
    if (count > 1) {
      msgs.push({
        type: 'info',
        key: 'share_msg_views_count_multiple',
        data: langData
      });
      if (hasStory && useStatic) {
        msgs.push({
          type: 'warning',
          key: 'share_msg_multiple_views_story_static'
        });
      }
    }
    if (count === 0) {
      if (useStatic) {
        msgs.push({
          type: 'danger',
          key: 'share_msg_views_count_empty_static'
        });
      } else {
        msgs.push({
          type: 'warning',
          key: 'share_msg_views_count_empty'
        });
      }
    }
    sm._validate_messages(msgs);
    return msgs;
  }

  /**
   * Display validation messages
   */

  _validate_messages(msgs) {
    const sm = this;
    let hasError = false;
    const elMsgContainer = sm._el_msg_container;
    while (elMsgContainer.firstElementChild) {
      elMsgContainer.firstElementChild.remove();
    }
    for (const msg of msgs) {
      const elMsg = elAlert(msg.key, msg.type, msg.data);
      if (msg.type === 'danger') {
        hasError = true;
      }
      elMsgContainer.appendChild(elMsg);
    }

    sm.allowBtnOpen(!hasError);
    sm.allowBtnCopy(!hasError);
  }

  /**
   * Update  URL to share
   */
  _update_url() {
    const sm = this;
    const url = new URL(window.location.href);

    /**
     * Update base searchParams ( views, project )
     */
    for (const p in state.params) {
      const val = state.params[p];
      if (val) {
        url.searchParams.set(p, val);
      }
    }

    /**
     * Mode Static
     */
    const f = state.form;
    url.pathname = f.share_mode_static ? '/static.html' : '/';

    /**
     * Zoom to views after initial pos
     */
    url.searchParams.set('zoomToViews', !!f.share_views_zoom);

    /**
     * App options
     */
    if (f.share_mode_static) {
      // Skip app options, disable group 
      sm.setClassDisable(sm._el_settings_app,true);
    } else {
      // Handle app options
      sm.setClassDisable(sm._el_settings_app,false);
      url.searchParams.set('viewsListFlatMode', f.share_category_hide);
      if (f.share_views_open) {
        url.searchParams.set('viewsOpen', state.params.views);
      } else {
        url.searchParams.set('views', state.params.views);
      }
    }

    /**
     * Map position
     */
    let pos;
    for (const i of state.mapPosItems) {
      if (f.share_map_pos) {
        if (!pos) {
          pos = getMapPos();
        }
        url.searchParams.set(i, pos[i]);
      }
    }

    /**
     * Handle template
     */
    const text = 'Shared from MapX';
    const title = 'MapX';
    const idLinkItem = state.form.share_template;
    const linkItem = sm.getLinkItem(idLinkItem);
    const disableLink = !!linkItem.disable_link;
    const disableEncode = !!linkItem.disable_encode;
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
    sm.allowBtnOpen(!disableLink);
    state.shareString = txt;
    sm._el_input.innerText = txt;
    return txt;
  }

  /**
   * Helpers
   */

  /**
   * Disable/enable buttons / el
   */
  setAttrDisable(target, disable) {
    if (disable) {
      target.setAttribute('disabled', true);
    } else {
      target.removeAttribute('disabled');
    }
  }
  allowBtnOpen(enable) {
    const sm = this;
    sm.setAttrDisable(sm._el_button_open, !enable);
  }
  allowBtnCopy(enable) {
    const sm = this;
    sm.setAttrDisable(sm._el_button_copy, !enable);
  }
  setClassDisable(target, disable) {
    if (disable) {
      target.classList.add('share--disabled');
    } else {
      target.classList.remove('share--disabled');
    }
  }

  /**
   * Get link item
   * @param {String} id Link id
   */
  getLinkItem(id) {
    const item = socialLinks.find((s) => s.id === id);
    if (!item) {
      return socialLinks[0];
    }
    return item;
  }

  /**
   * Follow social link
   */
  open() {
    const sm = this;
    window.open(sm._el_input.value, '_blank');
  }

  /**
   * Open sharing manager wiki
   */
  openHelp() {
    const wLink = new URL(mx.settings.links.repositoryWikiSharingManager);
    window.open(wLink, '_blank');
  }

  /**
   * Copy current url
   */
  copy() {
    const elTemp = el('input', {type: 'text'});
    elTemp.value = state.shareString;
    elTemp.select();
    navigator.clipboard.writeText(elTemp.value);
    new FlashItem('clipboard');
  }

  /**
   * Build form
   */
  build() {
    const sm = this;
    sm._el_content = el('div');

    /**
     * Controls
     */
    const elButtons = [
      elButtonFa('btn_close', {
        icon: 'times',
        action: sm.destroy
      }),
      (sm._el_button_copy = elButtonFa('btn_copy', {
        icon: 'clipboard',
        action: sm.copy
      })),
      (sm._el_button_open = elButtonFa('btn_open', {
        icon: 'external-link',
        action: sm.open
      }))
    ];

    /**
     * Link / Code text
     */
    sm._el_input = el('textarea', {
      name: 'share_code',
      id: 'share_code',
      rows: 5,
      class: 'form-control'
    });
    const elBtnHelp = el('i', {
      class: ['fa', 'fa-question-circle', 'mx-pointer'],
      on: ['click', sm.openHelp]
    });
    const elFormCode = el('div', {class: 'form-group'}, [
      el(
        'label',
        {class: 'share--label-group', for: 'share_code'},
        t('share_form_title'),
        elBtnHelp
      ),
      el('small', {class: ['help-block', 'text-muted']}, t('share_mode_warn')),
      sm._el_input
    ]);

    /**
     * Validation messages
     */
    const elFormValidation = (sm._el_msg_container = el('div'));

    /**
     * Template selection
     */
    const elSelectTemplate = elSelect('share_template', {
      items: socialLinks.map((s) => el('option', {value: s.id}, s.label))
    });

    /**
     * Views selection
     */
    const sModes = shareMode
      .filter((s) => s.mode.includes(state.modeCurrent))
      .map((s) => s.id);
    const elSelectViewsGroup = elSelect('share_views_select', {
      items: sModes.map((idMode) => el('option', {value: idMode}, t(idMode)))
    });

    /**
     * Checkboxes
     */
    // mode app
    sm._el_settings_app = el('div', [
      elCheckbox('share_category_hide', {checked: false}),
      elCheckbox('share_filter_activated', {checked: false}),
      elCheckbox('share_views_open', {checked: false})
    ]);
    // all modes
    const elCheckboxStatic = elCheckbox('share_mode_static', {checked: true});
    const elCheckboxZoomViews = elCheckbox('share_views_zoom', {checked: true});
    const elCheckboxMapPos = elCheckbox('share_map_pos', {checked: true});

    /**
     * Settings
     */
    const elFormOptions = elDetails(
      'share_options',
      el(
        'div',
        {class: 'well', style: {maxHeight: '300px', overflowY: 'auto'}},
        [
          elSelectTemplate,
          elSelectViewsGroup,
          elCheckboxZoomViews,
          elCheckboxMapPos,
          elCheckboxStatic,
          sm._el_settings_app
        ]
      )
    );

    /**
     * Form
     */
    sm._el_form = el(
      'form',
      {name: 'share_form', id: 'test', on: ['change', sm.update]},
      [elFormCode, elFormOptions, elFormValidation]
    );
    sm._el_content.appendChild(sm._el_form);

    /**
     * Create modal
     */
    sm._modal = modal({
      id: 'share_modal',
      content: sm._el_content,
      title: t('share_manager_title'),
      buttons: elButtons,
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: false
    });
  }
}
