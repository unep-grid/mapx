#
# Simple maintenance panel
#

observeEvent(input$urlSearchQuery, {
  language <- .get(
    input$urlSearchQuery,
    c("language"),
    .get(config, c("language", "default"))
  ) %>% unlist()

  mxModal(
    id = "mx-modal-maintenance",
    title = d("app_maintenance_title", language),
    content = tagList(
      h3(d("app_maintenance_title", language)),
      p(HTML(d("app_maintenance_text", language)))
    )
  )
})
