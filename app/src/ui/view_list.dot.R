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
    HTML("
      <svg class='mx-view-tgl-btn' viewBox='0 0 30 30' width='30px' height='30px' preserveAspectRatio='xMinYMin meet'>
       <circle class='mx-view-tgl-btn-out' r=15 cx=15 cy=15></circle>
       <circle class='mx-view-tgl-btn-in' r=13 cx=15 cy=15></circle>
      </svg>
      "),
    #
    # View Title
    #
    tags$span(
      class="mx-view-tgl-title",
      "{{?view.data.title}}",
      "{{=view.data.title[lang]}}",
      "{{?}}"
      ),
    "{{=h.getViewIcons(view)}}",
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
    `data-view_date_modified`="{{=view.date_modified}}",
    `data-view_title`="{{=view.data.title[lang]}}",
    class="mx-view-item mx-view-item-{{=view.type}} mx-sort-li-item noselect mx-draggable",
    divHeader
    ),
  "{{~}}"
)
