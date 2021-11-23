export async function vtStyleBuilder(opt) {
  const h = mx.helpers;
  let elDone;

  if (!h.isViewId(opt.idView) && !h.isView(opt.idView)) {
    throw new Error('vtStyleBuilder need a view or view id');
  }

  /**
   * Init : get type 
   */

  const summary = await h.getViewSourceSummary(opt.idView, {
    useCache : false,
    nullValue : opt.nullValue,
    stats: ['base', 'attributes']
  });
  opt._type = summary.attribute_stat.type ;

  /**
  * set default
  */ 
  opt = Object.assign(
    {},
    {
      idView: null,
      binsMethod: 'jenks',
      binsNumber: 5
    },
    opt
  );

  opt._palette = null;
  opt._mergeLabelByRow = false;
  opt._elsParts = [];
  opt._elsInputs = [];
  opt._data = {};
  opt._buttons = [];

  /**
   * Labels
   */
  let title = opt.idSource || opt.idView;
  if (h.isViewId(opt.idView)) {
    title = h.getViewTitle(opt.idView);
  }

  /**
   * input : number of bins and method of binning
   */
  if (opt._type === 'continuous') {
    let elValidNum;
    const elNbins = h.el(
      'div',
      {
        class: 'form-group'
      },
      [
        h.el('label', 'Number of bins'),
        h.el('input', {
          class: 'form-control',
          type: 'number',
          value: opt.binsNumber,
          min: 1,
          max: 100,
          on: {
            change: (e) => {
              const value = e.target.value;
              // see  api/utils/checkRouteParams_rules.js
              if (value < 1 || value > 100) {
                elValidNum.innerText = 'Value must be >= 1 and <= 100';
                elNbins.classList.add('has-error');
                return;
              } else {
                elValidNum.innertext = '';
                elNbins.classList.remove('has-error');
              }
              opt.binsNumber = e.target.value;
              update();
            }
          }
        }),
        (elValidNum = h.el('span', {class: ['help-block']}))
      ]
    );
    const elBinsOptions = [
      'jenks',
      'head_tails',
      'quantile',
      'equal_interval'
    ].map((m) => {
      const label = h.getDictItem(m);
      const elOpt = h.el('option', {value: m}, label);
      if (m === opt.binsMethod) {
        elOpt.setAttribute('selected', 'true');
      }
      return elOpt;
    });

    const elBinsMethod = h.el(
      'div',
      {
        class: 'form-group'
      },
      [
        h.el('label', 'Binning method'),
        h.el(
          'select',
          {
            class: 'form-control',
            on: {
              change: (e) => {
                opt.binsMethod = e.target.value;
                update();
              }
            }
          },
          elBinsOptions
        )
      ]
    );
    opt._elsInputs.push(...[elNbins, elBinsMethod]);
  }

  /**
   * inputs : colors
   */
  const chroma = await h.moduleLoad('chroma-js');
  const RadioGroup = await h.moduleLoad('radio-group');
  const palettes = Object.keys(chroma.brewer).map((k) => {
    return {
      value: k,
      content: chroma.brewer[k].map((c) =>
        h.el('span', {
          style: {height: '10px', width: '10px', backgroundColor: c}
        })
      )
    };
  });

  const rgPalette = new RadioGroup({
    items: palettes,
    onUpdate: (palette) => {
      opt._palette = palette;
      update();
    },
    builder: (item) => {
      return h.el(
        'div',
        {
          style: {
            display: 'flex',
            padding: '5px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        },
        h.el(
          'span',
          {
            style: {
              marginRight: '5px'
            }
          },
          item.value
        ),
        h.el(
          'div',
          {
            class: 'auto_style_palettes',
            style: {display: 'flex', flexDirection: 'row'}
          },
          item.content
        )
      );
    },
    configForm: {
      style: {
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid var(--mx_ui_border)',
        padding: '10px',
        borderRadius: '5px'
      }
    }
  });

  opt._elsInputs.push(rgPalette.el);

  /**
   * Reverse palette order
   */
  const elCheckPaletteReverse = h.el(
    'div',
    {
      class: 'checkbox'
    },
    h.el('label', [
      h.el('input', {
        type: 'checkbox',
        on: {
          change: (e) => {
            opt.reversePalette = e.target.checked === true;
            /**
             * Update UI
             */
            const elsPalettes = rgPalette.el.querySelectorAll(
              '.auto_style_palettes'
            );
            if (elsPalettes.length) {
              elsPalettes.forEach((elP) => {
                elP.style.flexDirection =
                  e.target.checked === true ? 'row-reverse' : 'row';
              });
            }
            /**
             * Update table
             */
            update();
          }
        }
      }),
      h.el('span', 'Reverse the color palette')
    ])
  );

  opt._elsInputs.push(elCheckPaletteReverse);

  const elCheckMergeLabelByRow = h.el(
    'div',
    {
      class: 'checkbox'
    },
    h.el('label', [
      h.el('input', {
        type: 'checkbox',
        checked: opt._mergeLabelByRow,
        on: {
          change: (e) => {
            opt._mergeLabelByRow = e.target.checked === true;
          }
        }
      }),
      h.el('span', 'Preserve labels : merge by row')
    ])
  );

  opt._elsInputs.push(elCheckMergeLabelByRow);

  /**
   * All inputs
   */
  const elInputsContainer = h.elPanel({
    title: 'Settings',
    classHeader: ['panel-heading', 'panel-heading-light'],
    content: h.el('div', {style: {padding: '10px'}}, opt._elsInputs)
  });

  opt._elsParts.push(elInputsContainer);

  /**
   * Result table container
   */
  opt._elTableContainer = h.el('div');
  opt._elsParts.push(opt._elTableContainer);

  /**
   * Button on done
   */
  if (h.isFunction(opt.onDone)) {
    elDone = h.el(
      'button',
      {
        type: 'button',
        class: ['btn', 'btn-default'],
        on: [
          'click',
          () => {
            opt.onDone(opt._data, opt._mergeLabelByRow);
            h.itemFlashSave();
          }
        ]
      },
      'Update rules'
    );
    opt._buttons.push(elDone);
  }

  /**
   * Modal
   */
  h.modal({
    title: title,
    content: h.el('div', opt._elsParts),
    noShinyBinding: true,
    addSelectize: false,
    addBackground: true,
    onClose: clean,
    buttons: opt._buttons
  });

  update();

  /**
   * Clean
   */
  function clean() {
    rgPalette.destroy();
  }

  /**
   * Update
   */
  async function update() {
    let titleTable = 'Table';
    const summary = await h.getViewSourceSummary(opt.idView, {
      useCache : false,
      nullValue : opt.nullValue,
      stats: ['base', 'attributes'],
      binsNumber: opt.binsNumber,
      binsMethod: opt.binsMethod
    });
    const aStat = summary.attribute_stat;
    //const countTotal = summary.row_count;
    const count = aStat.table.reduce((c, r) => {
      return c + r.count;
    }, 0);
    /**
     * Scale palette and set colors
     */
    const palette = chroma.brewer[opt._palette].map((c) => c); // clone
    if (opt.reversePalette === true) {
      palette.reverse();
    }
    const colors = chroma.scale(palette).colors(aStat.table.length);
    aStat.table.forEach((r, i) => {
      r.color = colors[i];
    });

    /**
     * Clean values for display
     */
    aStat.table.forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (h.isNumeric(r[k])) {
          r[k] = Math.round(r[k] * 1000) / 1000;
        }
        if (k === 'color') {
          r.preview = h.el('div', {
            style: {
              backgroundColor: r[k],
              width: '20px',
              height: '20px',
              border: '1px solid ccc',
              borderRadius: '5px'
            }
          });
        }
      });
    });

    if (aStat.type === 'continuous') {
      titleTable = `${titleTable} ( Method : ${
        aStat.binsMethod
      }, number of bins : ${aStat.binsNumber}, count ${count} )`;
    } else {
      titleTable = `${titleTable} ( count: ${count} ) `;
    }

    /**
     * Build / Update table
     */
    const elTable = h.elAuto('array_table', aStat.table, {
      tableTitle: titleTable,
      tableContainerHeaderClass: ['panel-heading', 'panel-heading-light']
    });
    opt._elTableContainer.innerHTML = '';
    opt._elTableContainer.appendChild(elTable);

    opt._data = aStat;
  }
}
