

observeEvent(input$btnShowProjectExternalViews, {
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isPublisher <- isTRUE(userRole$publisher)
  userData <- reactUser$data
  reactData$triggerExternalViews <- runif(1)
  projectIsPublic <- mxDbGetProjectIsPublic(project)
  viewsExternal <- reactViewsExternal()

  if (isPublisher) {
    viewsExternal <- mxDbGetViewsTitle(
      viewsExternal,
      asNamedList = TRUE,
      language = language
    )

    uiExternalViews <- tagList(
      selectizeInput(
        "selectProjectExternalViews",
        label = d("views_external", language),
        selected = viewsExternal,
        choices = viewsExternal,
        multiple = TRUE,
        options = list(
          plugins = list("remove_button"),
          sortField = "label"
        )
      )
    )

    btnSave <- actionButton(
      "btnSaveProjectExternalViews",
      d("btn_save", language)
    )

    mxModal(
      id = "viewsExternal",
      title = d("views_external_modal_title", language),
      content = uiExternalViews,
      textCloseButton = d("btn_close", language, web = F),
      buttons = list(btnSave)
    )
  }
})


observe({
  viewsSelected <- as.list(input$selectProjectExternalViews)
  viewsExternal <- reactViewsExternal()
  noChange <- identical(viewsExternal, viewsSelected)
  mxToggleButton("btnSaveProjectExternalViews", disable = noChange)
})



observeEvent(input$btnSaveProjectExternalViews, {
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isPublisher <- isTRUE(userRole$publisher)
  userData <- reactUser$data
  viewsExternal <- reactViewsExternal()
  viewsSelected <- as.list(input$selectProjectExternalViews)

  if (isPublisher) {
    #
    # Only action is "remove". To add, reactViewsCompactAll 
    # could be used to provision select list
    #
    for (v in viewsExternal) {
      toRemove <- !isTRUE(v %in% viewsSelected)
      if (toRemove) {
        mxDbProjectSetViewExternal(
          idProject = project,
          idView = v,
          action = "remove"
        )
        reactData$triggerExternalViews <- runif(1)
        viewsExternal <- viewsExternal[!viewsExternal %in% v]
        mglRemoveView(v)
      }
    }

    viewsExternal <- mxDbGetViewsTitle(viewsExternal, asNamedList = TRUE, language = language)

    updateSelectizeInput(session,
      inputId = "selectProjectExternalViews",
      choice = viewsExternal,
      selected = viewsExternal
    )
    mxFlashIcon("floppy-o")
  }
})
