export function buildLegendVt(view) {
  const h = mx.helpers;
  const rules =
    h.path(view, '_rulesLegend') || h.path(view, 'data.style.rules', []);

  const titleLegend = h.getLabelFromObjectPath({
    obj: view,
    path: 'data.style.titleLegend'
  });

  const nRules = rules.length;
  const isPoint = h.path(view, 'data.geometry.type') == 'point';
  const isLine = h.path(view, 'data.geometry.type') == 'line';
  const isPolygon = h.path(view, 'data.geometry.type') == 'polygon';
  const isNumeric = h.path(view, 'data.attribute.type') !== 'string';
  const aElRules = [];

  let id = 0;
  for (const rule of rules) {
    const lang = h.checkLanguage({obj: rule, path: 'label_', concat: true});
    const label = h.firstOf([rule['label_' + lang], rule.value, 'No data']);
    const inputId = h.makeId();
    const colStyle = {};
    const hasSprite = !!rule.sprite;
    const spriteImage = h.getSpriteImage(rule.sprite);
    
    colStyle.opacity = rule.opacity;
    colStyle.backgroundColor = rule.color || '#FF0';

    if (isLine) {
      colStyle.height = `${rule.size}px`;
    }
    if (isPoint) {
      if (!hasSprite) {
        colStyle.borderRadius = `50%`;
        colStyle.height = `${rule.size}px`;
        colStyle.width = `${rule.size}px`;
      } else {
        colStyle.webkitMaskImage = `url(${spriteImage.url()})`;
        colStyle.webkitMaskSize = 'contain';
        colStyle.webkitMaskRepeat = 'no-repeat';
        colStyle.maskImage = `url(${spriteImage.url()})`;
        colStyle.maskSize = 'contain';
        colStyle.maskRepeat = 'no-repeat';
        colStyle.height = `${rule.size}px`;
        colStyle.width = `${rule.size}px`;
      }
    }

    const elRule = h.el(
      'tr',
      {
        class: [
          'mx-legend-vt-rule',
          isNumeric ? 'mx-legend-vt-rule-numeric' : null
        ],
        style: {
          zIndex: nRules - id
        }
      },
      [
        h.el(
          'td',
          {
            class: 'mx-legend-vt-td'
          },
          h.el(
            'div',
            {class: 'mx-legend-vt-rule-color-wrapper'},
            h.el('div', {class: 'mx-legend-vt-rule-color', style: colStyle}),
            isPolygon && hasSprite
              ? h.el('div', {
                  class: 'mx-legend-vt-rule-background',
                  style: {
                    backgroundImage: `url(${spriteImage.url()})`
                  }
                })
              : null
          )
        ),
        h.el(
          'td',
          h.el('input', {
            class: 'mx-legend-vt-rule-input',
            type: 'checkbox',
            name: inputId,
            id: inputId,
            dataset: {
              view_action_key: 'btn_legend_filter',
              view_action_target: view.id,
              view_action_index: id
            }
          }),
          h.el(
            'label',
            {
              class: 'mx-legend-vt-rule-label',
              for: inputId,
              title: label
            },
            h.el('span', {class: 'mx-legend-vt-rule-label-text'}, label)
          )
        )
      ]
    );
    aElRules.push(elRule);
    id++;
  }

  return h.el(
    'div',
    {
      class: 'mx-legend-container'
    },
    h.el(
      'span',
      {
        class: ['mx-legend-vt-title', 'text-muted']
      },
      titleLegend
    ),
    h.el(
      'div',
      {
        class: 'mx-legend-box'
      },
      h.el(
        'table',
        {
          class: 'mx-legend-vt-rules'
        },
        h.el('tbody', aElRules)
      )
    )
  );
}
