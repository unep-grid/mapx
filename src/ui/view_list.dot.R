#
# Map-x (c) unepgrid 2017-present
#

#
# Template for the view list. Converted in html for the dot templating engine.  
#
  

#
# View title header
#
divHeader <- tagList(
  #
  # Cover all handle for sortable function
  #
  #tags$div(class="mx-view-tgl-drag-handle"),
  #
  # Input and Label
  #
  tags$input(
    `data-view_action_key`="btn_toggle_view",
    `data-view_action_target`="{{=view.id}}",
    id = "check_view_enable_{{=view.id}}",
    class = "mx-view-tgl-input",
    type = "checkbox"
    ), 
  tags$label(
    class = "mx-view-tgl-content",
    `for` = "check_view_enable_{{=view.id}}",
    #
    # Switch button tgl
    #
    tags$div(
      class = "mx-view-tgl-btn-container",
      tags$div(
        class = "mx-view-tgl-btn-content",
        tags$div(
          class="mx-view-tgl-btn"
          )
        )
      ),
    #
    # View Title
    #
    tags$span(
      class="mx-view-tgl-title mx-drag-handle",
      "{{?view.data.title}}",
      "{{=view.data.title[lang]}}",
      "{{?}}"
      ),
    #
    # Hidden index term for search filter
    #
    tags$span(
      class="mx-view-item-classes",
      "{{=view.data.classes}},{{=view.type}}"
      ),
    tags$span(
      class="mx-view-item-index",
      "{{=mx.helpers.getDistinctIndexWords(view)}}"
      )
    ),
  #
  # Options 
  #
  tags$div(
    class="mx-view-tgl-more-container",
    tags$div(
      class = "mx-view-tgl-more",
      `data-view_options_for`="{{=view.id}}"
      )
    )
  )

#
# Final object
#
tagList(
  "{{ var h = mx.helpers ; }}",
  "{{~it :view}}",
  #
  # Get current view title. Use falback if needed.
  #
  "{{ var lang = h.checkLanguage({obj:view,path:'data.title'}) ; }}",
  tags$li(
    id = "{{=view.id}}",
    `data-view_id`="{{=view.id}}",
    class="mx-view-item mx-view-item-{{=view.type}} mx-sort-li-item noselect mx-draggable",
    divHeader
    ),
  "{{~}}"
)
