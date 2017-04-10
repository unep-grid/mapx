


observeEvent(input$btnEditSources,{
  language <- reactData$language 
  dict <- .get(config,c("dictionaries","schemaMetadata")) 

  #
  # json editor output
  #
  uiOut = tagList(

    selectInput(
      inputId = "selectSourceLayerEdit",
      label = d("source_select_layer",language),
      choices = reactSourceLayer()
      ),
    jedOutput(id="sourceEdit")
    )

  #
  # List of button for the modal window
  #
  btnList <- list(
    actionButton(
      inputId="btnUpdateSource",
      label=d("btn_update",language)
      ),
    actionButton(
      inputId="btnDeleteSource",
      label=d("btn_delete",language)
      )
    )

  #
  # Generate the modal panel
  #
  output$panelModal <- renderUI(mxPanel(
      id="uiEditSource",
      headIcon="pencil",
      html=uiOut,
      listActionButton=btnList,
      addOnClickClose=FALSE,
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

})

observeEvent(input$btnDeleteSource,{

  language <- reactData$language
  dict <- .get(config,c("dictionaries","schemaMetadata")) 
  #
  # Button to confirm the source removal
  #
  btnList <- list(
    actionButton(
      inputId="btnDeleteSourceConfirm",
      label=d("btn_confirm",language)
      )
    )
  #
  # Generate the modal panel
  #
  output$panelAlert <- renderUI(mxPanel(
      id="uiConfirmSourceRemove",
      headIcon="warning",
      html=tags$span(d("confirmSourceRemove",lang=language,dict=dict)),
      listActionButton=btnList,
      zIndex = 600,
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

})


observeEvent(input$btnDeleteSourceConfirm,{

  selectedSource <- input$selectSourceLayerEdit 
  language <- reactData$language

  removed <- mxDbDropLayer(selectedSource)

  dict <- .get(config,c("dictionaries","schemaMetadata")) 

  for(i in removed$idView){
    mglRemoveView(idView=i)
  }

  reactData$updateViewListFetchOnly <- runif(1)
  reactData$updateSourceLayerList <- runif(1)  

  output$panelModal <- renderUI(mxPanel(
      id="uiConfirmSourceRemoveDone",
      headIcon="check",
      html=tags$span(d("msgSuccessDelete",lang=language,dict=dict)),
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

})




observeEvent(input$selectSourceLayerEdit,{
  language <- reactData$language
  layer <- input$selectSourceLayerEdit 
  meta <- mxDbGetLayerMeta(layer)
  rolesTarget <- .get(reactUser$role,c("desc","publish"))

  attributesNames <- mxDbGetLayerColumnsNames(layer,notIn=c("gid","geom","mx_t0","mx_t1"))



  # Clean old schema values
  meta = .set(meta,c("origin","sources"),NULL)
  meta = .set(meta,c("text","keywords","words"),NULL)
  meta = .set(meta,c("text","language","languages"),NULL)
  

  jedSchema(
    id="sourceEdit",
    schema = mxSchemaSourceMeta(
      language = language,
      rolesTarget = rolesTarget,
      attributesNames =  attributesNames
      ),
    startVal = meta,
    options = list("no_additional_properties"=FALSE)
    )

  mxDebugToJs(meta)
})

observeEvent(input$sourceEdit_issues,{

  errs = input$sourceEdit_issues$msg

  #
  # Simple validation using editor's issues
  # NOTE: This should be completed using direct validation on the actual data server side
  #
  hasIssues = length(errs) != 0

  mxToggleButton(
    id="btnUpdateSource",
    disable = hasIssues
    )

  reactData$viewSourceEditHasIssues = hasIssues

})

observeEvent(input$btnUpdateSource,{

  layer <- input$selectSourceLayerEdit 
  meta <- input$sourceEdit_values$msg
  country <- reactData$country
  language <- reactData$language
  user <- reactUser$data$id
  dict <- .get(config,c("dictionaries","schemaMetadata")) 

  if(reactData$viewSourceEditHasIssues) return()

  mxDbUpdate(
    table = .get(config,c("pg","tables","sources")),
    idCol = "id",
    id = layer,
    column = "data",
    path = c("meta"),
    value = meta
    )

  #
  # Generate the modal panel
  #
  output$panelModal <- renderUI(mxPanel(
      id="uiConfirmSourceInit",
      headIcon="check",
      html=tags$p(d("msgSuccessUpdate",dict=dict,lang=language)),
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

})



##
## Send the json data when the ui is generated
##
#observeEvent(input$sourceEdit_init,{

#language <- reactData$language 

#view <- reactData$viewSourceGeojson 
#duplicateOf <- .get(view,c("data","source","duplicateOf")) 
#isDuplicated <- length(duplicateOf) > 0

#startVal <- NULL
##
## If there is no doubt
##
#if(isDuplicated){
#startVal <- mxDbGetQuery(sprintf("SELECT data#>'{\"meta\"}' from %1$s WHERE id='%2$s'",
#.get(config,c("pg","tables","sources")),
#duplicateOf[[1]]
#))$data
#}

#})

##
## Validate and lock reactive values.
##


##
## Save the source in db
##

