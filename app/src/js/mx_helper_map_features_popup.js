/*
 * Convert result from getFeaturesValuesByLayers to HTML
 * @param {Object} o Options
 * @param {Object} o.popup Mapbox-gl popup object
 * @param {Object} o.layersAttributes Attributes by layer {<abc>:{<attr>:[<values>,...]}}
 */
export function featuresToHtml(o) {
  const h = mx.helpers;
  const popup = o.popup;
  const attributes = o.layersAttributes;
  const map = h.getMap();
  const elContainer = h.el('div', {
    class: ['mx-popup-container', 'mx-scroll-styled']
  });
  const filters = {};

  /**
   * Reset filters
   */
  popup.on('close', resetFilter);

  /**
   * Update popup with yet empty content
   */
  popup.setDOMContent(elContainer);

  /*
   * render raster properties
   */
  render();

  /**
   * Helpers
   */
  async function elIssueMessage(idMsg) {
    var elIssue = h.el('div', 'no values');
    idMsg = idMsg || 'noValue';
    /**
     * Translate label
     */
    const txt = await h.getDictItem(idMsg);
    elIssue.innerText = txt;
    elIssue.dataset.lang_key = idMsg;
    return elIssue;
  }

  function updateReadMore() {
    h.uiReadMore('.mx-prop-container', {
      maxHeightClosed: 100,
      selectorParent: elContainer,
      boxedContent: false
    });
  }

  function render() {
    var idView;
    for (idView in attributes) {
      renderItem(idView, attributes[idView]);
    }
  }

  async function renderItem(idView, promAttributes) {
    const view = h.getView(idView);
    const language = mx.settings.language;
    const labels = h.path(view, '_meta.text.attributes_alias');
    const isVector = view.type === 'vt' || view.type === 'gj';
    const title = h.getViewTitle(idView);
    var elLayer, elProps, elWait, elSpinner, elTitle;

    try {
      /**
       * Build content elements
       */
      elLayer = h.el(
        'div',
        {
          class: 'mx-prop-group',
          dataset: {
            l: idView
          }
        },
        (elTitle = h.el(
          'span',
          {
            class: 'mx-prop-layer-title'
          },
          title
        )),
        (elWait = h.el(
          'div',
          {
            class: 'mx-inline-spinner-container'
          },
          (elSpinner = h.el('div', {
            class: 'fa fa-cog fa-spin'
          }))
        )),
        (elProps = h.el('div'))
      );

      elContainer.appendChild(elLayer);

      /**
       * Attributes to ui
       */
      const attributes = await promAttributes;

      elWait.remove();

      var attrNames = Object.keys(attributes);

      if (attrNames.length === 0) {
        elLayer.appendChild(await elIssueMessage('noValue'));
        return;
      }

      /**
       * For each attributes, add
       */
      attrNames.forEach((attribute) => {
        var elValue,
          elPropContainer,
          elPropContent,
          elPropWrapper,
          elPropTitle,
          elPropToggles;

        var values = h.getArrayStat({
          stat: 'sortNatural',
          arr: attributes[attribute]
        });

        var hasValues = values.length > 0;
        values = hasValues ? values : ['-'];

        var label = attribute;
        if (labels && labels[attribute]) {
          label =
            labels[attribute][language] || labels[attribute].en || attribute;
        }

        /**
         * Build property elements
         */
        elPropContainer = h.el(
          'div',
          {
            class: 'mx-prop-container'
          },
          (elPropWrapper = h.el(
            'div',
            (elPropContent = h.el(
              'div',
              {
                class: 'mx-prop-content'
              },
              (elPropTitle = h.el(
                'span',
                {
                  class: 'mx-prop-title',
                  title: attribute
                },
                label
              )),
              (elPropToggles = h.el('div', {
                class: 'mx-prop-toggles'
              }))
            ))
          ))
        );

        elProps.appendChild(elPropContainer);
        /*
         * Add a toggle or span for each value
         */
        for (var i = 0, iL = values.length; i < iL; i++) {
          var value = values[i];

          if (hasValues && isVector) {
            /**
             * Case vector, add button and listener
             */
            elValue = h.uiToggleBtn({
              label: value,
              onChange: filterValues,
              data: {
                layer: idView,
                attribute: attribute,
                value: value
              },
              labelBoxed: true,
              checked: false
            });
          } else {
            /**
             * In other cases, add values as span
             */
            elValue = h.el('div');
            /* jshint ignore:start */
            if (h.isArray(value)) {
              value.forEach((v) => {
                elValue.appendChild(
                  h.el(
                    'span',
                    {
                      class: 'mx-prop-static'
                    },
                    v
                  )
                );
              });
            } else {
              elValue = h.el('span', {
                class: 'mx-prop-static'
              });
              elValue.innerText = value;
            }

            /* jshint ignore:end*/
          }

          /**
           * Add value(s) to container
           */
          elPropToggles.appendChild(elValue);
        }
      });

      /**
       * Udate readmore
       */
      updateReadMore();
    } catch (err) {
      if (h.isElement(elLayer)) {
        elLayer.appendChild(await elIssueMessage('property_list_failed'));
      }
      if (h.isElement(elWait)) {
        elWait.remove();
      }
      console.error(err);
    }
  }

  function resetFilter() {
    for (var idV in filters) {
      var view = h.getView(idV);
      view._setFilter({
        filter: ['all'],
        type: 'popup_filter'
      });
    }
  }

  function filterValues() {
    const elChecks = popup._content.querySelectorAll('.check-toggle input');

    h.forEachEl({
      els: elChecks,
      callback: updateFilters
    });

    applyFilters();
  }

  function updateFilters(el) {
    const value = el.dataset.value;
    const layer = el.dataset.layer;
    const attribute = el.dataset.attribute;
    const add = el.checked;
    const isNum = h.isNumeric(value);
    let rule = [];

    if (!filters[layer]) {
      filters[layer] = ['any'];
    }

    if (add) {
      if (isNum) {
        /**
         * Use both text or numeric if value has been converted to string at one point
         */
        rule = ['any', ['==', attribute, value], ['==', attribute, value * 1]];
      } else {
        rule = ['==', attribute, value];
      }
      filters[layer].push(rule);
    }
  }

  function applyFilters() {
    for (var idV in filters) {
      var filter = filters[idV];
      var view = h.getView(idV);

      view._setFilter({
        filter: filter,
        type: 'popup_filter'
      });
    }
  }
}
