export {handleViewClick};

function handleViewClick(event) {
  if (event.target === event.currentTarget) {
    return;
  }

  const h = mx.helpers;
  const idMap = h.path(mx, 'settings.map.id');
  var el = event.target;
  var t;

  el = h.isIconFont(el) || h.isCanvas(el) ? el.parentElement : el;
  if (!el) {
    return;
  }
  /*
   * tests
   */
  t = [
    {
      comment: 'target is a shiny action button',
      test: el.dataset.view_action_handler === 'shiny',
      action: function() {
        Shiny.onInputChange('mx_client_view_action', {
          target: el.dataset.view_action_target,
          action: el.dataset.view_action_key,
          time: new Date()
        });
      }
    },
    {
      comment: 'target is the show invalid/result metadata modal',
      test: el.dataset.view_action_key === 'btn_badge_warning_invalid_meta',
      action: function() {
        const results = JSON.parse(el.dataset.view_action_data);
        h.displayMetadataIssuesModal(results);
      }
    },
    {
      comment: 'target is the home project button',
      test: el.dataset.view_action_key === 'btn_opt_home_project',
      action: function() {
        const viewTarget = el.dataset.view_action_target;
        const view = h.getView(viewTarget);
        h.setProject(view.project);
      }
    },
    {
      comment: 'target is the delete geojson button',
      test: el.dataset.view_action_key === 'btn_opt_delete_geojson',
      action: function() {
        const arg = el.dataset;
        h.viewDelete({
          id: idMap,
          idView: arg.view_action_target
        });
      }
    },
    {
      comment: 'target is the get raster button',
      test: el.dataset.view_action_key === 'btn_opt_get_raster',
      action: function() {
        const viewTarget = el.dataset.view_action_target;
        h.downloadViewRaster(viewTarget, true);
      }
    },
    {
      comment: 'target is the get geojson button',
      test: el.dataset.view_action_key === 'btn_opt_get_geojson',
      action: function() {
        const viewTarget = el.dataset.view_action_target;
        h.downloadViewGeojson(viewTarget);
      }
    },
    {
      comment: 'target is the upload geojson button',
      test: el.dataset.view_action_key === 'btn_upload_geojson',
      action: function() {
        const idView = el.dataset.view_action_target;
        h.uploadGeojsonModal(idView);
      }
    },
    {
      comment: 'target is the play button',
      test: el.dataset.view_action_key === 'btn_opt_start_story',
      action: function() {
        h.storyRead({
          id: idMap,
          idView: el.dataset.view_action_target,
          save: false
        });
      }
    },
    {
      comment: 'target is the search button',
      test: el.dataset.view_action_key === 'btn_opt_zoom_visible',
      action: function() {
        h.zoomToViewIdVisible({
          id: idMap,
          idView: el.dataset.view_action_target
        });
      }
    },
    {
      comment: 'target is zoom to extent',
      test: el.dataset.view_action_key === 'btn_opt_zoom_all',
      action: function() {
        h.zoomToViewId({
          id: idMap,
          idView: el.dataset.view_action_target
        });
      }
    },
    {
      comment: 'target is tool search',
      test: el.dataset.view_action_key === 'btn_opt_search',
      action: function() {
        const elSearch = document.getElementById(el.dataset.view_action_target);
        h.classAction({
          selector: elSearch,
          action: 'toggle'
        });
      }
    },
    {
      comment: 'target is a legend filter',
      test: el.dataset.view_action_key === 'btn_legend_filter',
      allowDefault: true,
      action: function() {
        /*
         * After click on legend, select all sibling to check
         * for other values to filter using "OR" logical operator
         */
        const legendContainer = h.parentFinder({
          selector: el,
          class: 'mx-legend-box'
        });
        const legendInputs = legendContainer.querySelectorAll('input');
        const idView = el.dataset.view_action_target;
        const view = h.getView(idView);
        const filter = ['any'];
        const rules = h.path(view, 'data.style.rulesCopy', []);

        for (var i = 0, iL = legendInputs.length; i < iL; i++) {
          const li = legendInputs[i];
          if (li.checked) {
            const index = li.dataset.view_action_index * 1;
            const ruleIndex = rules[index];
            if (
              typeof ruleIndex !== 'undefined' &&
              typeof ruleIndex.filter !== 'undefined'
            ) {
              filter.push(ruleIndex.filter);
            }
          }
        }

        view._setFilter({
          type: 'legend',
          filter: filter
        });
      }
    },
    {
      comment: 'target is the label/input for the view to toggle',
      test: el.dataset.view_action_key === 'btn_toggle_view',
      allowDefault: true,
      action: function() {
        h.viewsCheckedUpdate();
      }
    },
    {
      comment: 'target is the reset button',
      test: el.dataset.view_action_key === 'btn_opt_reset',
      action: function() {
        h.resetViewStyle({
          idView: el.dataset.view_action_target
        });
      }
    },
    {
      comment: 'target is the attribute table button',
      test: el.dataset.view_action_key === 'btn_opt_attribute_table',
      action: function() {
        const idView = el.dataset.view_action_target;
        h.viewToTableAttributeModal(idView);
      }
    },
    {
      comment: 'target is the view meta button',
      test: el.dataset.view_action_key === 'btn_opt_meta',
      action: function() {
        const idView = el.dataset.view_action_target;
        h.viewToMetaModal(idView);
      }
    },
    {
      idAction: 'click_meta_raster_open',
      comment: 'target is the raster metadata link',
      test: el.dataset.view_action_key === 'btn_opt_meta_external',
      action: function() {
        const idView = el.dataset.view_action_target;
        const view = h.getView(idView);
        const link = h.path(view, 'data.source.urlMetadata');
        var title =
          h.path(view, 'data.title.' + mx.settings.language) ||
          h.path(view, 'data.title.en');
        if (!title) {
          title = idView;
        }

        h.getDictItem('source_raster_tile_url_metadata').then(function(
          modalTitle
        ) {
          h.modal({
            title: modalTitle,
            id: 'modalMetaData',
            content: h.el(
              'div',
              h.el('b', modalTitle),
              ':',
              h.el(
                'a',
                {
                  href: link,
                  style: {
                    minHeight: '150px'
                  }
                },
                title
              )
            )
          });
        });
      }
    }
  ];

  var found = false;

  for (var i = 0; i < t.length; i++) {
    if (!found && t[i].test === true) {
      found = true;
      t[i].action();

      mx.events.fire({
        type: 'view_panel_click',
        data: {
          idView: el.dataset.view_action_target,
          idAction: el.dataset.view_action_key
        }
      });

      if (!t[i].allowDefault) {
        /* Skip default */
        event.preventDefault();
        /* Stop bubbling */
        event.stopPropagation();
        /* Avoid other events */

        event.stopImmediatePropagation();
      }
    }
  }
}
