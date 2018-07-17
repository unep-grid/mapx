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


themeColor <- tagList(
  tags$h4(`data-lang_key`="title_settings_colors"),
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
      tags$h3(`data-lang_key`="title_tools"),
      tags$h4(`data-lang_key`="title_tools_map"),
      areaLiveCalc,
      tags$h4(`data-lang_key`="title_tools_share"),
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

