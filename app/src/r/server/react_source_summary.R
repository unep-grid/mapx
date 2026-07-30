#
# Source access
#
# Authorization belongs to the API. These reactives deliberately do not use
# reactListReadSourcesVector(), which is a legacy presentation list and does
# not represent every API-authorized access path (notably editor ACLs).
#
reactSourceMainAccessible <- reactive({
  layerName <- input$selectSourceLayerMain

  if (isEmpty(layerName)) {
    return(FALSE)
  }

  mxApiValidateSourceSelection(
    idProject = reactData$project,
    idUser = reactUser$data$id,
    idSources = layerName,
    idView = .get(reactData$viewDataEdited, c("id")),
    token = reactUser$token
  )
})

reactSourceMaskAccessible <- reactive({
  layerName <- input$selectSourceLayerMask

  if (isEmpty(layerName)) {
    return(FALSE)
  }

  mxApiValidateSourceSelection(
    idProject = reactData$project,
    idUser = reactUser$data$id,
    idSources = layerName,
    idView = .get(reactData$viewDataEdited, c("id")),
    token = reactUser$token
  )
})

#
# reactLayerMaskSummary
#
reactLayerMaskSummary <- reactive({
  out <- list()

  useMask <- input$checkAddMaskLayer
  layerMaskName <- input$selectSourceLayerMask
  isLayerOk <- isTRUE(reactSourceMaskAccessible())

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
  isLayerOk <- isTRUE(reactSourceMainAccessible())

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
  isLayerOk <- isTRUE(reactSourceMainAccessible())

  if (!isLayerOk) {
    return(out)
  }
  
  outLocal <- mxDbGetTableColumnsNames(layerName, notIn = c("geom", "gid", "_mx_valid"))
  
  if (isNotEmpty(outLocal)) {
    out <- outLocal
  }

  return(out)

})
