tagList(
  tags$h3(`data-lang_key`="title_settings"),
  tags$h4(`data-lang_key`="title_settings_views"),
  actionButton(
    inputId = "btnAddView",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_add_view",
    icon("plus")
    ),
  tags$h4(`data-lang_key`="title_settings_sources"),
  actionButton(
    inputId = "btnEditSources",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_edit_sources",
    icon("plus")
    )
  )
