


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
  layers <-  mxDbGetSourceTable(
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
    layers <- mxGetSourceNamedList( layers )
  return(layers)
})
reactListReadSourcesVector <- reactive({
  layers <- reactTableReadSources()
  layers <- layers[layers$type %in% c('vector'),]

  if(noDataCheck(layers)){
    layers <- list("noLayer")
  }else{
    layers <- mxGetSourceNamedList( layers )
  }
  return(layers)
})




reactTableEditSources <- reactive({

  update <- reactData$updateSourceLayerList
  userRole <- getUserRole()
  isPublisher <- "publishers" %in% userRole$groups
  language <- reactData$language
  project <- reactData$project
  userData <- reactUser
  idUser <- .get(userData,c("data","id"))

  tbl <- data.frame()
  if( isPublisher ){
    tbl <- mxDbGetSourceTable(
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
  layers <- mxGetSourceNamedList( layers )
  return(layers)
})
reactListEditSourcesVector <- reactive({
  layers <- reactTableEditSources()
  layers <- layers[layers$type %in% c('vector'),]
  if(noDataCheck(layers)){
    layers <- list("noLayer")
  }else{
    layers <- mxGetSourceNamedList( layers )
  }
  return(layers)
})


#
# Reactive table of views depending on selected source
#
reactTableViewsUsingSource <- reactive({

  #
  # Values
  #
  idSource <- reactData$triggerSourceManage$idSource
  language <- reactData$language  

  #
  # Other triggers
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly

  #
  # Get views table
  #
  mxDbGetViewsIdBySourceId(idSource,language=language)
})



