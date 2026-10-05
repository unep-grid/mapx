#
# View vt style : render schema
#
observeEvent(input$styleEdit_init, {
  view <- reactData$viewDataEdited


  if (!isTRUE(.get(view, c("_edit")))) {
    return()
  }

  style <- .get(view, c("data", "style"))
  language <- reactData$language
  idSource <- .get(view, c("data", "source", "layerInfo", "name"))
  hasLayer <- isNotEmpty(idSource)
  #
  # Validate the view's own source, not the config editor's source input
  #
  hasSources <- hasLayer && isTRUE(mxApiValidateSourceSelection(
    idProject = reactData$project,
    idUser = reactUser$data$id,
    idSources = idSource,
    idView = view$id,
    token = reactUser$token
  ))
  hasStyle <- isNotEmpty(style)

  mxCatch(title = "style edit init", {
    if (!hasStyle) style <- NULL
    if (!hasLayer || !hasSources) {
      errors <- logical(0)
      warnings <- logical(0)

      if (!hasLayer) {
        warnings["error_no_layer"] <- TRUE
      } else {
        errors["error_no_source"] <- TRUE
      }

      output$txtValidSchema <- renderUI({
        mxErrorsToUi(
          errors = errors,
          warning = warnings,
          language = language
        )
      })

      if (length(errors) > 0 || length(warnings) > 0) {
        mxToggleButton(
          id = "btnViewSaveStyle",
          disable = TRUE
        )
        mxToggleButton(
          id = "btnViewPreviewStyle",
          disable = TRUE
        )
      }
    } else {
      schema <- mxSchemaViewStyle(
        view = view,
        language = language
      )

      viewTimeStamp <- as.numeric(
        as.POSIXct(view$date_modified, format = "%Y-%m-%d%tT%T", tz = "UTC")
      )

      #
      # Handle issue with hex color + alpha
      # -> probably an issue with the color picker allowed hex + alpha value.
      # -> not wanted
      #
      if (isNotEmpty(style$rules)) {
        style$rules <- lapply(style$rules, function(rule) {
          rule$color <- substr(rule$color, 1, 7)
          return(rule)
        })
      }
      if (isNotEmpty(style$nulls)) {
        style$nulls <- lapply(style$nulls, function(rule) {
          rule$color <- substr(rule$color, 1, 7)
          return(rule)
        })
      }

      jedSchema(
        id = "styleEdit",
        schema = schema,
        startVal = style,
        options = list(
          disableSelectize = TRUE,
          draftAutoSaveId = view$id,
          draftAutoSaveDbTimestamp = viewTimeStamp,
          hooksOnGet = list(
            list(
              id = "view_style_add_sld",
              idView = view$id
            )
          )
        )
      )
    }
  })
})

#
# Vew style preview
#
observeEvent(input$btnViewPreviewStyle, {
  mxToggleButton(
    id = "btnViewSaveStyle",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewStyle",
    disable = TRUE
  )
  jedTriggerGetValues("styleEdit", "preview")
})
#
# View style save
#
observeEvent(input$btnViewSaveStyle, {
  mxToggleButton(
    id = "btnViewSaveStyle",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewStyle",
    disable = TRUE
  )
  jedTriggerGetValues("styleEdit", "save")
})
#
# View style close
# -> does not need the editor values: restore the stored, non-previewed view
#
observeEvent(input$btnViewCloseStyle, {
  mxModal(
    id = "modalViewEdit",
    close = TRUE
  )
  idView <- .get(reactData$viewDataEdited, c("id"))
  if (isEmpty(idView)) {
    return()
  }
  views <- mxApiGetViews(
    idViews = idView,
    idProject = reactData$project,
    idUser = reactUser$data$id,
    token = reactUser$token
  )
  viewStored <- if (length(views) > 0) views[[1]]
  if (isNotEmpty(viewStored)) {
    mglUpdateView(viewStored)
  }
})



observeEvent(input$styleEdit_values, {
  values <- input$styleEdit_values
  if (isEmpty(values)) {
    return()
  }

  style <- values$data
  idEvent <- values$idEvent
  editor <- reactUser$data$id
  view <- reactData$viewDataEdited
  isEditable <- view[["_edit"]] && view[["type"]] == "vt"

  if (isEditable) {
    time <- Sys.time()
    #
    # WARNING R jsonlite convert NULL to {}... why ?
    #
    view <- .set(view, c("data", "style", "custom"), .get(style, c("custom")))
    view <- .set(view, c("data", "style", "rules"), .get(style, c("rules")))
    view <- .set(view, c("data", "style", "zoomConfig"), .get(style, c("zoomConfig")))
    view <- .set(view, c("data", "style", "polygonBorderConfig"), .get(style, c("polygonBorderConfig")))
    view <- .set(view, c("data", "style", "showSymbolLabel"), .get(style, c("showSymbolLabel")))
    view <- .set(view, c("data", "style", "nulls"), .get(style, c("nulls")))
    view <- .set(view, c("data", "style", "hideNulls"), .get(style, c("hideNulls")))
    view <- .set(view, c("data", "style", "includeUpperBoundInInterval"), .get(style, c("includeUpperBoundInInterval")))
    view <- .set(view, c("data", "style", "excludeMinMax"), .get(style, c("excludeMinMax")))
    view <- .set(view, c("data", "style", "titleLegend"), .get(style, c("titleLegend")))
    view <- .set(view, c("data", "style", "reverseLayer"), .get(style, c("reverseLayer")))

    if (!isEmpty(values$`_style_sld`)) {
      view <- .set(view, c("data", "style", "_sld"), values$`_style_sld`)
    }

    if (!isEmpty(values$`_style_mapbox`)) {
      view <- .set(view, c("data", "style", "_mapbox"), values$`_style_mapbox`)
    }

    switch(idEvent,
      "preview" = {
        mglUpdateView(view)
      },
      "save" = {
        view[["_edit"]] <- NULL
        #
        # Prepare view for database storage using centralized function
        #
        view <- mxPrepareViewForDb(view, editor, time)

        mxDbAddRow(
          data = view,
          table = .get(config, c("pg", "tables", "views"))
        )

        # edit flag
        view$`_edit` <- TRUE
        reactData$viewDataEdited <- view

        mglUpdateView(view)

        mxUpdateText(
          id = "modalViewEdit_txt",
          text = sprintf("Saved at %s", format(time, "%H:%M"))
        )

        mxFlashIcon("floppy-o")
        reactData$updateViewListFetchOnly <- runif(1)
      }
    )
  }
  mxToggleButton(
    id = "btnViewSaveStyle",
    disable = FALSE
  )
  mxToggleButton(
    id = "btnViewPreviewStyle",
    disable = FALSE
  )
})
