/* jshint esversion:6 */

export function epsgBuildSearchBox(opt) {
  const h = mx.helpers;
  const el = h.el;

  var selector = opt.selector;
  var elInput = document.querySelector(selector);

  if (!elInput) {
    console.warn(`epsgBuildSearchBox : element ${selector} not found`);
    return;
  }

  elInput.classList.add('mx-hide');

  var elInputParent = elInput.parentElement;

  var elEpsgChange = el(
    'div',
    {
      class: ['input-group']
    },
    el('input', {
      class: ['form-control'],
      placeholder: 'Epsg code. e.g. 4326',
      dataset: {
        lang_key: 'epsg_placeholder_input',
        lang_type: 'placeholder'
      },
      //disabled : true,
      value: elInput.value ? elInput.value * 1 : '',
      id: 'epsgTextInput'
    }),
    el(
      'span',
      {
        class: ['input-group-btn']
      },
      el('button', {
        class: ['btn', 'btn-default'],
        dataset: {lang_key: 'epsg_btn_open_search'},
        innerText: 'Search',
        on: ['click', showSearch]
      })
    )
  );

  var elSearchGroup = el(
    'div',
    {
      class: ['epsgio-box', 'well'],
      style: {
        display: 'none'
      }
    },
    el('label', {
      dataset: {
        lang_key: 'epsg_label_search'
      }
    }),
    el(
      'div',
      {
        class: ['input-group']
      },
      el('input', {
        class: ['form-control'],
        placeholder: 'Enter country/region name',
        dataset: {
          lang_key: 'epsg_placeholder_search',
          lang_type: 'placeholder'
        },
        type: 'text',
        id: 'epsgSearchInput'
      }),
      el(
        'span',
        {
          class: ['input-group-btn']
        },
        el('button', {
          class: ['btn', 'btn-default'],
          innerText: 'Search',
          dataset: {lang_key: 'epsg_btn_search'},
          on: ['click', searchEpsg]
        })
      )
    ),
    el('div', {
      id: 'epsgListResults'
    })
  );

  elInputParent.appendChild(elEpsgChange);
  elInputParent.appendChild(elSearchGroup);

  /**
   * Update labels
   */

  h.updateLanguageElements({el: elInputParent});

  /**
   * Show or hide search block
   */
  function showSearch() {
    var isVisible = elSearchGroup.style.display === 'block';
    if (isVisible) {
      elSearchGroup.style.display = 'none';
    } else {
      elSearchGroup.style.display = 'block';
    }
  }

  /**
   * Update input using value of returned code
   */
  function choose(e) {
    var code = e.toElement.dataset.code;
    var elEpsg = getEl('epsgTextInput');
    elInput.value = code;
    elEpsg.value = code;
    if (mx.helpers.isObject(Shiny) && Shiny.onInputChange) {
      Shiny.onInputChange(elInput.id, code);
    }
    elSearchGroup.style.display = 'none';
    return '';
  }
  /**
   * Simple wrapper to get nested elements by id
   */
  function getEl(id) {
    return elInputParent.querySelector('#' + id);
  }
  /**
   * Search epsg.io database and build results list as buttons
   */
  function searchEpsg() {
    var elInputSearch = getEl('epsgSearchInput');
    var elResults = getEl('epsgListResults');
    var txt = elInputSearch.value;

    if (!txt) {
      return;
    }

    /**
     * Reset list search
     */
    elResults.innerHTML = '';

    epsgQuery(txt, function(res) {
      if (res.length === 0) {
        var elEmpty = el('button', {
          class: ['btn', 'btn-default', 'epsgio-btn-choose', 'disabled']
        });

        mx.helpers.getDictItem('noValue').then((r) => {
          elEmpty.innerText = r;
        });

        elResults.appendChild(elEmpty);
      } else {
        res.forEach((r) => {
          /**
           * Build select button
           */
          var elRow = el(
            'div',
            el('button', {
              on: ['click', choose],
              innerText: r.name + ' (' + r.code + ')',
              class: ['btn', 'btn-default', 'epsgio-btn-choose'],
              dataset: {
                code: r.code
              }
            })
          );
          elResults.appendChild(elRow);
        });
      }
    });
  }
}

/**
 * Validate epsg
 */
export function epsgQuery(code, cb) {
  var url = 'https://epsg.io/?q=' + code + '&format=json';

  if (!code) {
    cb([]);
    return;
  }

  /**
   * Reset list search
   */

  return fetch(url)
    .then((res) => res.json())
    .then((res) => {
      cb(res.results || []);
    })
    .catch((e) => {
      cb([]);
      throw new Error("Can't retrieve epsg code: " + e);
    });
}
