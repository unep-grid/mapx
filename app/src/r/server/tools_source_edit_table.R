observeEvent(input$btnEditSourceTable, {
  mxDebugMsg("click")
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

