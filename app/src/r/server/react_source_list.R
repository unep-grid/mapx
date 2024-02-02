observe({
  updateMgl <- input$mx_client_update_source_list
  reactData$updateSourceLayerList <- runif(1)
})

#
# List of layers
#
reactTableReadSources <- reactive({
  mxCatch(title = "React table source readable", {
    update <- reactData$updateSourceLayerList
    userData <- reactUser$data
    idUser <- userData$id
    project <- reactData$project
    language <- reactData$language
    token <- reactUser$token

    ## non reactif
    view <- reactData$viewDataEdited
    includeLayers <- .get(view, c("data", "source", "layerInfo", "name"))

    #
    # Get layer table
    #
    layers <- mxApiGetSourceTable(
      idProject = project,
      idUser = idUser,
      language = language,
      idSources = includeLayers,
      types = c("join", "vector"),
      editable = FALSE,
      readable = TRUE,
      add_global = TRUE,
      add_views = FALSE,
      exclude_empty_join = TRUE,
      token = token
    )

    return(layers)
  })
})

reactListReadSources <- reactive({
  layers <- reactTableReadSources()
  layers <- mxGetSourceNamedList(layers)
  return(layers)
})

reactListReadSourcesVector <- reactive({
  layers <- reactTableReadSources()
  layers <- layers[layers$type %in% c("vector", "join"), ]

  if (isEmpty(layers)) {
    layers <- list("noLayer")
  } else {
    layers <- mxGetSourceNamedList(layers)
  }

  return(layers)
})




reactTableEditSources <- reactive({
  mxCatch(title = "React table source editable", {
    update <- reactData$updateSourceLayerList
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    project <- reactData$project
    userData <- reactUser
    idUser <- .get(userData, c("data", "id"))
    token <- userData$token

    tbl <- data.frame()
    if (!isPublisher) {
      return()
    }

    tbl <- mxApiGetSourceTable(
      idProject = project,
      idUser = idUser,
      language = language,
      idSources = NULL,
      types = c("join", "vector", "tabular"),
      editable = TRUE,
      readable = FALSE,
      add_global = FALSE,
      add_views = FALSE,
      token = token
    )

    return(tbl)
  })
})
reactListEditSources <- reactive({
  layers <- reactTableEditSources()
  layers <- mxGetSourceNamedList(layers)
  return(layers)
})
reactListEditSourcesVector <- reactive({
  layers <- reactTableEditSources()
  layers <- layers[layers$type %in% c("vector", "join"), ]
  if (isEmpty(layers)) {
    layers <- list("noLayer")
  } else {
    layers <- mxGetSourceNamedList(layers)
  }
  return(layers)
})
