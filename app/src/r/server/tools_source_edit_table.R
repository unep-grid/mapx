observeEvent(input$btnEditSourceTable, {
  mxCatch(title = "btn edit source table", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    if (!isPublisher) {
      return()
    } else {
      mxEditTable()
    }
  })
})
