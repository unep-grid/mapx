
 
observeEvent(input$selectWmsService,{
  updateTextInput(
    session=shiny::getDefaultReactiveDomain(),
    inputId="textWmsService",
    value=input$selectWmsService
    )
})

observe({
  wmsService = tolower(input$textWmsService)
  hasService = !noDataCheck(wmsService)
  isWmsServer = grepl("(wmsserver|wms)$",wmsService)
  isHttps = grepl("^(https)://",wmsService)

  valid = all(
    hasService,
    isWmsServer,
    isHttps
    )

  mxUiHide(
    id="btnFetchLayers",
    disable=!valid,
    hide=FALSE
    )

})

observe({
  layer = tolower(input$selectWmsLayer)
  hasLayer = !noDataCheck(layer)

  valid = all(
    hasLayer
    )

  mxUiHide(
    id="btnUptateTileUrl",
    disable=!valid,
    hide=FALSE
    )

})


observeEvent(input$btnFetchLayers,{
  wmsService <- input$textWmsService
  layers <- mxGetWmsLayers(wmsService)
  mxUpdateSelectizeItems(
    id="selectWmsLayer",
    items=layers
    )
})

observeEvent(input$btnUptateTileUrl,{
  bbox <-"{bbox-epsg-3857}"
  layer  <- input$selectWmsLayer
  tileSize <- input$selectRasterTileSize
  url <- input$textWmsService
  request <- sprintf(
    mxCleanString(
    "%1$s?bbox=%2$s&
    service=WMS&
    version=1.1.1&
    styles=&
    request=GetMap&
    ZINDEX=10&
    srs=EPSG%%3A3857&
    layers=%3$s&
    format=image/png8&
    transparent=true&
    height=%4$s&
    width=%4$s",""),
    url,
    bbox,
    layer,
    tileSize
    )
  updateTextInput(
    session=shiny::getDefaultReactiveDomain(),
    inputId="textRasterTileUrl",
    value=request
    )

})


