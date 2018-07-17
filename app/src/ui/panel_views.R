#
# Map-x (c) unepgrid 2017-present
#

#
# UI for the view list container and search bar  
#



# Filter class by tag
viewPanelFilterButton <- tags$div(
  id = "viewsFilter",
  class = "mx-views-filters-container",
  tags$div(
    class="check-toggle-group",
    id = "viewsFilterContainer"
    )
  )

sortButton <- tags$div(
  class = "mx-bar-sort",
  tags$span(
    class = "mx-bar-sort-title",
    `data-lang_key`="sort_label",
    d("sort_label","en")
    ),
  tags$span(
    id = "btn_sort_title",
    class = "mx-btn-sort",
    onclick = "mx.helpers.sortViewsListBy({type:'title',dir:'toggle',idBtn:'btn_sort_title'})",
    `data-lang_key`="btn_sort_title"
    ),
  tags$span(
    class = "mx-btn-sort",
    id = "btn_sort_date",
    onclick = "mx.helpers.sortViewsListBy({type:'date',dir:'toggle',idBtn:'btn_sort_date'})",
    `data-lang_key`="btn_sort_date"
    ),
  tags$span(
    class = "mx-btn-toggle-filter",
    id = "btn_filter_checked",
    onclick = "mx.helpers.filterActiveViews({idBtn:'btn_filter_checked'})",
    `data-lang_key`="btn_filter_checked",
    "Activated view only"
    )
  )



viewPanelFooter <- tags$div(
  viewPanelFilterButton
  )

# Toolbar
viewPanelHeader <-  tags$div(
  tags$div(
    class="mx-views-project-language-bar",
    tags$span(id="btnShowProject","-",onclick="mx.helpers.showSelectProject()"),
    tags$span(id="btnShowLanguage","-",onclick="mx.helpers.showSelectLanguage()"),
    tags$input(
      id = "viewsFilterText",
      class="mx-views-filter-text-input", 
      type="text",
      `data-lang_key`="view_filter_input",
      `data-lang_type`="placeholder"
      )
    ),
  sortButton
  )

# Final tab object
tags$div(
  id=config[[c("map","idViewsListContainer")]],
  class="mx-views-container", 
  tags$div(
    class="mx-views-header",
    viewPanelHeader
    ),
  tags$div(
    class="mx-views-content",
    tags$ul(
      class="mx-views-list"
      )
    ),
  tags$div(class="mx-views-footer",
    viewPanelFooter
    )
  )

