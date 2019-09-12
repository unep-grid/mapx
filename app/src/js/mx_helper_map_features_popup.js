/*
 * Convert result from getFeaturesValuesByLayers to HTML
 * @param {Object} o Options
 * @param {String} o.id Map id
 * @param {Array} o.point Array of coordinates
 * @param {Object} o.popup Mapbox-gl popup object
 */
export function featuresToHtml(o) {
  var h = mx.helpers;
  var popup = o.popup;
  var el = mx.helpers.el;
  var map = h.getMap(o.id);
  var filters = {};
  var layerVector = {};
  var layerRaster = {};
  var elNoData;
  var elContainer = el(
    'div',
    {
      class: ['mx-popup-container', 'mx-scroll-styled']
    },
    (elNoData = el('div', 'no values'))
  );

  /**
   * Translate label
   */
  h.getDictItem('noValue').then((txt) => {
    elNoData.innerText = txt;
    elNoData.dataset.lang_key = 'noValue';
  });

  /**
   * Reset filters
   */
  popup.on('close', resetFilter);

  /**
   * Update popup with yet empty content
   */
  popup.setDOMContent(elContainer);

  /*
   * get vector properties
   */
  layerVector = h.getLayersPropertiesAtPoint({
    map: map,
    point: o.point,
    type: ['vt','gj'],
    asObject: true
  });
  render(layerVector);

  /*
   * render raster properties
   */
  layerRaster = h.getLayersPropertiesAtPoint({
    map: map,
    point: o.point,
    type: 'rt',
    asObject: true
  });
  render(layerRaster);

  /**
   * Helpers
   */
  /*  function hasActivatedLayer() {*/
  //return h.getLayerNamesByPrefix().length > 0;
  /*}*/

  function updateReadMore() {
    h.uiReadMore('.mx-prop-container', {
      maxHeightClosed: 100,
      selectorParent: elContainer,
      boxedContent: false
    });
  }

  function render(layers) {
    var idView;
    for (idView in layers) {
      if (true) {
        renderItem(idView, layers[idView]);
      }
    }
  }

  function renderItem(idView, promAttributes) {
    var view = h.getView(idView);
    var language = mx.settings.language;
    var labels = h.path(view, '_meta.text.attributes_alias');
    var isVector = view.type === 'vt';
    var title = h.getViewTitle(idView);
    var elLayer, elProps, elWait, elSpinner, elTitle;

    /*
     * Remove no data label
     */
    elNoData.remove();

    /**
     * Build content elements
     */
    elLayer = el(
      'div',
      {
        class: 'mx-prop-group',
        dataset: {
          l: idView
        }
      },
      (elTitle = el(
        'span',
        {
          class: 'mx-prop-layer-title'
        },
        title
      )),
      (elWait = el(
        'div',
        {
          class: 'mx-inline-spinner-container'
        },
        (elSpinner = el('div', {
          class: 'fa fa-cog fa-spin'
        }))
      )),
      (elProps = el('div'))
    );

    elContainer.appendChild(elLayer);

    /**
     * Attributes to ui
     */
    promAttributes.then((attributes) => {
      elWait.remove();

      var attrNames = Object.keys(attributes);

      if (attrNames.length === 0) {
        var elNoDataAttr = elNoData.cloneNode(true);
        elLayer.appendChild(elNoDataAttr);
      }

      /**
       * For each attributes, add
       */
      attrNames.forEach(function(attribute) {
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
        elPropContainer = el(
          'div',
          {
            class: 'mx-prop-container'
          },
          (elPropWrapper = el(
            'div',
            (elPropContent = el(
              'div',
              {
                class: 'mx-prop-content'
              },
              (elPropTitle = el(
                'span',
                {
                  class: 'mx-prop-title',
                  title: attribute
                },
                label
              )),
              (elPropToggles = el('div', {
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
                l: idView,
                p: attribute,
                v: value
              },
              labelBoxed: true,
              checked: false
            });
          } else {
            /**
             * In other cases, add values as span
             */
            elValue = el('div');
            /* jshint ignore:start */
            if (h.isArray(value)) {
              value.forEach((v) => {
                elValue.appendChild(
                  el(
                    'span',
                    {
                      class: 'mx-prop-static'
                    },
                    v
                  )
                );
              });
            } else {
              elValue = el('span', {
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
    });
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
    var elChecks = popup._content.querySelectorAll('.check-toggle input');
    filters = {}; // reset filter at each request

    h.forEachEl({
      els: elChecks,
      callback: buildFilters
    });

    for (var idV in filters) {
      var filter = filters[idV];
      var view = h.getView(idV);

      view._setFilter({
        filter: filter,
        type: 'popup_filter'
      });
    }

    function buildFilters(el) {
      var v = el.dataset.v;
      var l = el.dataset.l;
      var p = el.dataset.p;
      var add = el.checked;
      var isNum = h.isNumeric(v);
      var rule = [];

      if (!filters[l]) {
        filters[l] = ['any'];
      }
      if (add) {
        if (isNum) {
          rule = ['any', ['==', p, v], ['==', p, v * 1]];
        } else {
          rule = ['==', p, v];
        }
        filters[l].push(rule);
      }
    }
  }
}
