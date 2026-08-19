observeEvent(input$btnShowTilesReport, {
  mxCatch(title = "btn show tiles report", {
    userRole <- getUserRole()
    isAdmin <- isTRUE(userRole$admin)
    ready <- isMapReady()

    if (!isAdmin || !ready) {
      return()
    }

    mxProjectTilesReport()
  })
})
