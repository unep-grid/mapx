#
# Map-x (c) unepgrid 2017-present
#

#
# UI for the view list container and search bar  
#


# Toolbar
viewFilterInput <-  tags$div(
  id="viewsTools",
  tags$input(
    id = "viewsFilterText",
    class="form-control", 
    type="text",
    `data-lang_key`="view_filter_input",
    `data-lang_type`="placeholder"
    )
  )


# Filter class by tag
viewFilterButton <- tags$div(
  id = "viewsFilter",
  tags$div(
    class="check-toggle-group",
    id = "viewsFilterContainer"
    )
  )


# Sort button
sortButton <- tagList(
  tags$a(
    class = "sort btn btn-default btn-xs",
    `data-sort`="mx-view-li-title",
    `data-lang_key`="btn_sort_title"
    ),
  tags$a(
    class = "sort btn btn-default btn-xs",
    `data-sort`="mx-view-li-date",
    `data-lang_key`="btn_sort_date"
    ),
  tags$a(
    class = "sort btn btn-default btn-xs",
    `data-sort`="mx-view-li-desc",
    `data-lang_key`="btn_sort_desc"
    )
  )


# Final tab object
tags$div(
  id=config[[c("map","idViewsListContainer")]],
  class="mx-views-container", 
  tags$div(class="mx-views-header",
    viewFilterInput
    ),
  tags$div(
    class="mx-views-content",
    tags$ul(
      class="mx-views-list"
      )
    ),
  tags$div(class="mx-views-footer",
    viewFilterButton
    )
  )

