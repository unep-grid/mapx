

tags$div(
  "{{~it :lay }}",
  tags$b( "{{=lay.title}}" ),
  tags$ul(class="list-group",
    "{{~lay.prop :prop}}",
    #"{{?prop.key.indexOf('mx_t') == -1}}", ## remove time propertie mx_t0 et mx_t1
    tags$li(
      class='list-group-item', 
      style='max-width: 300px;',
      tags$b("{{=prop.key}}"),
      tags$span(
        HTML("{{ var tags = prop.value.toString().split(','); for(var t = 0; t < tags.length ; t++){ }}"),
        tags$a(
          href="#",
          `data-tags_filter_id_map`="{{=prop.idMap}}",
          `data-tags_filter_id_view`="{{=prop.idView}}",
          `data-tags_filter_attribute`="{{=prop.key}}",
          `data-tags_filter_search`="{{=tags[t]}}",
          onClick="mgl.helper.filterViewValues(this)",
          "{{=tags[t]}}"
          ),
         "{{ } }}",
          tags$a(href="#",onclick="mgl.helper.resetViewStyle({id:'{{=prop.idMap}}',idView:'{{=prop.idView}}'})",icon("undo"))
        )
      ),
    #"{{?}}",
    "{{~}}"
    ),
  "{{~}}"
  )


