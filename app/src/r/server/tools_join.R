observeEvent(input$btnJoinEditorNew, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  ready <- isMapReady()
  if (!isRoot || !ready) {
    return()
  }

  mxJoinEditor(create = TRUE)
})

observeEvent(input$btnJoinEditor, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  ready <- isMapReady()

  if (!isRoot || !ready) {
    return()
  }

  mxJoinEditor()
})
