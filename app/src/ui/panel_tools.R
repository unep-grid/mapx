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
  tags$h4(`data-lang_key`="title_config_overlap"),
  tags$div(class="well",
    tags$div(class="form-group shiny-input-container",
      tags$label(class="control-label",`data-lang_key`="select_overlap_number_layer",`for`="selectNLayersOverlap","nLayers"),
      tags$div(
        tags$select( id = "selectNLayersOverlap",
          tags$option(value="all",'All'),
          tags$option(value="1",'1'),
          tags$option(selected=TRUE,value="2",'2'),
          tags$option(value="3",'3'),
          tags$option(value="4",'4'),
          tags$option(value="5",'5')
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

# View and source edit buttons. Generated in tools_manage.R
viewAdd <- uiOutput("uiBtnViewAdd")
sourceEdit <- uiOutput("uiBtnSourceEdit")
sourceUpload <- uiOutput("uiBtnSourceUpload")
dbInfo <- uiOutput("uiBtnShowDbInfo")
roleManager <- uiOutput("uiBtnShowRoleManager")
appConfig <- uiOutput("uiBtnShowAppConfig")
projectConfig <- uiOutput("uiBtnProjectConfig")
queryMaker <- uiOutput("uiBtnQueryMaker")


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
      dbInfo,
      roleManager,
      appConfig,
      projectConfig,
      themeColor
      )
    )
  )

