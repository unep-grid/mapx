#
# Map-x (c) unepgrid 2017-present
#

#
# Template for the legends. Converted in html for the dot templating engine.  
#
tagList(
  "{{ var h = mx.helpers ; }}",
  tagList(
    #
    # Avoid all item without rules or style
    #
    "{{ var rules = h.path(it,'data.style.rulesCopy') || h.path(it,'data.style.rules');  }}",
    "{{ var langTitle = h.checkLanguage({obj:it, path:'data.style.titleLegend', concat:true}) ; }}",
    "{{ var titleLegend = h.path(it,'data.style.titleLegend.'+langTitle) || 'Legend' ; }}",
    "{{?h.greaterThan(rules.length,0)}}",
    "{{ var isPoint = h.path(it,'data.geometry.type') == 'point'; }}",
    "{{ var isLine = h.path(it,'data.geometry.type') == 'line'; }}",
    "{{ var isPolygon = h.path(it,'data.geometry.type') == 'polygon'; }}",
    "{{ var isNumeric = h.path(it,'data.attribute.type') !== 'string'; }}",
    tags$div(
      class="mx-legend-container",
    tags$label(class="mx-view-legend",
      "{{=titleLegend}}"
      ),
      "{{~rules :item:index}}",
      #
      # For each rule, check if the language is set. Get default if needed.
      #
      "{{?item}}",
      "{{ var lang = h.checkLanguage({obj:item, path:'label_', concat:true}) ; }}",
      "{{ var label = h.firstOf([item['label_'+lang], item.value]) ;  }}",
      tags$div(
        class="mx-legend {{?isNumeric }} mx-legend-numeric {{?}}",
        tags$input(
          class="mx-legend-input",
          type="checkbox",
          `data-view_action_key`="btn_legend_filter",
          `data-view_action_target`="{{=it.id}}",
          `data-view_action_index`="{{=index}}",
          #`data-view_action_variable`="{{=it.data.attribute.name}}",
          `name`='{{=it.id}}_{{=item.value}}',
          id='{{=it.id}}_{{=item.value}}'
          ),
        tags$label(
          `for`="{{=it.id}}_{{=item.value}}",
          class="mx-legend-content",
          tags$div(
            class="mx-legend-color",
            style=paste0("opacity:{{=item.opacity}};",
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
              "background-size:contain;",
              "{{?}}"
              )
            ),
          tags$div(
            class = "mx-legend-label",
            title = "{{=label}}",
            "{{=label}}"
            )
          )
        )
      ,
      "{{?}}",
      "{{~}}"
      ),
    "{{?}}"
    )
  )


