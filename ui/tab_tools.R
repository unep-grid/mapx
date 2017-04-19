




#
# calc current polygon area
#
areaLiveCalc  <- tags$div(
  class="input-group",
  tags$div(
    class="input-group-btn",
    tags$button(
      onClick="mgl.helper.sendRenderedLayersAreaToUi({id:'map_main',prefix:'MX-',idEl:'txtAreaSum'})",
      class="btn btn-default",
      `data-lang_key`="btn_get_area_visible"
      )
    ),
  tags$div(class="form-control",id="txtAreaSum"),
  tags$div(class="input-group-addon","Km^2")
  )

#
# View and source edit buttons. Generated in tools_manage.R
#
viewAdd <- uiOutput("uiBtnViewAdd")
sourceEdit <- uiOutput("uiBtnSourceEdit")
qgisInfo <- uiOutput("uiListQgisInfo")


#
# Main ui
# 

tagList(
  tags$h3(`data-lang_key`="title_tools"),
  tags$h4(`data-lang_key`="title_tools_map"),
  areaLiveCalc,
  viewAdd,
  sourceEdit,
  qgisInfo
  )
