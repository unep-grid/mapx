


observeEvent(input$btnRebuildGeoserver, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  ready <- isMapReady()

  if (!isRoot || !ready) {
    return()
  }

  mxGeoserverRebuild(recalcStyle = FALSE)
})

observeEvent(input$btnRebuildGeoserverRecalcStyle, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  ready <- isMapReady()

  if (!isRoot || !ready) {
    return()
  }

  mxGeoserverRebuild(recalcStyle = TRUE)
})
