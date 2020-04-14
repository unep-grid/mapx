


observe({
  updateSourceLayer <- reactData$updateEditSourceLayerList
  updateMgl <- input$mx_client_update_source_list
  reactData$updateSourceLayerList <- runif(1)
})

#
# List of layers
#
reactTableReadSources <- reactive({
  update <- reactData$updateSourceLayerList
  userRole <- getUserRole()
  idUser <- .get(reactUser,c("data","id"))
  project <- reactData$project
  language <- reactData$language

  mxDebugMsg("UPDATE READ SOURCE LIST")


  ## non reactif
  additionalLayers <- c()
  userCanRead <- .get(userRole,c("read"))

  views <- reactViewsCompact() 

  #
  # Extract all sources id set in views and add them in the layer list. 
  #
  if(!noDataCheck(views)){
    #
    # Filter edit
    #
    viewsEdit <- views[sapply(views,`[[`,"_edit")]
    #
    # Get ids
    #
    viewsIds <- sapply(viewsEdit,.get,c("id"))

    #
    # Get related source layer
    #
    additionalLayers = mxDbGetLayerListByViews(viewsIds)

  }
 
  #
  # Get layer table
  #
  layers <-  mxDbGetLayerTable(
    project = project,
    idUser = idUser,
    roleInProject = userRole,
    language = language,
    additionalSourcesIds = additionalLayers,
    editableOnly = FALSE
    )

  return(layers)

})


reactListReadSources <- reactive({
  layers <- reactTableReadSources()

  if(noDataCheck(layers)){
    layers <- list("noLayer")
  }else{
    layers <- mxGetLayerNamedList( layers )
  }

  return(layers)

})

#
# List of variable
#
reactSourceVariables <- reactive({

  layerName <- input$selectSourceLayerMain
  hasLayer <- !noDataCheck(layerName)
  language <- reactData$language

  out <- "noVariable"
  names(out) <- d(out,language)

  if(hasLayer){
    isLayerOk <- isTRUE(layerName %in% reactListReadSources())

    if(isLayerOk){
      outLocal <- mxDbGetLayerColumnsNames(layerName,notIn=c("geom","gid","_mx_valid"))

      if(!noDataCheck(outLocal)) out <- outLocal
    }
  }
  return(out)
})

reactTableEditSources <- reactive({
  
  update <- reactData$updateSourceLayerList
  userRole <- getUserRole()
  isPublisher <- "publishers" %in% userRole$groups
  language <- reactData$language
  project <- reactData$project
  userData <- reactUser
  idUser <- .get(userData,c("data","id"))

  mxDebugMsg("UPDATE EDIT SOURCE LIST")

  tbl <- data.frame()
  if( isPublisher ){
    tbl <- mxDbGetLayerTable(
      project = project,
      idUser = idUser,
      roleInProject = userRole,
      language = language,
      editableOnly = TRUE
      )
  }

  return(tbl)
})


reactListEditSources <- reactive({

    layers <- reactTableEditSources()
    if(noDataCheck(layers)){
      layers <- list("noLayer")
    }else{
      layers <- mxGetLayerNamedList( layers )
    }

    return(layers)

})



##
# Reactive table of views depending on selected source
#
reactTableViewsUsingSource <- reactive({
  #
  # Trigger
  #
  idSource <- input$selectSourceLayerEdit 
  language <- reactData$language  
  idViewSource <-input$selectSourceLayerMain
  idViewSourceMask <- input$selectSourceLayerMask
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly

  #
  # Get views table
  #
  mxDbGetViewsIdBySourceId(idSource,language=language)
})



