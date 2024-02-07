#
# reactLayerMaskSummary
#
reactLayerMaskSummary <- reactive({
  out <- list()

  useMask <- input$checkAddMaskLayer
  layerMaskName <- input$selectSourceLayerMask
  isLayerOk <- isTRUE(layerMaskName %in% reactListReadSourcesVector())

  if (useMask && isLayerOk) {
    out$layerMaskName <- layerMaskName
    out$useMask <- useMask
  }

  return(out)
})

#
# Reactive layer summary
#
reactLayerSummary <- reactive({
  layerName <- input$selectSourceLayerMain
  geomType <- input$selectSourceLayerMainGeom
  variableName <- input$selectSourceLayerMainVariable

  hasVariable <- isNotEmpty(variableName)
  hasLayer <- isNotEmpty(layerName)

  out <- list()

  if (!hasVariable || !hasLayer) {
    return(out)
  }

  isVariableOk <- isTRUE(variableName %in% reactLayerVariables())
  isLayerOk <- isTRUE(layerName %in% reactListReadSourcesVector())

  if (!isLayerOk || !isVariableOk) {
    return(out)
  }
  
  out <- mxDbGetLayerSummary(
    layer = layerName,
    variable = variableName,
    geomType = geomType
  )

  return(out)
})

#
# List of variables
#
reactLayerVariables <- reactive({
  layerName <- input$selectSourceLayerMain
  hasLayer <- isNotEmpty(layerName)
  language <- reactData$language

  out <- "noVariable"
  names(out) <- d(out, language)

  if (!hasLayer) {
    return(out)
  }
  isLayerOk <- isTRUE(layerName %in% reactListReadSourcesVector())

  if (!isLayerOk) {
    return(out)
  }
  
  outLocal <- mxDbGetTableColumnsNames(layerName, notIn = c("geom", "gid", "_mx_valid"))
  
  if (isNotEmpty(outLocal)) {
    out <- outLocal
  }

  return(out)

})
