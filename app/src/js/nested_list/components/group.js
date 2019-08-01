import {NestedList} from '../index.js';

class Group {
  constructor(opt, li) {
    if (!(li instanceof NestedList)) {
      throw new Error('NestedList instance not valid');
    }
    let group = this;
    group.opt = opt;
    group.li = li;
    group.id = opt.id || li.randomId();
    group.build();
  }

  build() {
    let group = this;
    let li = group.li;
    let language = li.getLanguage();
    let languageDefault = li.getLanguageDefault();
    let opt = group.opt;
    let hasItem = li.isItem(opt.content);
    let cl = [li.opt.class.base, li.opt.class.draggable, li.opt.class.group];
    opt.collapsed = li.asBoolean(opt.collapsed);
    opt.invisible = li.asBoolean(opt.invisible);
    if (opt.collapsed) {
      cl.push(li.opt.class.groupCollapsed);
    }
    if(opt.invisible){
       cl.push(li.opt.class.groupInvisible);
    }

    opt.title = li.validateGroupTitleObject(opt.title);
    opt.color = li.validateColor(opt.color);
    opt.date = opt.date || Date.now() ;

    group.el = li.el('div', {
      id: group.id,
      draggable: true,
      class: cl,
      style: {
        borderColor: opt.color
      },
      dataset: {
        li_date : opt.date,
        li_color: opt.color,
        li_title: JSON.stringify(opt.title),
        li_id_action: 'li_group_toggle',
        li_event_type: 'click'
      }
    });

    group.elHeader = li.el(
      'div',
      {
        class: li.opt.class.groupHeader
      },
      li.el('span', {
        class: [li.opt.class.arrowBottom, li.opt.class.groupCaret]
      }),
      li.el(
        'span',
        {
          class: li.opt.class.groupTitle
        },
        opt.title[language] || opt.title[languageDefault]
      ),
      li.el(
        'div',
        {
          class: li.opt.class.groupLabel
        }
      )
    );

    group.el.appendChild(group.elHeader);

    if (hasItem) {
      group.el.appendChild(opt.content);
    }
   /**
   * Save instance in el ? mmh... why not.
   */
   group.el._instance = group;
  }
}

export {Group};
