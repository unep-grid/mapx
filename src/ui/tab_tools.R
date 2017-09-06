#
# Map-x (c) unepgrid 2017-present
#

#
# UI for the tools 
#


# calc current polygon area
areaLiveCalc  <- tags$div(
  class="input-group",
  tags$div(
    class="input-group-btn",
    tags$button(
      id="btn_get_area_visible",
      class="btn btn-default",
      `data-lang_key`="btn_get_area_visible"
      )
    ),
  tags$div(class="form-control",id="txtAreaSum")
  )

# View and source edit buttons. Generated in tools_manage.R
viewAdd <- uiOutput("uiBtnViewAdd")
sourceEdit <- uiOutput("uiBtnSourceEdit")
sourceUpload <- uiOutput("uiBtnSourceUpload")
qgisInfo <- uiOutput("uiListDbInfo")

# Full block
tagList(
  tags$h3(`data-lang_key`="title_tools"),
  tags$h4(`data-lang_key`="title_tools_map"),
  areaLiveCalc,
  viewAdd,
  sourceUpload,
  sourceEdit,
  qgisInfo
  )
