observeEvent(input$btnUploadSourceApi, {
  mxCatch(title = "btn add source", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    if (!isPublisher) {
      return()
    } else {
      mxUploader()
    }
  })
})

