export async function vtStyleBuilder(opt) {
  const h = mx.helpers;

  /**
   * Init
   */
  const summary = await h.getSourceVtSummary(opt);
  const aStat = summary.attribute_stat;
  opt._palette = null;
  opt._type = aStat.type;
  opt._elsParts = [];
  opt._elsInputs = [];

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
          min : 1,
          max : 100,
          on: {
            change: (e) => {
              const value = e.target.value;
              if(value < 5 || value > 100){
                elValidNum.innerText = 'Value must be >= 5 and <= 100';
                elNbins.classList.add('has-error');
                return;
              }else{
                elValidNum.innertext = '';
                elNbins.classList.remove('has-error');
              }
              opt.binsNumber = e.target.value;
              update();
            }
          }
        }),
        elValidNum = h.el('span',{class:['help-block']})
      ]
    );
    const elBinsOptions = [
      'jenks',
      'head_tails',
      'quantile',
      'equal_interval'
    ].map((m) => {
      const elOpt = h.el('option', {value: m}, m);
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
      console.log(opt);
      update();
    },
    builder: (item) => {
      return h.el(
        'div',
        {
          style: {
            display: 'flex',
            padding: '5px',
            alignItems: 'center'
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
        item.content
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

  const elInputsContainer = h.elPanel({
    title: 'Settings',
    content: h.el('div', {style: {padding: '10px'}}, opt._elsInputs)
  });

  opt._elsParts.push(elInputsContainer);

  /**
   * Result table container
   */
  opt._elTableContainer = h.el('div');
  opt._elsParts.push(opt._elTableContainer);

  /**
   * Update
   */
  async function update() {
    let titleTable = 'Table';
    const summary = await h.getSourceVtSummary(opt);
    const aStat = summary.attribute_stat;

    /**
     * Scale palette and set colors
     */
    const colors = chroma
      .scale(chroma.brewer[opt._palette])
      .colors(aStat.table.length);
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
            r[k] = h.el('div', {style: {backgroundColor: r[k]}}, r[k]);
          }
        });
      });
    
    if (aStat.type === 'continuous') {
      titleTable = `${titleTable} ( Method : ${
        aStat.binsMethod
      }, number of bins : ${aStat.binsNumber} )`;
    }

    /**
     * Build / Update table
     */
    const elTable = h.elAuto('array_table', aStat.table, {
      tableTitle: titleTable
    });
    opt._elTableContainer.innerHTML = '';
    opt._elTableContainer.appendChild(elTable);

    console.log(aStat);
  }

  h.modal({
    title: title,
    content: h.el('div', opt._elsParts),
    noShinyBinding: true,
    addSelectize: false,
    onClose : clean
  });

  update();
  function clean(){
    rgPalette.destroy();
  }
}
