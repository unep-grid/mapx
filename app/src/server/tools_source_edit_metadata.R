


observeEvent(input$btnEditSourcesMetadata,{

  mxCatch(title="btn edit source meta",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language

    if( !isPublisher ){

      return()

    }else{

      layers <- reactListEditSources()  
      disabled <- NULL
      if(noDataCheck(layers)){
        layers <- list("noLayer")
        disabled <- TRUE
      }

      uiOut <- tagList(
        selectizeInput(
          inputId = "selectSourceLayerForMeta",
          label = d("source_select_layer",language),
          choices = layers,
          multiple = FALSE,
          options = list(
            sortField="label"
            )
          )
        )

      btn <- list(
        actionButton(
          "btnEditSourceMetadata",
          d("btn_edit_selected",language),
          disabled = disabled
          )
        )

      mxModal(
        id = "editSourceMetadata",
        title = d("source_edit_metadata",language),
        content = uiOut,
        buttons = btn,
        textCloseButton = d("btn_close",language)
        )

    }
    })
})


#
# Disable btn edit if not allowed
#
observeEvent(input$selectSourceLayerForMeta,{

  language <- reactData$language
  layer <- input$selectSourceLayerForMeta
  layers <- reactListEditSources()
  isAllowed <- layer %in% layers

  mxToggleButton(
    id="btnEditSourceMetadata",
    disable = !isAllowed 
    )

})



observeEvent(input$btnEditSourceMetadata,{

  mxCatch(title="Save source meta",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layer <- input$selectSourceLayerForMeta
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project


    if( !isPublisher || !isAllowed ){

      return()

    }else{

      uiOut <- tagList(
        uiOutput("uiValidateSourceMetadata"),
        jedOutput("jedSourceMetadata")
        )

      btn <- list(
        actionButton(
          "btnSaveSourceMetadata",
          d("btn_save",language),
          disabled = TRUE
          ),
        actionButton(
          "btnValidateMetadata",
          d("btn_validate_metadata",language)
          )
        )

      mxModal(
        id = "editSourceMetadata",
        title = d("source_edit_metadata",language),
        content = uiOut,
        buttons = btn,
        textCloseButton = d("btn_close",language)
        )

      #
      # Init schema
      #

      schema <- list()
      meta <- list()
      attributesNames <- list()
      extent <- list()

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

      #  #
      ## Update extent
      ##
      #extent <- mxDbGetLayerExtent(layer)

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

    }
      })
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

#
# Validate metadata
#
observeEvent(input$btnValidateMetadata,{
  meta <- input$jedSourceMetadata_values$msg
  
  mxValidateMetadataModal(meta)
})

#
# Save
#
observeEvent(input$btnSaveSourceMetadata,{

  mxToggleButton(
    id="btnSaveSourceMetadata",
    disable = TRUE
    )

  mxCatch(title="Save source meta",{

    userRole <- getUserRole()
    userData <- reactUser$data
    idUser <- .get(userData,c("id"))
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layer <- input$selectSourceLayerForMeta
    layers <- reactListEditSources()
    idSource <- layer
    issues <- input$jedSourceMetadata_issues$msg
    meta <- input$jedSourceMetadata_values$msg
    hasNoIssues <- noDataCheck(issues)
    isAllowed <- isPublisher && layer %in% layers

    if( hasNoIssues && isAllowed ){

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

      mxFlashIcon("floppy-o")
      mxUpdateText("editSourceMetadata_txt","Saved at " + format(Sys.time(),"%H:%M"))
      reactData$updateSourceLayerList <- runif(1)
    }

    })
  mxToggleButton(
    id="btnSaveSourceMetadata",
    disable = FALSE
    )
})



