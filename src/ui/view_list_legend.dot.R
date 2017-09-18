#
# Map-x (c) unepgrid 2017-present
#

#
# Template for the legends. Converted in html for the dot templating engine.  
#

tags$div(
  "{{?it.data.style \\u0026\\u0026 it.data.style.rules}}",
  "{{ var isPoint = mx.helpers.path(it,\\u0022data.geometry.type\\u0022) == \\u0022point\\u0022; }}",
  "{{ var isLine = mx.helpers.path(it,\\u0022data.geometry.type\\u0022) == \\u0022line\\u0022; }}",
  "{{ var isPolygon = mx.helpers.path(it,\\u0022data.geometry.type\\u0022) == \\u0022polygon\\u0022; }}",
  "{{ var isNumeric = mx.helpers.path(it,\\u0022data.attribute.type\\u0022) != \\u0022string\\u0022; }}",
  tags$ul(
    "{{~it.data.style.rules :item}}",
    "{{ var lang = mx.helpers.checkLanguage({obj:item, path:\\u0022label_\\u0022, concat:true}) ; }}",
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
        tags$div(class="mx-legend-item-arrow",
            "{{?isNumeric }}",
            "≥",
            "{{??}}",
            "=",
            "{{?}}"
          ),
        tags$label(
          `for`="{{=it.id}}_{{=item.value}}",
          tags$div(
            class="mx-legend-item-color-container",
            style="opacity:{{=item.opacity}};",
            tags$div(
              class="mx-legend-item-color",
              style=paste( 
                "{{?isLine }}",
                "height:{{=item.size*2}}px;",
                "{{?}}",
                "{{?isPoint }}",
                "width:{{=Math.log(0+item.size*10)*2}}px;",
                "height:{{=Math.log(0+item.size*10)*2}}px;",
                "border-radius:100%;",
                "{{?}}",
                "background-color:{{=item.color}};",
                "{{? item.sprite }}",
                "background-image:{{=item.sprite}};",
                "{{?}}",
                sep="")
              )
            ),
        tags$div(
          class = "mx-legend-item-label",
          title = paste(
            
            "{{?item[\\u0022label_\\u0022 + lang]}}",
            "{{=item[\\u0022label_\\u0022 + lang]}}",
            "{{??}}",
            "{{=item.value}}",
            "{{?}}",sep=""),
          paste(
            "{{?item[\\u0022label_\\u0022 + lang]}}",
            "{{=item[\u0022label_\u0022 + lang]}}",
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


