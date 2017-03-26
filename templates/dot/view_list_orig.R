


#
# Story play button
#
viewStoryPlay <- tags$div(
  "{{?view.type=='sm'}}",
  tags$a(
    `data-view-story-play-target`="{{=view.id}}",
    `data-lang-key`="btn_opt_start_story",
    `data-lang-type`="tooltip",
    type="button",
    class="btn btn-default btn-xs float-right",
    icon("play")
    ),
  "{{?}}" 
  )

#
# view text
#
viewDescLong <- tags$div(class="float-left",
  "{{?view.data.descriptionLong[lang]}}",
  mxFold(
    id="fold_text_{{=view.id}}",
    labelDictKey="fold_view_desc_long",
    tags$p(
      class="mx-view-li-desc",
      id="view_text_{{=view.id}}",
      "{{=view.data.descriptionLong[lang]}}"
      )
    ),
  "{{?}}"
  )
#
# Option button
#
viewButtons <- tags$div(
  mxFold(
    id="fold_tools_{{=view.id}}",
    labelDictKey="fold_view_tools",
    tags$div(
      class="input-group input-group-xs",
      "{{?view.type=='vt'}}",
      tags$input(
        type="text",
        `data-view-filter-text-target`="{{=view.id}}",
        `data-view-filter-text-variable`="{{=view.data.definition.variable.name}}",
        `data-lang-key`="view_search_values",
        `data-lang-type`="placeholder",
        class="form-control",
        value=""
        ),
      "{{??}}",
      tags$div(
        class="form-control mx-hide"
        ),
      "{{?}}",
      tags$div(
        class="input-group-btn",
        "{{?view.type=='vt'}}",
        tags$button(
          `data-view-zoom-target`="{{=view.id}}",
          `data-view-zoom-variable`="{{=view.data.definition.variable.name}}",
          `data-lang-key`="btn_opt_zoom_visible",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("binoculars")
          ),
        tags$button(
          `data-view-extent-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_zoom_all",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("arrows-alt")
          ),
        tags$button(
          `data-view-reset-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_reset",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("undo")
          ),
        tags$button(
          `data-view-action`="info",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_meta",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("info-circle")
          ),
        tags$button(
          `data-view-action`="download",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_download",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("cloud-download")
          ),
        "{{?}}",
        # Button to get a screenshot
        tags$button(
          `data-view-action`="download_png",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_screenshot",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("external-link")
          ),
        "{{?view._edit}}",
        # Button to remove view
        tags$button(
          `data-view-action`="delete",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_delete",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("trash-o")
          ),
        "{{?}}",
        "{{?view._edit}}",
        # Button to edit view
        tags$button(
          `data-view-action`="edit",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_edit_config",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("pencil")
          ),
        "{{?}}",
        "{{?view.type=='vt'}}",
        "{{?view._edit}}",
        # Button to edit view
        tags$button(
          `data-view-action`="style",
          `data-view-action-target`="{{=view.id}}",
          `data-lang-key`="btn_opt_edit_style",
          `data-lang-type`="tooltip",
          type="button",
          class="btn btn-default",
          icon("paint-brush")
          ),
        "{{?}}",
        "{{?}}"
        )
      )
    )
  )


#
# View legend
#
viewLegend <- tags$div(
  "{{?view.type=='vt'}}",
  "{{ var rules = path(view,'data.definition.style.rules'); }}",
  "{{?rules \\u0026\\u0026 rules.length \\u003e 0 }}",
  mxFold(
    id="fold_legend_{{=view.id}}",
    labelDictKey="fold_view_legend",
    tags$div(
      class="mx-check-view-legend",
      id="check_view_legend_{{=view.id}}"
      )
    ),
  "{{?}}",
  "{{?}}"
  ) 


#
# View title header
#
viewTitleHeader <- tagList(
  #
  # hidden input 
  #
  tags$input(
    `data-view-toggle`="{{=view.id}}",
    id = "check_view_enable_{{=view.id}}",
    class = "mx-check-view-input",
    type = "checkbox"
    ),
  #
  # Label for hidden input
  #
  tags$label(
    class= "mx-check-view-label",
    `for`="check_view_enable_{{=view.id}}",
    tags$span(
      id="view_title_{{=view.id}}",
      class="mx-view-li-title","{{=view.data.title[lang]}}"
      ),
    tags$span(
      class="mx-view-li-date",
      "{{=view.date_modified.substr(0,10)}}"
      ),
    tags$span(
      class="mx-view-li-classes mx-hide",
      "{{=view.data.classes}},{{=view.type}}"
      ),
# NOTE: to display indidual class info
#    tags$div(
      #class="mx-hide",
      #"{{~view.data.classes :cl}}",
      #tags$span(
        #class="mx-view-li-class",
        #"{{=cl}}"
        #),
      #"{{~}}"
      #),
    tags$p(
      id="view_description_{{=view.id}}",
      class="mx-view-li-desc",
      "{{=view.data.descriptionShort[lang]}}"
      )
    ),
  #
  # Options
  #
  tags$div(
    class="mx-check-view-options",
    viewStoryPlay,
    viewDescLong,
    viewLegend,
    viewButtons
    )
  )

#
# Final object
#
tagList(
  tags$ul(
    id="ulViewList",
    class="mx-view-list list",
    "{{~it :view}}",
    "{{ var lang = mgl.helper.checkLanguage({obj:view,path:'data.title'}) ; }}",
    tags$li(
      `data-view-id`="{{=view.id}}",
      class="mx-view-item",
      viewTitleHeader
      ),
    "{{~}}"
    )
  )
