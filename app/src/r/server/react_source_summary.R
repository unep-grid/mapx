
#
# reactLayerMaskSummary
#
reactLayerMaskSummary <- reactive({

  out <- list()

  useMask <- input$checkAddMaskLayer
  layerMaskName <- input$selectSourceLayerMask
  isLayerOk <- isTRUE(layerMaskName %in% reactListReadSourcesVector())

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

  hasVariable <- isNotEmpty(variableName)
  hasLayer <- isNotEmpty(layerName)

  out <- list()

  out$html <- tags$div()
  out$list <- list()

  if(hasVariable && hasLayer){

    geomTypes <- mxDbGetLayerGeomTypes(layerName)
    isVariableOk <- isTRUE(variableName %in% reactLayerVariables())
    isLayerOk <- isTRUE(layerName %in% reactListReadSourcesVector())
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

#
# List of variable
#
reactLayerVariables <- reactive({

  layerName <- input$selectSourceLayerMain
  hasLayer <- isNotEmpty(layerName)
  language <- reactData$language

  out <- "noVariable"
  names(out) <- d(out,language)

  if(hasLayer){
    isLayerOk <- isTRUE(layerName %in% reactListReadSourcesVector())

    if(isLayerOk){
      outLocal <- mxDbGetTableColumnsNames(layerName,notIn=c("geom","gid","_mx_valid"))

      if(isNotEmpty(outLocal)) out <- outLocal
    }
  }
  return(out)
})


