import socialLinks from './social_link.json';
import shareMode from './share_mode.json';
import {modal} from '../mx_helper_modal';
import {EventSimple} from '../event_simple/index.js';
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
import {isArrayOfViewsId} from '../is_test/index.js';
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

export class ShareModal extends EventSimple {
  constructor(opt) {
    super();
    const sm = this;
    sm.openLink = sm.openLink.bind(sm);
    sm.close = sm.close.bind(sm);
    sm.copy = sm.copy.bind(sm);
    sm.update = sm.update.bind(sm);
    sm.init(opt);
  }

  /**
   * Initialize modal
   */
  init(opt) {
    const sm = this;
    if (window._share_modal) {
      window._share_modal.reset();
      return;
      //window._share_modal.close();
    }
    window._share_modal = sm;
    sm._init_state(opt);
    sm._validate_opt();
    sm._init_modal();
    sm.reset();
    sm.fire('init');
  }

  _init_state(opt) {
    const sm = this;
    sm._state = {
      opt: {
        views: []
      },
      url: null,
      modeCurrent: 'static',
      shareString: '',
      mapPosItems: ['p', 'b', 'z', 'lat', 'lng', 't3d', 'sat'],
      prevent: new Set(),
      views: [],
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
        share_filter_activated: null
        //share_views_open: null
      }
    };
    Object.assign(sm._state.opt, opt);
  }

  reset() {
    const sm = this;
    sm.build();
    sm.update();
    sm.fire('reset');
  }

  /**
   * Remove + clean
   */
  close() {
    const sm = this;
    if (sm._closed) {
      return;
    }
    sm._closed = true;
    sm._modal.close();
    sm.fire('closed');
    sm.destroy();
    delete window._share_modal;
  }

  /**
   * Update
   */
  update() {
    const sm = this;
    clearTimeout(sm._update_timeout);
    sm._update_timeout = setTimeout(() => {
      sm._state.prevent.clear();
      sm._update_state_form();
      sm._update_views();
      sm._update_url();
      sm._update_template();
      sm.validate();
      sm._update_options_visibility();
      sm.fire('updated');
    }, 10);
  }

  /**
   * Validate options
   */

  _validate_opt() {
    const sm = this;
    const views = sm._get_views_opt();
    const msgs = [];
    if (views.length > 0) {
      if (!isArrayOfViewsId(views)) {
        msgs.push({
          type: 'error',
          key: 'share_msg_invalid_views'
        });
      }
    }
    if (msgs.length > 0) {
      throw new Error(`Invalid option ${JSON.stringify(msgs)}`);
    }
  }
  /**
   * Update state with form values
   */
  _update_state_form() {
    const sm = this;
    const formData = new FormData(sm._el_form);
    for (const k in sm._state.form) {
      sm._state.form[k] = formData.get(k) || false;
    }
  }

  /**
   * Get views set in option at init time
   */
  _get_views_opt() {
    const sm = this;
    return sm._state?.opt?.views || [];
  }

  /**
   * Update views list
   */
  _update_views() {
    const sm = this;
    const state = sm._state;
    const sMode = state.form.share_views_select;
    state.views.length = 0;
    switch (sMode) {
      case 'share_views_select_method_preselect':
        state.views.push(...sm._get_views_opt());
        break;
      case 'share_views_select_method_story_step':
        state.views.push(...(getViewsStep() || []));
        break;
      case 'share_views_select_method_story_itself':
        state.views.push(getStoryId());
        break;
      case 'share_views_select_method_map_list_open':
        state.views.push(...(getViewsOpen() || []));
        break;
      case 'share_views_select_method_current_url':
        const p = getQueryParametersAsObject();
        const vFilter = p.views || p.idViews || [];
        vFilter.push(...(p.viewsOpen || p.idViewsOpen || []));
        state.views.push(...vFilter);
        break;
      /**
       * Disabled handler
       */
      case 'share_views_select_method_all':
        break;
      case 'share_views_select_method_map_layer':
        state.views.push(...(getViewsLayersVisibles(true) || []));
        break;
    }
    return state.views;
  }

  /**
   * Check if views list contains a story
   */
  hasTargetStory() {
    const sm = this;
    const f = sm._state.form;
    const idViews = sm._state.views;
    const useStatic = !!f.share_mode_static;
    const modeTargetStory =
      f.share_views_select === 'share_views_select_method_story_itself';
    const storyInViews = getViews({idView: idViews}).reduce(
      (a, c) => a || c.type === 'sm',
      false
    );
    return modeTargetStory || (useStatic && storyInViews);
  }

  /**
   * Validate message
   */
  validate() {
    const sm = this;
    const state = sm._state;
    const msgs = [];
    const idViews = state.views;
    const useStatic = !!state.form.share_mode_static;
    const useMapPos = !!state.form.share_map_pos;
    const count = idViews.length;
    const targetStory = sm.hasTargetStory();
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
      if (targetStory) {
        msgs.push({
          type: 'warning',
          key: 'share_msg_multiple_views_story_static'
        });
      }
    }
    if (count === 0) {
      if (useStatic && !useMapPos) {
        state.prevent.add('copy');
        state.prevent.add('open');
        msgs.push({
          type: 'danger',
          key: 'share_msg_views_count_empty_static'
        });
      } else if (useStatic) {
        msgs.push({
          type: 'warning',
          key: 'share_msg_views_count_empty_static_map_pos'
        });
      } else {
        msgs.push({
          type: 'warning',
          key: 'share_msg_views_count_empty_full_project'
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
    const elMsgContainer = sm._el_msg_container;
    while (elMsgContainer.firstElementChild) {
      elMsgContainer.firstElementChild.remove();
    }
    for (const msg of msgs) {
      const elMsg = elAlert(msg.key, msg.type, msg.data);
      elMsgContainer.appendChild(elMsg);
    }
  }

  _update_options_visibility() {
    const sm = this;
    const state = sm._state;
    const f = state.form;
    const hasViews = state.views.length > 0;
    const linkStatic = f.share_mode_static;
    const targetStory = sm.hasTargetStory();
    sm.allowBtnOpen(!state.prevent.has('open'));
    sm.allowBtnCopy(!state.prevent.has('copy'));
    sm.setClassDisable(sm._el_checkbox_category_hide, linkStatic);
    sm.setClassDisable(sm._el_checkbox_map_pos, targetStory);
    sm.setClassDisable(
      sm._el_checkbox_zoom,
      targetStory || !hasViews || !linkStatic
    );
  }

  /**
   * Update  URL to share
   */

  _update_url() {
    const sm = this;
    const state = sm._state;
    const url = new URL(window.origin);
    const hasViews = state.views.length > 0;
    const f = state.form;
    const targetStory =
      f.share_views_select === 'share_views_select_method_story_itself';

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
    url.pathname = f.share_mode_static ? '/static.html' : '/';

    /**
     * Options
     */
    url.searchParams.set('language', mx.settings.language);
    if (f.share_mode_static) {
      if (hasViews) {
        url.searchParams.set('views', state.views);
        if (!targetStory) {
          url.searchParams.set('zoomToViews', !!f.share_views_zoom);
        }
      }
    } else {
      url.searchParams.set('project', mx.settings.project.id);
      url.searchParams.set('viewsListFlatMode', f.share_category_hide);
      if (hasViews) {
        url.searchParams.set('viewsOpen', state.views);
        url.searchParams.set('viewsListFilterActivated', true);
      }
    }

    /**
     * Map position
     */
    let pos;
    if (f.share_map_pos && !targetStory) {
      for (const i of state.mapPosItems) {
        if (!pos) {
          pos = getMapPos();
        }
        url.searchParams.set(i, pos[i]);
      }
    }
    /**
     * Update url
     */

    this.url = url;
  }

  _update_template() {
    const sm = this;
    const state = sm._state;
    /**
     * Handle template
     */
    const url = sm.url;
    const f = state.form;
    const idLinkItem = f.share_template;
    const useStatic = f.share_mode_static;
    const linkItem = sm.getLinkItem(idLinkItem);
    const disableLinkApp = linkItem.disable_link_app && !useStatic;
    const disableLink = linkItem.disable_link;
    const disableEncode = !!linkItem.disable_encode;
    const disableCopy = linkItem.disable_copy;
    // TODO: convert those as input.
    const text = 'Shared from MapX';
    const title = 'MapX';
    // replace values in template, if avaialble.
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

    // Set share string in state and form
    state.shareString = txt;
    sm._el_input.value = txt;
    if (disableLink || disableLinkApp) {
      state.prevent.add('open');
    }
    if (disableCopy) {
      state.prevent.add('copy');
    }
    return txt;
  }

  /**
   * get share string
   */
  getShareString() {
    const sm = this;
    return sm._state.shareString;
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
  openLink() {
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
    const sm = this;
    const elTemp = el('input', {type: 'text'});
    elTemp.value = sm._state.shareString;
    elTemp.select();
    navigator.clipboard.writeText(elTemp.value);
    new FlashItem('clipboard');
    sm.fire('copied');
  }

  /**
   * Build form
   */
  _init_modal() {
    const sm = this;
    if (sm._modal) {
      sm._modal.close();
    }
    sm._el_content = el('div');

    /**
     * Modal buttons
     */
    sm._el_button_close = elButtonFa('btn_close', {
      icon: 'times',
      action: sm.close
    });
    sm._el_button_help = elButtonFa('btn_help', {
      icon: 'question-circle',
      action: sm.openHelp
    });
    sm._el_button_copy = elButtonFa('btn_copy', {
      icon: 'clipboard',
      action: sm.copy
    });
    sm._el_button_open = elButtonFa('btn_share', {
      icon: 'external-link',
      action: sm.openLink
    });

    const elModalButtons = [
      sm._el_button_close,
      sm._el_button_help,
      sm._el_button_copy,
      sm._el_button_open
    ];

    /**
     * Create modal
     */
    sm._modal = modal({
      id: 'share_modal',
      content: sm._el_content,
      title: t('share_manager_title'),
      buttons: elModalButtons,
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: false,
      onClose: sm.close
    });
  }

  /**
   * Set current mode: story, static or app
   */
  _update_mode_current() {
    const sm = this;
    const sViews = sm._get_views_opt();
    sm._state.modeCurrent =
      sViews.length > 0
        ? 'preselect'
        : isStoryPlaying()
        ? 'story'
        : !!mx.settings.mode.app
        ? 'app'
        : 'static';
  }

  build() {
    const sm = this;
    const state = sm._state;
    sm._update_mode_current();

    /**
     * Link / Code text
     */
    sm._el_input = el('textarea', {
      name: 'share_code',
      id: 'share_code',
      rows: 4,
      class: ['form-control', 'share--code']
    });

    sm._el_group_input = el('div', {class: 'form-group'}, [
      el(
        'label',
        {class: 'share--label-group', for: 'share_code'},
        t('share_form_title')
      ),
      el('small', {class: ['help-block', 'text-muted']}, t('share_mode_warn')),
      sm._el_input
    ]);

    /**
     * Validation messages
     */
    sm._el_container_validation = sm._el_msg_container = el('div');

    /**
     * Template selection
     */
    sm._el_select_template = elSelect('share_template', {
      items: socialLinks.map((s) => el('option', {value: s.id}, s.label))
    });

    /**
     * Views selection
     */
    const sModes = shareMode
      .filter((s) => s.mode.includes(state.modeCurrent))
      .map((s) => s.id);

    sm._el_select_mode = elSelect('share_views_select', {
      items: sModes.map((idMode) => el('option', {value: idMode}, t(idMode)))
    });

    /**
     * Checkboxes
     */
    // mode app
    sm._el_checkbox_category_hide = elCheckbox('share_category_hide', {
      checked: false
    });
    // all modes
    sm._el_checkbox_static = elCheckbox('share_mode_static', {checked: true});
    sm._el_checkbox_zoom = elCheckbox('share_views_zoom', {checked: true});
    sm._el_checkbox_map_pos = elCheckbox('share_map_pos', {checked: true});

    /**
     * Settings
     */
    sm._el_group_options = elDetails(
      'share_options',
      el(
        'div',
        {class: 'well', style: {maxHeight: '300px', overflowY: 'auto'}},
        [
          sm._el_checkbox_static,
          sm._el_checkbox_map_pos,
          sm._el_checkbox_zoom,
          sm._el_checkbox_category_hide
        ]
      )
    );

    /**
     * Form
     */
    sm._el_form = el(
      'form',
      {name: 'share_form', id: 'test', on: ['change', sm.update]},
      [
        sm._el_group_input,
        sm._el_select_template,
        sm._el_select_mode,
        sm._el_group_options,
        sm._el_container_validation
      ]
    );

    while (sm._el_content.firstElementChild) {
      sm._el_content.firstElementChild.remove();
    }

    sm._el_content.appendChild(sm._el_form);
    sm.fire('built');
  }
}
