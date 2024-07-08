observeEvent(input$btnJoinEditorNew, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  isDeveloper <- isTRUE(userRole$developer)
  ready <- isMapReady()

  allowed <- ready && (isRoot || isDeveloper)

  if (!allowed) {
    return()
  }


  mxJoinEditor(create = TRUE)
})

observeEvent(input$btnJoinEditor, {
  userRole <- getUserRole()
  idUser <- .get(reactUser$data, c("id"))
  isRoot <- mxIsUserRoot(idUser)
  isDeveloper <- isTRUE(userRole$developer)
  ready <- isMapReady()
  allowed <- ready && (isRoot || isDeveloper)

  if (!allowed) {
    return()
  }

  mxJoinEditor()
})
