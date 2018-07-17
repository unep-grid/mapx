observeEvent(input$btnEditSourcesMetadata,{

  userRole <- getUserRole()
  isPublisher <- "publishers" %in% userRole$groups
  language <- reactData$language
  project <- reactData$project
  userData <- reactUser
  idUser <- .get(userData,c("data","id"))

  if( !isPublisher ){

    return()

  }else{
    
    layers <-  mxDbGetLayerTable(
      project = project,
      idUser = idUser,
      roleInProject = userRole,
      language = language,
      editableOnly = TRUE
      )

    if(noDataCheck(layers)){
      layers <- list("noLayer")
    }else{
      layers <- mxGetLayerNamedList( layers )
    }

    uiOut <- tagList(
      selectizeInput(
        inputId = "selectSourceLayerForMeta",
        label = d("source_select_layer",language),
        choices = layers,
        #selected = .get(viewData,c("project")),
        multiple = FALSE,
        options = list(
          sortField="label"
          )
        ),
      uiOutput("uiValidateSourceMetadata"),
      jedOutput("jedSourceMetadata")
      )

    btn <- list(
      actionButton(
        "btnSaveSourceMetadata",
        d("btn_save",language)
        ) 
      )

    mxModal(
      id = "editSourceMetadata",
      title = "Edit métadata",
      content = uiOut,
      buttons = btn
      )

  }

})



observeEvent(input$selectSourceLayerForMeta,{

  language <- reactData$language
  layer <- input$selectSourceLayerForMeta

  hasLayer <- !noDataCheck(layer)
  schema <- list()
  meta <- list()
  attributesNames <- list()
  extent <- list()

  if(hasLayer){

    #
    # Get old layer meta
    #
    meta <- mxDbGetLayerMeta(layer)

    #
    # Clean and/or update attribute
    #
    attributesNames <- mxDbGetLayerColumnsNames(layer,notIn=c("gid","geom","mx_t0","mx_t1"))
    attributesOld <- names(.get(meta,c("text","attributes")))
    attributesRemoved <- attributesOld[ ! attributesOld %in% attributesNames]

    for(a in attributesRemoved){
      meta = .set(meta,c("text","attributes",a),NULL)
    }

    #
    # Update extent
    #
    extent <- mxDbGetLayerExtent(layer)

  }
  #
  # Create schema for source metadata,
  # Use attributes to generate attributes object
  #
  schema = mxSchemaSourceMeta(
    language = language,
    attributesNames =  attributesNames
    )

  #options = list("no_additional_properties" = FALSE)

  jedSchema(
    id="jedSourceMetadata",
    schema = schema,
    startVal = meta
    )

})


observe({

  msg <- input$jedSourceMetadata_issues$msg
  err <- logical(0)

  isolate({

    language <- reactData$language
    hasIssues <- !noDataCheck(msg);

    err[['error_form_issues']] <- hasIssues 

    output$uiValidateSourceMetadata <- renderUI(mxErrorsToUi(errors=err,language=language))

    mxToggleButton(
      id="btnSaveSourceMetadata",
      disable = any(err)
      )

  })

})


observeEvent(input$btnSaveSourceMetadata,{
  
  userRole <- getUserRole()
  userData <- reactUser$data
  idUser <- .get(userData,c("id"))
  isPublisher <- "publishers" %in% userRole$groups
  language <- reactData$language
  idSource <- input$selectSourceLayerForMeta
  issues <- input$jedSourceMetadata_issues$msg
  meta <- input$jedSourceMetadata_values$msg
  hasNoIssues <- noDataCheck(issues)

  if( hasNoIssues && isPublisher ){
  
  mxDbUpdate(
    table = .get(config,c("pg","tables","sources")),
    idCol = "id",
    id = idSource,
    column = "data",
    path = c("meta"),
    value = meta
    )

  mxDbUpdate(
    table = .get(config,c("pg","tables","sources")),
    idCol = "id",
    id = idSource,
    column = "date_modified",
    value = Sys.time()
    )

  mxDbUpdate(
    table = .get(config,c("pg","tables","sources")),
    idCol = "id",
    id = idSource,
    column = "editor",
    value = idUser
    )

  mxUpdateText("editSourceMetadata_txt","Saved at " + Sys.time())
  }

})



