

#
# title
#
title <- tags$h3(`data-lang_key`="title_views")

#
# Toolbar 
#
toolBar <-  tags$div(
  id="viewsTools",
  tags$input(
    class="search form-control", 
    type="text",
    `data-lang_key`="view_search_input",
    `data-lang_type`="placeholder"
    )
  )

#
# Filter class by tag
#
filterClass <- tags$div(class="check-toggle-group", 
  lapply(c(config[[c("views","type")]],config[[c("views","classes")]]),function(x){
    cl_id <- sprintf("cl_%s", x)
    tags$div( class="check-toggle",
      tags$input(
        class="filter check-toggle-input",
        type="checkbox",
        id = cl_id,
        `data-filter`=x
        ),
      tags$label(
        class="btn btn-default btn-xs check-toggle-label",
        `for`=cl_id,
        "data-lang_key"=x
        )
      )
    })
  )
#
# Sort button
#
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


#
# Filter and sort button
#
filter <-  mxFold(
  id = "optViewTools",
  labelDictKey = "fold_views_filter",
  content = tags$div(
    mxFold(
      id = "optViewFilter",
      labelDictKey = "fold_views_class",
      content = tagList(
        tags$div(class="filters",
          filterClass
          )
        )
      ),
    mxFold(
      id = "optViewSorts",
      labelDictKey = "fold_views_sort",
      content = tagList(
        tags$div(class="sorts",
          sortButton
          )
        )
      )
    )
  )

#
# Final tab object
#
tags$div(
  id=config[[c("map","idViewsListContainer")]],
  class="mx-views-container", 
  tags$div(class="mx-views-header",
    title,
    toolBar,
    filter
    ),
  tags$div(class="mx-views-content",
    tags$ul(class="mx-views-list")
    )
  )
