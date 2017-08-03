tags$div(
  "{{?it.data.style \\u0026\\u0026 it.data.style.rules}}",
  tags$ul(
    "{{~it.data.style.rules :item}}",
    "{{?item}}",
    tags$li(
      tags$div(
        class="mx-legend-item-container",
        tags$input(
          type="checkbox",
          `data-view_action_key`="btn_legend_filter",
          `data-view_action_target`="{{=it.id}}",
          `data-view_action_value`="{{=item.value}}",
          `data-view_action_variable`="{{=it.data.attribute.name}}",
          `name`='{{=it.id}}_{{=item.value}}',
          id='{{=it.id}}_{{=item.value}}'
          ),
        tags$div(class="mx-legend-item-arrow",""),
        tags$label(
          `for`="{{=it.id}}_{{=item.value}}",
          tags$div(
          class="mx-legend-item-color",
          style=paste( 
            "{{?path(it,\\u0022data.geometry.type\\u0022) == \\u0022line\\u0022 }}",
            "height:{{=item.size*2}}px;",
            "{{?}}",
            "{{?path(it,\\u0022data.geometry.type\\u0022) == \\u0022point\\u0022 }}",
            "width:{{=Math.log(0+item.size*10)*2}}px;",
            "height:{{=Math.log(0+item.size*10)*2}}px;",
            "border-radius:100%;",
            "{{?}}",
            "background-color:{{=item.color}};",
            "background-opacity:{{=item.opacity}};",
            "{{? item.sprite }}",
            "background-image:{{=item.sprite}};",
            "{{?}}",
            sep="")
          ),
        tags$div(
          class = "mx-legend-item-label",
          title = paste(
            "{{?item[\\u0022label_\\u0022 + mx.language]}}",
            "{{=item[\\u0022label_\\u0022 + mx.language]}}",
            "{{??}}",
            "{{=item.value}}",
            "{{?}}",sep=""),
          paste(
            "{{?item[\\u0022label_\\u0022 + mx.language]}}",
            "{{=item[\u0022label_\u0022 + mx.language]}}",
            "{{??}}",
            "{{=item.value}}",
            "{{?}}",sep="")
          )   
          )
        )
      ),
    "{{?}}",
    "{{~}}"
    ),
  "{{?}}"
  )


