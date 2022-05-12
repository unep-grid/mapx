import {elSpanTranslate} from './el_mapx';
import {cleanDiacritic} from './string_util/';
import {el} from './el_mapx';
import {path} from './mx_helper_misc.js';
import {requestProjectMembership, setProject} from './map_helpers/index.js';
import {getDictItem} from './language';

export async function renderUserProjectsList(o) {

  var elDest, elContainer, elProjects, elSearchInput, elsRows;
  var cnt = 0;
  var dat = o.projects;
  var idCol = o.idCol || dat.id ? 'id' : 'project';
  var nRow = dat[idCol].length;
  var titles = Object.keys(dat);
  var nCol = titles.length;
  var userIsGuest = path(mx, 'settings.user.guest') === true;

  /* render */

  await render();

  /**
   * Helpers
   */

  function wait() {
    window.setTimeout(render, 1);
  }

  async function render() {
    elDest = document.getElementById(o.idList);
    if (cnt++ < 5) {
      if (elDest) {
        await build();
        addToDest();
      } else {
        wait();
      }
    }
  }

  /**
   * Final step: add to destination el
   */

  function addToDest() {
    elDest.appendChild(elContainer);
  }

  /**
   * Main build function
   */
  async function build() {
    elContainer = el(
      'div',
      {
        class: 'mx-list-projects-container'
      },
      (elSearchInput = el('input', {
        class: 'mx-list-projects-search'
      })),
      (elProjects = el(
        'div',
        {
          class: 'mx-list-projects'
        },
        (elsRows = [el('div')])
      ))
    );

    await buildSearch();
    buildRows();
    listen();
  }

  /**
   * Clean remove listener
   */
  function detach() {
    mx.listeners.removeListenerByGroup('project_list');
  }

  /**
   * Enable listener
   */
  function listen() {
    detach();
    mx.listeners.addListener({
      target: elSearchInput,
      bind: elSearchInput,
      type: 'keyup',
      idGroup: 'project_list',
      callback: filterList,
      debounce: true,
      debounceTime: 100
    });
    mx.listeners.addListener({
      target: elProjects,
      bind: elProjects,
      type: ['click', 'keydown'],
      idGroup: 'project_list',
      callback: handleClick,
      debounce: true,
      debounceTime: 100
    });
  }

  /**
   * Handle click
   */
  function handleClick(e) {
    const el = e.target;
    const ds = el.dataset;
    if (e.type === 'keydown' && e.key !== 'Enter') {
      return;
    }

    const actions = {
      request_membership: () => {
        if (ds.allow_join === 'true' && !userIsGuest) {
          requestProjectMembership(ds.request_membership)
        }
      },
      load_project: () => {
        setProject(ds.load_project, {
          onSuccess: detach
        });
      }
    };

    Object.keys(actions).forEach((a) => {
      if (ds[a]) {
        actions[a]();
      }
    });
  }

  /**
   * Update list
   */
  function filterList(e) {
    var elTarget = e.target;
    var elRow, textSearch, textRow;
    var i, iL;
    if (elTarget && elTarget.dataset.project_search) {
      textSearch = cleanString(elTarget.value);
      for (i = 0, iL = elsRows.length; i < iL; i++) {
        elRow = elsRows[i];
        if (elRow.dataset && elRow.dataset.text) {
          textRow = elRow.dataset.text;
          if (textRow.match(textSearch)) {
            elRow.style.display = 'block';
          } else {
            elRow.style.display = 'none';
          }
        }
      }
    }
  }

  /**
   * Build rows
   */
  function buildRows() {
    for (let i = 0, iL = nRow; i < iL; i++) {
      const row = {};
      for (let j = 0, jL = nCol; j < jL; j++) {
        row[titles[j]] = dat[titles[j]][i];
      }
      if (row.id !== mx.settings.project.id) {
        const elRow = buildRow(row);
        elsRows.push(elRow);
        elProjects.appendChild(elRow);
      }
    }
  }

  /**
   * Simple search tool
   */
  async function buildSearch() {
    elSearchInput.dataset.project_search = true;
    elSearchInput.placeholder = await getDictItem('project_search_values');
  }

  /**
   * clean strings
   */
  function cleanString(str) {
    return cleanDiacritic(str.toLowerCase());
  }

  function buildRow(row) {
    /*
     * Create content
     */
    let elRowBadges;
    let elRow = el(
      'div',
      {
        class: 'mx-list-projects-row',
        tabindex: 0,
        dataset: {
          text: cleanString(row.description + ' ' + row.title),
          load_project: row[idCol]
        }
      },
      el(
        'div',
        {
          class: 'mx-list-projects-top'
        },
        el(
          'h4',
          {
            class: 'mx-list-projects-title'
          },
          row.title
        ),
        (elRowBadges = el('div', {
          class: 'mx-list-project-opt'
        }))
      ),
      el(
        'div',
        {
          class: 'mx-list-projects-bottom'
        },
        el(
          'div',
          {
            class: 'mx-list-projects-left'
          },
          el(
            'div',
            {
              class: 'mx-list-projects-desc'
            },
            row.description
          )
        ),
        el('div', {
          class: 'mx-list-project-right'
        })
      )
    );

    makeBadges({
      dat: row,
      elTarget: elRowBadges
    });

    return elRow;
  }

  /**
   * helpers
   */
  function makeBadges(opt) {
    let roleSet = false;
    const dat = opt.dat;
    const roles = ['admin', 'publisher', 'member'];
    const elBadgeContainer = el('div');
    opt.elTarget.appendChild(elBadgeContainer);
    for (const role in roles) {
      if (!roleSet && dat[role]) {
        roleSet = true;
        const elBadgeMember = elSpanTranslate(role, {class: 'mx-badge-role'});
        elBadgeContainer.appendChild(elBadgeMember);
      }
    }
    /* Join Button if no role  */
    makeJoinButton({
      dat: dat,
      elTarget: opt.elTarget
    });
  }

  function makeJoinButton(opt) {
    const dat = opt.dat;
    const elTarget = opt.elTarget;
    const allowJoin = !(dat.member || dat.admin || dat.publisher) && !userIsGuest
    if (allowJoin) {
      const elBtn = el('a', {
        href: '#',
        dataset: {
          request_membership: dat[idCol],
          allow_join: dat.allow_join
        }
      }, elSpanTranslate('btn_join_project')
      );
      if (!dat.allow_join) {
        elBtn.classList.add('mx-not-allowed');
      }
      elTarget.appendChild(elBtn);
    }
  }
}
