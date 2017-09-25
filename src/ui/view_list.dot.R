#
# Map-x (c) unepgrid 2017-present
#

#
# Template for the view list. Converted in html for the dot templating engine.  
#

#
# View text long
#
divAbstract <- tags$div(class="float-left",
  "{{?view.data.abstract \\u0026\\u0026 view.data.abstract[lang]}}",
    tags$p(
      class="mx-view-item-desc",
      id="view_text_{{=view.id}}",
      "{{=view.data.abstract[lang]}}"
      ),
  "{{?}}"
  )

#
# View legend
#
divLegend <- tags$div(
  "{{?view.type=='vt'}}",
  "{{ var rules = mx.helpers.path(view,'data.style.rules'); }}",
  "{{?rules \\u0026\\u0026 rules.length \\u003e 0 }}",
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
  "{{?view.type == 'vt' \\u007c\\u007c view.type == 'gj' }}",
  #
  # Search input for vector tile search
  #
  "{{?mx.helpers.path(view,'data.attribute.type') == 'string'}}",
    tags$select(`data-search_box_for`="{{=view.id}}",class="mx-search-box",multiple=TRUE),
  "{{?}}",
  "{{?mx.helpers.path(view,'data.attribute.type') == 'number'}}",
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
        "{{=view.data.attribute.min}}"
        ),
      tags$div(
        class="mx-slider-range-max",
        "{{=view.data.attribute.max}}"
        )
      )
    ),
    "{{?}}",
    #
    # Time slider input for vector tile
    #
    "{{ var prop = mx.helpers.path(view,'data.attribute.names'); }}",
    "{{ var vExt = mx.helpers.path(view,'data.period.extent'); }}",
    "{{?prop \\u0026\\u0026 prop.indexOf('mx_t0') \\u003E -1 \\u0026\\u0026 vExt \\u0026\\u0026 vExt.min \\u0026\\u0026 vExt.max}}",
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
          "{{=mx.helpers.date(vExt.min*1000)}}"
          ),
        tags$div(
          class="mx-slider-range-max",
          "{{=mx.helpers.date(vExt.max*1000)}}"
          )
        )
      ),
    "{{?}}",
    "{{?}}",
    divTransparency
    )

#
# Controls for vector tiles views
#
liControlsVectorTiles <- tagList(
  "{{?view.type=='gj' \\u007c\\u007c view.type=='vt' }}",
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-view_action_key`="btn_opt_zoom_all",
    `data-view_action_target`="{{=view.id}}",
    `data-lang_key`="btn_opt_zoom_all",
    `data-lang_type`="tooltip",
    tags$div(
      class="fa fa-search-minus"
      )
    ),
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_zoom_visible",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_zoom_visible",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-search-plus"
      )
    ),
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_reset",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_reset",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-undo"
      )
    ),
  "{{?}}",
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-view_action_key`="btn_opt_search",
    `data-view_action_target`="mx-search-tool-{{=view.id}}",
    `data-lang_key`="btn_opt_search",
    `data-lang_type`="tooltip",
    tags$div(
      class="fa fa-cog"
      )
    ),
  "{{?view.type=='vt' }}",
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_meta",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_meta",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-info-circle"
      )
    ),
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_download",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_download",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-cloud-download"
      )
    ),
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
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_start_story",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_start_story",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-play"
      )
    ),
  "{{?}}" 
  )

#
# Controls for imported geojson
#
liControlsGeoJson <- tagList(
  "{{?view.type == 'gj'}}",
  # Button to upload geojson
  tags$li(
    class="mx-pointer hint--bottom-right",
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
    class="mx-pointer hint--bottom-right",
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
   tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_screenshot",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_screenshot",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-camera"
      )
    )
  )

# controls share
liControlsShare <- tagList(
  "{{?view.type == 'vt' \\u007c\\u007c view.type == 'rt' }}",
  tags$li(
    class="mx-pointer hint--bottom-right",
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
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_edit_config",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_config",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-pencil"
      )
    ),
  "{{?view.type=='vt'}}",
  "{{?mx.helpers.path(view,'data.attribute.name')}}",
  # Button to edit view
  tags$li(
    class="mx-pointer hint--bottom-right",
    `data-lang_key`="btn_opt_edit_style",
    `data-lang_type`="tooltip",
    `data-view_action_key`="btn_opt_edit_style",
    `data-view_action_handler`="shiny",
    `data-view_action_target`="{{=view.id}}",
    tags$div(
      class="fa fa-paint-brush"
      )
    ),
  # Button to edit view
  tags$li(
    class="mx-pointer hint--bottom-right",
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
  "{{?}}",
  # Button to remove view
  tags$li(
    class="mx-pointer hint--bottom-right",
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
divOptions <-tags$div(
  class="mx-view-item-options",
  divAbstract,
  divLegend,
  ulControls,
  divSearchVectorTiles
  )  

#
# View title header
#
divHeader <- tagList(
  #
  # Input and Label
  #
  tags$input(
    `data-view_action_key`="btn_toggle_view",
    `data-view_action_target`="{{=view.id}}",
    id = "check_view_enable_{{=view.id}}",
    class = "mx-view-item-checkbox",
    type = "checkbox"
    ), 
  tags$label(
    class = "mx-view-item-checkbox-label mx-pointer",
    `for` = "check_view_enable_{{=view.id}}",
    #
    # Sorting handle
    #
    tags$div(
      class="fa fa-bars mx-sort-li-handle"
      ),
    #
    # View Title
    #
    tags$span(
      class="mx-view-item-title",
      "{{?view.data.title}}",
      "{{=view.data.title[lang]}}",
      "{{?}}"
    ),
    #
    # Hidden index term for search filter
    #
    tags$span(
      class="mx-view-item-classes",
      "{{=view.data.classes}},{{=view.type}}"
    ),
    tags$span(
      class="mx-view-item-index",
      "{{=mx.helpers.getDistinctIndexWords(view)}}"
      ),
    #
    # Visibility indicator
    #
    tags$div(
        class = "hint--bottom-left hint-medium mx-view-item-indicator",
        `aria-label` = "{{=view.date_modified.substr(0,10)}}",
      tags$div(
        class="fa fa-circle-thin mx-view-item-switch"
        )
      )
    ),
  #
  # View options
  #
  divOptions
  )
 

#
# Final object
#
tagList(
  "{{~it :view}}",
  "{{ var lang = mx.helpers.checkLanguage({obj:view,path:'data.title'}) ; }}",
  tags$li(
    `data-view_id`="{{=view.id}}",
    class="mx-view-item shadow transparent mx-view-item-{{=view.type}} mx-sort-li-item",
    divHeader
    ),
  "{{~}}"
)
