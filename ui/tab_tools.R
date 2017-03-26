
tagList(
  tags$h3(`data-lang_key`="title_tools"),
  tags$h4(`data-lang_key`="title_tools_map"),
  tags$div(
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
  )
