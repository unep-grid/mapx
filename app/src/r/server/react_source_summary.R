
#
# reactLayerMaskSummary
#
reactLayerMaskSummary <- reactive({

  out <- list()

  useMask <- input$checkAddMaskLayer
  layerMaskName <- input$selectSourceLayerMask
  isLayerOk <- isTRUE(layerMaskName %in% reactListReadSources())

  if(useMask && isLayerOk){
    out$layerMaskName <- layerMaskName
    out$useMask <- useMask
  }

  return(out)

})

#
# reactLayerSummary
#

reactLayerSummary <- reactive({

  layerName <- input$selectSourceLayerMain
  geomType <- input$selectSourceLayerMainGeom
  variableName <- input$selectSourceLayerMainVariable

  hasVariable <- !noDataCheck(variableName)
  hasLayer <- !noDataCheck(layerName)

  out <- list()

  out$html <- tags$div()
  out$list <- list()

  if(hasVariable && hasLayer){

    geomTypes <- mxDbGetLayerGeomTypes(layerName)
    isVariableOk <- isTRUE(variableName %in% reactSourceVariables())
    isLayerOk <- isTRUE(layerName %in% reactListReadSources())
    isGeomOk <- isTRUE(geomType %in% geomTypes$geom_type)

    if(isLayerOk && isGeomOk && isVariableOk){
      #
      # Get layer summary
      #
      out <- mxDbGetLayerSummary(
        layer = layerName,
        variable = variableName
      )
    }
  }

  return(out)
})



