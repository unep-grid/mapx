#
# Map-x (c) unepgrid 2017-present
#

#
# UI for the tools 
#
btnIframeBuilder <- tags$button(
  id = "btnIframeBuilder",
  `data-lang_key`="btn_iframe_builder",
  class = " btn btn-default btn-sm action-button hint shiny-bound-input"
  )


# calc current polygon area
areaLiveCalc  <- tags$div(
  class="input-group",
  tags$div(
    class="input-group-btn",
    tags$button(
      id="btn_get_area_visible",
      class="btn btn-default",
      `data-lang_key`="btn_get_area_visible",
      onClick="mx.helpers.sendRenderedLayersAreaToUi({id:'map_main',prefix:'MX-',idEl:'txtAreaSum'})"
      )
    ),
  tags$div(class="form-control",id="txtAreaSum")
  )

overlapConfig <- tags$div(
  tags$h4(`data-lang_key`="title_config_highlight"),
  tags$div(class="well",
    tags$div(class="form-group shiny-input-container",
      tags$label(class="control-label",`data-lang_key`="select_highlight_mode",`for`="selectNLayersOverlap","highlight_mode"),
      tags$div(
        tags$select( id = "selectNLayersOverlap",
          tags$option(value="all",'Highlight zones where all layers overlap'),
          tags$option(value="1",'Highlight any visible features'),
          tags$option(selected=TRUE,value="2",'Highlight zones where at least two layers overlap'),
          tags$option(value="3",'Highlight zones where at least three layers overlap'),
          tags$option(value="4",'Highlight zones where at least four layers overlap'),
          tags$option(value="5",'Highlight zones where at least five layers overlap')
          )
        )
      ),
    mxFold(
      type = 'checkbox',
      labelDictKey = "label_check_instant_overlap",
      id = "checkEnableOverlapArea",
      content = tagList(
        tags$div(
          class="form-group",
          tags$label(
            `data-lang_key`='label_area_instant_overlap'
            ),
          tags$div(
            class="form-control",
            id="txtAreaOverlap"
            ),
          tags$small(
            `data-lang_key`='label_help_area_instant_overlap',
            class = 'text-muted'
            )
          ),
        tags$div(
          class="form-group",
          tags$label(
            `data-lang_key`='label_resol_instant_overlap'
            ),
          tags$div(
            class="form-control",
            id="txtResolOverlap"
            ),
          tags$small(
            `data-lang_key`='label_help_resol_instant_overlap',
            class = 'text-muted'
            )
          )
        )
      )
    )
  )

themeColor <- tagList(
  tags$h3(`data-lang_key`="title_settings_colors"),
  tags$div(
    class="mx-settings-colors",
    tags$div(id="inputThemeColors")
    )
  )

systemTools <- tagList(
  tags$h3(`data-lang_key`="title_utilities"),
  tags$button('btn',class="btn btn-default",onClick="mx.helpers.clearCache()",`data-lang_key`='btn_clear_cache')
  )

version <- tagList(
  tags$div(
    tags$hr(),
    tags$small( class="text-muted","Version app server :",tags$span(class="text-muted",config$version)),
    tags$br(),
    tags$small( class="text-muted","Version app client :",tags$span(class="text-muted",id="mxVersion"))
    )
  )
# View and source edit buttons. Generated in tools_manage.R
viewAdd <- uiOutput("uiBtnViewAdd")
sourceEdit <- uiOutput("uiBtnSourceEdit")
sourceOverlap <- uiOutput("uiBtnSourceOverlap")
sourceUpload <- uiOutput("uiBtnSourceUpload")
dbInfo <- uiOutput("uiBtnShowDbInfo")
roleManager <- uiOutput("uiBtnShowRoleManager")
appConfig <- uiOutput("uiBtnShowAppConfig")
projectConfig <- uiOutput("uiBtnProjectConfig")
queryMaker <- uiOutput("uiBtnQueryMaker")


browser()
# Full block
tagList(
  tags$div(class="mx-tools-container", 
    tags$div(class="mx-tools-content mx-scroll-styled",
      tags$h2(`data-lang_key`="title_tools"),
      tags$h3(`data-lang_key`="title_tools_map"),
      areaLiveCalc,
      overlapConfig,
      tags$h3(`data-lang_key`="title_tools_share"),
      btnIframeBuilder,
      viewAdd,
      sourceUpload,
      sourceEdit,
      sourceOverlap,
      dbInfo,
      roleManager,
      appConfig,
      projectConfig,
      themeColor,
      systemTools,
      version
      )
    )
  )

