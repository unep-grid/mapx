observeEvent(input$btnEditSourceMetadata, {
  mxCatch(title = "btn edit source metadata", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    if (!isPublisher) {
      return()
    } else {
      mxShowSelectSourceEdit(id = "selectSourceLayerForMeta")
    }
  })
})

observeEvent(input$btnAddExternalMetadataEntry, {
  userRole <- getUserRole()
  if (!isTRUE(userRole$publisher)) return()
  language <- reactData$language
  mxModal(
    id = "addExternalMetadataEntry",
    title = d("source_meta_data", language),
    content = textInput(
      "textExternalMetadataTitle",
      d("textual_desc_title", language),
      value = ""
    ),
    buttons = list(actionButton(
      "btnAddExternalMetadataEntryConfirm",
      d("create", language)
    )),
    textCloseButton = d("btn_cancel", language)
  )
})

observeEvent(input$btnAddExternalMetadataEntryConfirm, {
  mxCatch(title = "Add external metadata entry", {
    userRole <- getUserRole()
    title <- trimws(input$textExternalMetadataTitle)
    if (!isTRUE(userRole$publisher) || isEmpty(title)) return()
    source <- mxApiCreateExternalMetadata(
      idProject = reactData$project,
      idUser = reactUser$data$id,
      token = reactUser$token,
      metadata = list(text = list(title = list(en = title)))
    )
    idSource <- .get(source, "id")
    mxModal(id = "addExternalMetadataEntry", close = TRUE)
    reactData$updateSourceLayerList <- runif(1)
    reactData$triggerSourceMetadata <- mxSourceMetadataEditRequest(idSource)
  })
})


observeEvent(input$selectSourceLayerForMeta, {
  data <- input$selectSourceLayerForMeta
  if (isEmpty(data$idSource)) {
    return()
  }
  reactData$triggerSourceMetadata <- data
})

observeEvent(reactData$triggerSourceMetadata, {
  mxCatch(title = "Display source  meta", {
    layer <- reactData$triggerSourceMetadata$idSource
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project

    if (!isPublisher || !isAllowed) {
      return()
    }

    uiOut <- tagList(
      uiOutput("uiValidateSourceMetadata", class = "mx-error-container"),
      jedOutput("jedSourceMetadata")
    )

    btn <- list(
      actionButton(
        "btnSaveSourceMetadata",
        d("btn_save", language),
        disabled = TRUE
      ),
      actionButton(
        "btnValidateMetadata",
        d("btn_validate_metadata", language)
      )
    )

    mxModal(
      id = "editSourceMetadata",
      title = d("source_edit_metadata", language),
      content = uiOut,
      buttons = btn,
      textCloseButton = d("btn_close", language)
    )

    #
    # Init schema
    #
    schema <- list()
    meta <- list()
    attributesNames <- list()


    #
    # Get old layer meta
    #
    meta <- mxDbGetSourceMeta(layer)
    hasJoin <- isNotEmpty(meta$join)
    sourceType <- .get(mxDbGetQuery(sprintf(
      "SELECT type FROM mx_sources_latest WHERE id = '%s'",
      layer
    )), "type")
    isExternal <- identical(sourceType, "external")

    if (!isExternal && isEmpty(.get(meta, c("spatial", "bbox"), list()))) {
      #
      # This is also performed if the user request a zoom to all features
      # client side and not valid bbox  is found, we updated that
      # -> see api/modules/view/metadata.js
      #
      extent <- mxDbGetLayerExtent(layer)
      bbox <- list(
        lng_min  = .get(extent, "lng1", -180),
        lng_max  = .get(extent, "lng2", 180),
        lat_min  = .get(extent, "lat1", -90),
        lat_max  = .get(extent, "lat2", 90)
      )
      meta <- .set(meta, c("spatial", "bbox"), bbox)
    } else {
      extent <- list()
    }

    #
    # Clean and/or update attribute
    #
    attributesNames <- if (isExternal) {
      character(0)
    } else {
      mxDbGetTableColumnsNames(layer,
        notIn = c(
          "gid",
          "geom",
          "mx_t0",
          "mx_t1",
          "_mx_valid"
        )
      )
    }
    attributesOld <- names(.get(meta, c("text", "attributes")))
    attributesRemoved <- attributesOld[!attributesOld %in% attributesNames]

    for (a in attributesRemoved) {
      meta <- .set(meta, c("text", "attributes", a), NULL)
    }

    #
    # Create schema for source metadata,
    # Use attributes to generate attributes object
    #
    schema <- mxSchemaSourceMeta(
      language = language,
      attributesNames = attributesNames,
      noAttributes = hasJoin || isExternal,
      idSource = if (isExternal) NULL else layer
    )

    sourceTimeLastModified <- mxDbGetSourceLastDateModified(layer)
    sourceTimeStamp <- as.numeric(
      as.POSIXct(
        sourceTimeLastModified,
        format = "%Y-%m-%d%tT%T",
        tz = "UTC"
      )
    )


    jedSchema(
      id = "jedSourceMetadata",
      schema = schema,
      startVal = meta,
      options = list(
        disableSelectize = FALSE,
        draftAutoSaveId = layer,
        draftAutoSaveDbTimestamp = sourceTimeStamp,
        getValidationOnChange = TRUE,
        addSearch = TRUE
      )
    )
  })
})

observe({
  msg <- .get(input$jedSourceMetadata_issues, c("data"))
  err <- logical(0)

  isolate({
    language <- reactData$language
    hasIssues <- isNotEmpty(msg)

    err[["error_form_issues"]] <- hasIssues

    output$uiValidateSourceMetadata <- renderUI(
      mxErrorsToUi(
        errors = err,
        language = language
      )
    )

    mxToggleButton(
      id = "btnSaveSourceMetadata",
      disable = any(err)
    )
  })
})

#
# Validate metadata
#
observeEvent(input$btnValidateMetadata, {
  # will be validate by mxValidateMetadataModal (r) through client function
  # (js) validateMetadataModal
  jedTriggerGetValues("jedSourceMetadata", "validate")
})

#
# Save
#
observeEvent(input$btnSaveSourceMetadata, {
  jedTriggerGetValues("jedSourceMetadata", "save")
})


observeEvent(input$jedSourceMetadata_values, {
  values <- input$jedSourceMetadata_values

  if (isEmpty(values)) {
    return()
  }

  meta <- .get(values, c("data"))
  idEvent <- .get(values, c("idEvent"))

  switch(idEvent,
    "validate" = {
      mxValidateMetadataModal(meta)
    },
    "save" = {
      mxToggleButton(
        id = "btnSaveSourceMetadata",
        disable = TRUE
      )

      on.exit({
        mxToggleButton(
          id = "btnSaveSourceMetadata",
          disable = FALSE
        )
      })

      mxCatch(title = "Save source meta", {
        userRole <- getUserRole()
        userData <- reactUser$data
        idUser <- .get(userData, c("id"))
        token <- reactUser$token
        isPublisher <- "publishers" %in% userRole$groups
        language <- reactData$language
        layer <- reactData$triggerSourceMetadata$idSource
        idSource <- layer
        layers <- reactListEditSources()
        issues <- .get(input$jedSourceMetadata_issues, c("data"))
        hasIssues <- isNotEmpty(issues)
        isAllowed <- isPublisher && layer %in% layers

        if (hasIssues || !isAllowed) {
          stop("Save source metadata : operation not allowed")
        }

        mxApiReviseSource(
          method = "metadata",
          idSource = idSource,
          changes = list(metadata = meta),
          idUser = idUser,
          token = token
        )

        mxFlashIcon("floppy-o")
        mxUpdateText(
          "editSourceMetadata_txt",
          "Saved at " + format(Sys.time(), "%H:%M")
        )
        mxSourcePickerRefresh(idSource)
        reactData$updateSourceLayerList <- runif(1)
        views <- mxDbGetViewsTableBySourceId(idSource, language = language)
        mglUpdateViewsBadges(list(views = as.list(views$view_id)))
      })
    }
  )
})
