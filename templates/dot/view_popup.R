

tags$div(
  "{{~it :lay }}",
  tags$b( "{{=lay.title}}" ),
  tags$ul(class="list-group",
    "{{~lay.prop :prop}}",
    "{{?prop.key.indexOf('mx_t') == -1}}", ## remove time propertie mx_t0 et mx_t1
    tags$li(
      class='list-group-item', 
      style='max-width: 300px;',
      tags$b("{{=prop.key}}"),
      tags$span(
        HTML("{{ console.log(prop.value) ;var tags = prop.value.toString().split(','); for(var t = 0; t < tags.length ; t++){ }}"),
        tags$a(href="#",onclick="mgl.helper.filterViewValues({id:'{{=prop.idMap}}',idView:'{{=prop.idView}}',viewVariable:'{{=prop.key}}',search:'{{=tags[t]}}'})","{{=tags[t]}}"),
        "{{ } }}",
        tags$a(href="#",onclick="mgl.helper.resetViewStyle({id:'{{=prop.idMap}}',idView:'{{=prop.idView}}'})",icon("undo"))
        )
      ),
    "{{?}}",
    "{{~}}"
    ),
  "{{~}}"
  )


