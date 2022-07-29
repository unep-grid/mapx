





observeEvent(input$btnEditSourceTable, {
  mxCatch(title = "btn edit source table", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language

    if (!isPublisher) {
      return()
    } else {
      layers <- reactListEditSources()
      layers <- layers[vapply(layers, mxIsValidSourceEdit, FALSE)]

      disabled <- NULL
      if (noDataCheck(layers)) {
        layers <- list("noLayer")
        disabled <- TRUE
      }

      #
      # Use the layer from the last edited view as default
      #
      view <- reactData$viewDataEdited
      viewLayerName <- .get(view, c("data", "source", "layerInfo", "name"))

      if (!noDataCheck(viewLayerName) && viewLayerName %in% layers) {
        selectedLayer <- viewLayerName
      } else {
        selectedLayer <- NULL
      }



      uiOut <- tagList(
        selectizeInput(
          inputId = "selectSourceLayerForEditTable",
          label = d("source_select_layer", language),
          choices = layers,
          multiple = FALSE,
          selected = selectedLayer,
          options = list(
            sortField = "label"
          )
        )
      )

      btn <- list(
        actionButton(
          "btnEditSourceEditTableSelect",
          d("btn_edit_selected", language),
          disabled = disabled
        )
      )

      mxModal(
        id = "editSourceTable",
        title = d("source_edit_table", language),
        content = uiOut,
        buttons = btn,
        textCloseButton = d("btn_close", language)
      )
    }
  })
})


#
# Disable btn edit if not allowed
#
observeEvent(input$selectSourceLayerForEditTable, {
  language <- reactData$language
  layer <- input$selectSourceLayerForEditTable
  layers <- reactListEditSources()
  isAllowed <- layer %in% layers

  mxToggleButton(
    id = "btnEditSourceEditTableSelect",
    disable = !isAllowed
  )
})


observeEvent(input$btnEditSourceEditTableSelect, {
  mxCatch(title = "Display source edit", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layer <- input$selectSourceLayerForEditTable
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project

    mxModal(
      id = "editSourceTable",
      close = TRUE
    )

    if (!isPublisher || !isAllowed) {
      return()
    } else {
      mxEditTable(
        idTable = layer
      )
    }
  })
})
