export function renderUserProjectsList(o) {
  var h = mx.helpers;
  var el = h.el;
  var elDest, elContainer, elProjects, elSearchInput, elsRows;
  var cnt = 0;
  var dat = o.data;
  var idCol = o.idCol || dat.id ? 'id' : 'project';
  var nRow = dat[idCol].length;
  var titles = Object.keys(dat);
  var nCol = titles.length;

  /* render */

  render();

  /**
   * Helpers
   */

  function wait() {
    window.setTimeout(render, 1);
  }

  function render() {
    elDest = document.getElementById(o.idList);
    if (cnt++ < 5) {
      if (elDest) {
        build();
        addToDest();
      } else {
        console.log('El dest for project rendering is not here yet, wait');
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
  function build() {
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

    buildSearch();
    buildRows();
    listen();
  }

  /**
   * Clean remove listener
   */
  function detach() {
    elContainer.removeEventListener('keyup', filterList);
    elContainer.removeEventListener('click', handleClick);
  }

  /**
   * Enable listener
   */
  function listen() {
    elContainer.addEventListener('keyup', filterList);
    elContainer.addEventListener('click', handleClick);
  }

  /**
   * Handle click
   */
  function handleClick(e) {
    var el = e.target;
    var ds = el.dataset;
    var actions = {
      request_membership: function() {
        h.requestProjectMembership(ds.request_membership);
      },
      load_project: function() {
        detach();
        h.setProject(ds.load_project);
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
        textRow = cleanString(elRow.innerText);
        if (textRow.match(textSearch)) {
          elRow.classList.remove('mx-hide');
        } else {
          elRow.classList.add('mx-hide');
        }
      }
    }
  }

  /**
   * Build rows
   */
  function buildRows() {
    var i,
      iL,
      j,
      jL,
      row = {};
    for (i = 0, iL = nRow; i < iL; i++) {
      row = {};
      for (j = 0, jL = nCol; j < jL; j++) {
        row[titles[j]] = dat[titles[j]][i];
      }
      var elRow = buildRow(row);
      elsRows.push(elRow);
      elProjects.appendChild(elRow);
    }

    //elsRows = elProjects.querySelectorAll('.mx-list-projects-row');
  }

  /**
   * Simple search tool
   */
  function buildSearch() {
    elSearchInput.dataset.project_search = true;
    h.getDictItem('project_search_values').then(function(txt) {
      elSearchInput.placeholder = txt;
    });
  }

  /**
   * clean strings
   */
  function cleanString(str) {
    return h.cleanDiacritic(str.toLowerCase());
  }

  function buildRow(row) {
    /*
     * Create content
     */
    var elTop, elBottom, elTitle, elDesc, elLeft, elRight, elRowBadges;
    var elRow = el(
      'div',
      {
        class: 'mx-list-projects-row'
      },
      (elTop = el(
        'div',
        {
          class: 'mx-list-projects-top'
        },
        (elTitle = el(
          'h4',
          {
            class: 'mx-list-projects-title'
          },
          el(
            'a',
            {
              href: '#',
              dataset: {
                load_project: row[idCol]
              }
            },
            row.title
          )
        )),
        (elRowBadges = el('div', {
          class: 'mx-list-project-opt'
        }))
      )),
      (elBottom = el(
        'div',
        {
          class: 'mx-list-projects-bottom'
        },
        (elLeft = el(
          'div',
          {
            class: 'mx-list-projects-left'
          },
          (elDesc = el(
            'div',
            {
              class: 'mx-list-projects-desc'
            },
            row.description
          ))
        )),
        (elRight = el('div', {
          class: 'mx-list-project-right'
        }))
      ))
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
    var dat = opt.dat;
    var elBadgeContainer = el('div');
    var roles = ['member', 'publisher', 'admin'];
    opt.elTarget.appendChild(elBadgeContainer);
    roles.forEach((r) => {
      if (dat[r]) {
        var elBadgeMember = el('span', {class: 'mx-badge-role'});
        elBadgeContainer.appendChild(elBadgeMember);
        h.getDictItem(r).then(function(t) {
          elBadgeMember.innerText = t;
        });
      }
    });
    /* Join Button if no role  */
    makeJoinButton({
      dat: dat,
      elTarget: opt.elTarget
    });
  }

  function makeJoinButton(opt) {
    var dat = opt.dat;
    var elBtn = el('a');
    if (!(dat.member || dat.admin || dat.publisher)) {
      elBtn.href = '#';
      elBtn.dataset.request_membership = dat[idCol];
      h.getDictItem('btn_join_project', mx.settings.language).then(function(
        it
      ) {
        elBtn.innerText = it;
      });
      opt.elTarget.appendChild(elBtn);
    }
  }
}
