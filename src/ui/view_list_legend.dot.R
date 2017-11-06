#
# Map-x (c) unepgrid 2017-present
#

#
# Template for the legends. Converted in html for the dot templating engine.  
#
tagList(
  "{{ var h = mx.helpers ; }}",
  tags$div(
    #
    # Avoid all item without rules or style
    #
    #"{{? h.all([ it, h.path(it,'data.style'), h.path(it,'data.style.rules') ]) }}",
    "{{?h.greaterThan(h.path(it,'data.style.rules.length'),0)}}",

        #
        # Shortcut
        #
        "{{ var isPoint = h.path(it,'data.geometry.type') == 'point'; }}",
        "{{ var isLine = h.path(it,'data.geometry.type') == 'line'; }}",
        "{{ var isPolygon = h.path(it,'data.geometry.type') == 'polygon'; }}",
        "{{ var isNumeric = h.path(it,'data.attribute.type') !== 'u0022string'; }}",
        tags$ul(
          "{{~it.data.style.rules :item}}",
          #
          # For each rule, check if the language is set. Get default if needed.
          #
          "{{ var lang = h.checkLanguage({obj:item, path:'label_', concat:true}) ; }}",
          "{{ var label = h.firstOf([item['label_'+lang], item.value]) ;  }}",
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
                  title = "{{=label}}",
                  "{{=label}}"
                  )   
                )
              )
            ),
          "{{?}}",
          "{{~}}"
      ),
    "{{?}}"
    )
  )


