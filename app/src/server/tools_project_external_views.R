

observeEvent(input$btnShowProjectExternalViews,{

  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isPublisher <- isTRUE(userRole$publisher)
  userData <- reactUser$data
  projectIsPublic <- mxDbGetProjectIsPublic(project)
  viewsExternal <- reactViewsExternal() 

  if( isPublisher ){

    viewsExternal <- mxDbGetViewsTitle(viewsExternal,asNamedList=TRUE,language=language)

    uiExternalViews <- tagList(   
      tags$h3("External views shared in this project"),
      selectizeInput(
        "selectProjectExternalViews",
        label = d("views_external",language),
        selected = viewsExternal,
        choices = viewsExternal,
        multiple = TRUE,
        options=list(
          plugins = list("remove_button"),
          sortField="label"
          )
        )
      )

    btnSave <- actionButton(
      "btnSaveProjectExternalViews",
      "Save"
      )

    mxModal(
      id = "viewsExternal",
      title = "External views",
      content = uiExternalViews,
      textCloseButton = d("btn_close",language,web=F),
      buttons = list(btnSave)
      )

  }
})


observe({
  viewsSelected <- as.list(input$selectProjectExternalViews)
  viewsExternal <- reactViewsExternal() 
  noChange <- identical(viewsExternal,viewsSelected)
  mxToggleButton("btnSaveProjectExternalViews",disable=noChange)
})



observeEvent(input$btnSaveProjectExternalViews,{
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isPublisher <- isTRUE(userRole$publisher)
  userData <- reactUser$data
  viewsExternal <- reactViewsExternal() 
  viewsSelected <- as.list(input$selectProjectExternalViews)

  if( isPublisher ){
    #
    # Only action is "remove". To add, reactViewsCompactAll could be used to provision select list
    #
    for( v in viewsExternal ){
      toRemove <- !isTRUE(v %in% viewsSelected)

      if(toRemove){
        mxDbProjectSetViewExternal(
          idProject = project,
          idView = v,
          action ="remove")
        reactData$triggerExternalViews <- runif(1)
        viewsExternal <- viewsExternal[!viewsExternal %in% v]

        mglRemoveView(
          id = .get(config,c("map","id")), 
          idView = v
          )
      }
    }

    updateSelectizeInput(session,
      inputId="selectProjectExternalViews",
      choice = viewsExternal
      )
    mxFlashIcon("floppy-o")

  }
})
