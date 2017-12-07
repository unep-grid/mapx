

#
# View text long
#
divAbstract <- tags$div(
  "{{ var foldId = mx.helpers.makeId(10); }}",
  class = "fold-container",
  tags$input(
    type="checkbox",
    id="{{=foldId}}",
    class="fold-switch"
    ),
  tags$label(
    class="fold-label",
    `for`="{{=foldId}}",
    "Abstract"
    ),
  tags$div(
    class="fold-content mx-scroll-styled",
    tags$div(
      class="float-left mx-view-item-desc-container",
      "{{? h.path(view,'data.abstract.'+langAbstract) }}",
      tags$p(
        class="mx-view-item-desc",
        id="view_text_{{=view.id}}",
        "{{=view.data.abstract[langAbstract]}}"
        ),
      "{{?}}"
      )
    )
  )

#
# View legend
#
divLegend <- tags$div(
  "{{ var foldId = mx.helpers.makeId(10); }}",
  "{{?view.type!='sm'}}",
  class = "fold-container",
  tags$input(
    type="checkbox",
    id="{{=foldId}}",
    class="fold-switch"
    ),
  tags$label(
    class="fold-label",
    `for`="{{=foldId}}",
    "Legends"
    ),
  tags$div(
    class="fold-content mx-scroll-styled",
    "{{?view.type=='vt'}}",
    "{{ var rules = h.path(view,'data.style.rules'); }}",
    "{{?h.greaterThan(h.path(rules,'length'),0)}}",
    tags$div(
      class="mx-view-item-legend",
      id="check_view_legend_{{=view.id}}"
      ),
    "{{?}}",
    "{{?}}",
    "{{?view.type=='rt'}}",
    tags$div(
      class="mx-view-item-legend-raster",
      id="check_view_legend_{{=view.id}}"
      ),
    "{{?}}",
    "{{?view.type=='cc'}}",
    tags$div(
      class="mx-view-item-legend-custom",
      id="check_view_legend_{{=view.id}}"
      ),
    "{{?}}"
    ),
  "{{?}}"
  )

#
# Opacity slider input
#
divTransparency = tags$div(
  class="mx-slider-container",
  tags$div(
    class="mx-slider-header",
    tags$div(
      class="mx-slider-title",
      `data-lang_key`="btn_opt_transparency",
      `data-lang_type`="text"
      )
    ), 
  tags$div(
    class="mx-slider mx-slider-numeric",
    `data-transparency_for`="{{=view.id}}"
    ),
  tags$div(
    class="mx-slider-range",
    tags$div(
      class="mx-slider-range-min",
      "0%"
      ),
    tags$div(
      class="mx-slider-range-max",
      "100%"
      )
    )
  )



#
# Input for vector tiles
#
divSearchVectorTiles <- tags$div(
  id = "mx-search-tool-{{=view.id}}",
  class = "mx-hide",
  "{{? h.any([view.type == 'vt',view.type == 'gj']) }}",
  #
  # Search input for vector tile search
  #
  "{{? h.path(view,'data.attribute.type') == 'string'}}",
    tags$select(`data-search_box_for`="{{=view.id}}",class="mx-search-box",multiple=TRUE),
  "{{?}}",
  "{{? h.path(view,'data.attribute.type') == 'number'}}",
  tags$div(
    class="mx-slider-container",
    tags$div(
      class="mx-slider-header",
      tags$div(
        class="mx-slider-title",
        `data-lang_key`="btn_opt_numeric",
        `data-lang_type`="text"
        ),
      tags$div(
        class="mx-slider-dyn",
        tags$div(
          class="mx-slider-dyn-min"
          ),
        tags$div(
          class="mx-slider-dyn-max"
          )
        )
      ),
    tags$div(
      class="mx-slider mx-slider-numeric",
      `data-range_numeric_for`="{{=view.id}}"
      ),
    tags$div(
      class="mx-slider-range",
      tags$div(
        class="mx-slider-range-min",
        "{{=h.path(view,'data.attribute.min',0)}}"
        ),
      tags$div(
        class="mx-slider-range-max",
        "{{=h.path(view.data.attribute.max,0)}}"
        )
      )
    ),
    "{{?}}",
    #
    # Time slider input for vector tile
    #
    "{{ var prop = h.path(view,'data.attribute.names'); }}",
    "{{ var vExt = h.path(view,'data.period.extent'); }}",
    "{{? h.all([ prop, vExt ]) }}",
    "{{? h.all([ h.hasIndex(prop,'mx_t0'), vExt.min, vExt.max ]) }}",
    tags$div(
      class="mx-slider-container",
      tags$div(
        class="mx-slider-header",
        tags$div(
          class="mx-slider-title",
          `data-lang_key`="btn_opt_date",
          `data-lang_type`="text"
          ),
        tags$div(
          class="mx-slider-dyn",
          tags$div(
            class="mx-slider-dyn-min"
            ),
          tags$div(
            class="mx-slider-dyn-max"
            )
          )
        ),
      tags$div(
        class="mx-slider mx-slider-date",
        `data-range_time_for`="{{=view.id}}"
        ),
      tags$div(
        class="mx-slider-range",
        tags$div(
          class="mx-slider-range-min",
          "{{=h.date(vExt.min*1000)}}"
          ),
        tags$div(
          class="mx-slider-range-max",
          "{{=h.date(vExt.max*1000)}}"
          )
        )
      ),
    "{{?}}",
    "{{?}}",
    "{{?}}",
    divTransparency
    )

#
# Controls for vector tiles views
#
liControlsVectorTiles <- tagList(
  "{{? h.any([ view.type == 'gj', view.type == 'vt' ]) }}",
  tags$li(
    class="mx-pointer hint--right",
    `data-view_action_key`="btn_opt_zoom_all",
    `data-view_action_target`="{{=view.id}}",
    `data-lang_key`="btn_opt_zoom_all",
    `data-lang_type`="tooltip",
    tags$div(
      class="fa fa-search-minus"
      )
    ),
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_zoom_visible",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_zoom_visible",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-search-plus"
      )
    ),
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_reset",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_reset",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-undo"
      )
    ),
  "{{?}}",
  "{{? h.any([ view.type == 'gj', view.type == 'vt', view.type == 'rt' ]) }}",
  tags$li(
    class="mx-pointer hint--right",
    `data-view_action_key`="btn_opt_search",
    `data-view_action_target`="mx-search-tool-{{=view.id}}",
    `data-lang_key`="btn_opt_search",
    `data-lang_type`="tooltip",
    tags$div(
      class="fa fa-cog"
      )
    ),
  "{{?}}",
  "{{ var urlMeta = h.path(view,'data.source.urlMetadata'); }}",
  "{{? h.all([ view.type == 'rt', urlMeta]) }}",
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_meta",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_meta_external",
    `data-view_action_target`="{{=view.id}}",
    `data-meta_link`="{{=urlMeta}}",
    tags$div(
      class="fa fa-info-circle"
      )
    ),
  "{{?}}",
  "{{?view.type=='vt' }}",
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_meta",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_meta",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-info-circle"
      )
    ),
  "{{?h.path(view,'data.source.allowDownload') }}",
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_download",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_download",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-cloud-download"
      )
    ),
  "{{?}}",
  "{{?}}"
  )


#
# Controsl for raster tiles
#
liControlsRasterTiles <- tagList(
  
  )

#
# Controls for the story map
#
liControlsStoryMaps<- tagList(
  "{{?view.type=='sm'}}",
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_start_story",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_start_story",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-play"
      )
    ),
  "{{?view._edit}}",
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_edit_story",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_story",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-file-text"
      )
    ),
  "{{?}}",
  "{{?}}"
  )

#
# Controls for imported geojson
#
liControlsGeoJson <- tagList(
  "{{?view.type == 'gj'}}",
  # Button to upload geojson
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_upload",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_upload_geojson",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-cloud-upload"
      )
    ),
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_delete_geojson",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_delete_geojson",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-trash-o"
      )
    ),
  "{{?}}" 
  )

#
# Controls for the screenshot / print
#
liControlsScreenShot <- tagList(
  "{{? h.any([ view.type == 'vt', view.type == 'rt' ]) }}",
   tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_screenshot",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_screenshot",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-camera"
      )
    ),
   "{{?}}"
  )

# controls share
liControlsShare <- tagList(
  "{{? h.any([ view.type == 'sm', view.type == 'vt', view.type == 'rt' ]) }}",
  tags$li(
    class="mx-pointer hint--left",
    `data-lang_key`="btn_opt_share",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_share",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-external-link"
      )
    ),
  "{{?}}"
)


#
# Controls if edit tag is set 
#
liControlsEdit <- tagList(
   "{{?view._edit}}",
  # Button to edit view
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_edit_config",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_config",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-pencil"
      )
    ),
  "{{? view.type=='vt' }}",
  # Button to edit view
  tags$li(
    class="mx-pointer hint--left",
    `data-lang_key`="btn_opt_edit_dashboard",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_dashboard",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-pie-chart"
      )
    ),
  "{{?}}",
  "{{? view.type=='cc' }}",
  # Button to edit view
  tags$li(
    class="mx-pointer hint--right",
    `data-lang_key`="btn_opt_edit_custom_code",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_custom_code",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-terminal"
      )
    ),
  "{{?}}",
  "{{?h.all([ view.type=='vt', h.path(view,'data.attribute.name') ]) }}",
  # Button to edit view
  tags$li(
    class="mx-pointer hint--left",
    `data-lang_key`="btn_opt_edit_style",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_style",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-paint-brush"
      )
    ),
  "{{?}}",
  # Button to remove view
  tags$li(
    class="mx-pointer hint--left",
    `data-lang_key`="btn_opt_delete",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_delete",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-trash-o"
      )
    ),
  "{{?}}" 
  )

#
# Controls
#
ulControls <- tags$div(
   tags$div(
    class="mx-controls-view",
    tags$ul(
      class="mx-controls-ul",
      liControlsStoryMaps,
      liControlsVectorTiles,
      liControlsRasterTiles,
      liControlsGeoJson,
      liControlsScreenShot,
      liControlsEdit,
      liControlsShare
      )
    )
  )

#
  # View Options
  #
tagList(
  "{{ var view = it ; }}",
  "{{ var h = mx.helpers ; }}",
  "{{ var langTitle = h.checkLanguage({obj:view,path:'data.title'}) ; }}",
  "{{ var langAbstract = h.checkLanguage({obj:view,path:'data.abstract'}) ; }}",
  divAbstract,
  divLegend,
  ulControls,
  divSearchVectorTiles
  )
