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
    } else {
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

      if (isEmpty(.get(meta, c("spatial", "bbox"), list()))) {
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
      attributesNames <- mxDbGetTableColumnsNames(layer,
        notIn = c(
          "gid",
          "geom",
          "mx_t0",
          "mx_t1",
          "_mx_valid"
        )
      )
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
        noAttributes = hasJoin,
        idSource = layer
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
    }
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

        tryCatch(
          {
            mxDbUpdate(
              table = .get(config, c("pg", "tables", "sources")),
              idCol = "id",
              id = idSource,
              column = "data",
              path = c("meta"),
              value = meta
            )

            mxDbUpdate(
              table = .get(config, c("pg", "tables", "sources")),
              idCol = "id",
              id = idSource,
              column = "date_modified",
              value = Sys.time()
            )

            mxDbUpdate(
              table = .get(config, c("pg", "tables", "sources")),
              idCol = "id",
              id = idSource,
              column = "editor",
              value = idUser
            )
          },
          error = function(cond) {
            stop("Error writing metadata in DB, check the DB logs")
          }
        )

        mxFlashIcon("floppy-o")

        mxUpdateText(
          "editSourceMetadata_txt",
          "Saved at " + format(Sys.time(), "%H:%M")
        )

        reactData$updateSourceLayerList <- runif(1)

        #
        # Reload views that use this source
        #
        views <- mxDbGetViewsTableBySourceId(idSource, language = language)

        # NOTE: meta no more included -> use metadata from server
        mglUpdateViewsBadges(list(
          views = as.list(views$view_id)
        ))
      })
    }
  )
})
