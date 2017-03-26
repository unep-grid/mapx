
observeEvent(input$uploadGeojson,{

  library(digest)
  language <- reactData$language 
  dict <- .get(config,c("dictionaries","schemaMetadata")) 
  msgSave <- d("msgProcessWait", lang=language, dict=dict)


  mxProgress(id="dataUploaded", text=paste(msgSave," :  md5 sum " ), percent=50)

  #
  # Get geojson
  #

  view  <- input$uploadGeojson
  gj <- .get(view,c("data","source","data"))
  md5 <- digest(toJSON(gj),serialize=F) 
  view <- .set(view,c("data","source","md5"),md5)

  #
  # Check if the data alredy exists
  #  - If exists, populate schema with existing meta data
  #  - If it does not exists, add a new table, add an empty schema
  #
  
  mxProgress(id="dataUploaded", text=paste(msgSave," : duplicate analysis " ), percent=50)
  duplicateOf = mxDbGetQuery(sprintf(
      "select id duplicate from %1$s where data#>>'{\"md5\"}' = '%2$s'",
      .get(config,c("pg","tables","sources")),
      .get(view,c("data","source","md5"))
      ))$duplicate

  # save state
  view <- .set(view,c("data","source","duplicateOf"),duplicateOf)
  reactData$viewSourceGeojson <- view

  mxProgress(id="dataUploaded", percent=100, enable=F)
  #
  # json editor output
  #
  uiOut = tagList(
    jedOutput(id="sourceNew")
    )

  #
  # List of button for the modal window
  #
  btnList <- list(
    actionButton(
      inputId="btnSaveNewSource",
      label=d("btn_save",language)
      )
    )

  #
  # Generate the modal panel
  #
  output$panelModal <- renderUI(mxPanel(
      id="uiConfirmSourceInit",
      headIcon="pencil",
      html=uiOut,
      listActionButton=btnList,
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

}) 


#
# Send the json data when the ui is generated
#
observeEvent(input$sourceNew_init,{

  language <- reactData$language 
  rolesTarget <- .get(reactUser$role,c("desc","publish"))

  view <- reactData$viewSourceGeojson 
  duplicateOf <- .get(view,c("data","source","duplicateOf")) 
  isDuplicated <- length(duplicateOf) > 0

  startVal <- NULL
  #
  # If there is no doubt
  #
  if(isDuplicated){
    startVal <- mxDbGetQuery(sprintf("SELECT data#>'{\"meta\"}' from %1$s WHERE id='%2$s'",
      .get(config,c("pg","tables","sources")),
      duplicateOf[[1]]
      ))$data
  }

  jedSchema(
    id="sourceNew",
    schema = mxSchemaSourceMeta(
      language = language,
      rolesTarget = rolesTarget,
      defaults = reactData$viewSourceGeojson
      ),
    startVal = startVal,
    options = list("no_additional_properties"=FALSE)
    )

})

#
# Validate and lock reactive values.
#
observeEvent(input$sourceNew_issues,{

  errs = input$sourceNew_issues$msg

  #
  # Simple validation using editor's issues
  # NOTE: This should be completed using direct validation on the actual data server side
  #
  hasIssues = length(errs) != 0

  mxToggleButton(
    id="btnSaveNewSource",
    disable = hasIssues
    )

  reactData$viewSourceHasIssues = hasIssues

})

#
# Save the source in db
#
observeEvent(input$btnSaveNewSource,{
  meta <-input$sourceNew_values$msg
  country <- reactData$country
  language <- reactData$language
  user <- reactUser$data$id
  view <- reactData$viewSourceGeojson
  type <- "vector"
  gj <- .get(view,c("data","source","data"))
  dict <- .get(config,c("dictionaries","schemaMetadata")) 

  msgSave <- d("msgProcessWait", lang=language, dict=dict)

  mxProgress(id="importSource", text= paste(msgSave,": import in DB"), percent=10)

  if(reactData$viewSourceHasIssues) return()

  tryCatch({
    #
    # Source id = layer id = table name
    #
    idSource <- randomString(
      prefix=sprintf("mx_%1$s_%2$s_",tolower(country),type),
      splitIn=3,
      addLETTERS=F,
      addLetters=T,
      splitSep="_",
      sep = "_"
      )

    

    #
    # Create new row
    #
    sourceRow = list(
      id = idSource,
      country = country,
      editor = user,
      target = .get(meta,c("access","roles","names"),flattenList=T),
      date_modified = Sys.time(),
      data = list(
        meta = meta,
        md5 = .get(view,c("data","source","md5"))
        ),
      type = "vector"
      )

    #
    # Add source row to DB
    #
    mxDbAddRow(
      data=sourceRow,
      table=.get(config,c("pg","tables","sources"))
      )

    #
    # Add view to the DB
    #
    mxDbAddGeoJSON(
      geojsonList=gj,
      tableName=idSource
      )

  reactData$triggerNewViewForSourceId <- idSource

  reactData$updateSourceLayerList <- runif(1)  

  },error=function(cond){

    mxDbGetQuery(sprintf("delete from mx_sources where id='%s'",idSource)) ;
    mxDbGetQuery(sprintf("drop table if exists %s",idSource)) ;

    output$panelModal <- renderUI(mxPanel(
        id="uiSuccessufulImport",
        headIcon="times",
        html=tags$p(d("msgErrorImport",dict=dict,lang=language)),
        addCloseButton=TRUE,
        background=TRUE,
        closeButtonText=d("btn_close",language)
        ))

    mxDebugToJs(cond$message)
  })

  mxProgress(id="importSource", percent=100, enable=F)

})


#
# Optional new view panel
#
observeEvent(reactData$triggerNewViewForSourceId,{

  view  <- input$uploadGeojson
  language <- reactData$language
  attributes <- .get(view,c("data","attributes"))
  idSource <- 
  dict <- .get(config,c("dictionaries","schemaMetadata")) 
 
  ui <- tagList(
    tags$h3(d("optionalViewTitle",lang=language,dict=dict)),
    tags$p(d("optionalViewText",lang=language,dict=dict)),
    selectInput("selectOptionalViewAttribute",
      label = d("selectOptionalViewAttribute",lang=language,dict=dict),
      choices = tolower(names(attributes))
      ),
    uiOutput("summaryOptionalViewAttribute")
    )

  btnList <- list(
    actionButton("btnOptionalViewCreate",label=d("btn_create",lang=language)),
    actionButton("btnOptionalViewCancel",label=d("btn_finish",lang=language)) 
    )

    output$panelModal <- renderUI(mxPanel(
        id="uiSuccessufulImport",
        headIcon="plus",
        html=ui,
        addCloseButton=FALSE,
        hideHeadButtonClose=TRUE,
        listActionButton=btnList,
        background=TRUE,
        ))

})


observeEvent(input$selectOptionalViewAttribute,{
  sourceId <- reactData$triggerNewViewForSourceId 
  attribute <- input$selectOptionalViewAttribute
  language <- reactData$language 
  dict <- .get(config,c("dictionaries","schemaMetadata")) 

   summary <-  mxDbGetLayerSummary(
      layer=sourceId,
      variable=attribute,
      geomType=NULL,
      language=language
      )
 
  output$summaryOptionalViewAttribute <- renderUI(summary$html)

})



#
#
#
observeEvent(input$btnOptionalViewCancel,{
  language <- reactData$language
  dict <- .get(config,c("dictionaries","schemaMetadata")) 
 
  #
  # Generate the modal panel
  #
  output$panelModal <- renderUI(mxPanel(
      id="uiSuccessufulImport",
      headIcon="check",
      html=tags$p(d("msgSuccessImport",dict=dict,lang=language)),
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))
})

#
# Optional view create
#
observeEvent(input$btnOptionalViewCreate,{

  selectedAttribute <- input$selectOptionalViewAttribute
  dict <- .get(config,c("dictionaries","schemaMetadata")) 
  view  <- input$uploadGeojson
  language <- reactData$language
  country <- reactData$country
  user <- reactUser$data$id
  meta <- input$sourceNew_values$msg
  idSource <- reactData$triggerNewViewForSourceId
  msgSave <- d("msgProcessWait", lang=language, dict=dict)

    # 
    # New view id
    #
    idView <- randomString(
      prefix="MX-",
      splitIn=3,
      addLETTERS=T,
      addLetters=F,
      splitSep="-",
      sep = "-"
      )

  tryCatch({
  mxProgress(id="importSource", text=paste(msgSave,": create a new empty view "), percent=90)

  #
  # New view squeleton
  #
  newView <- list(
    id = idView,
    country = country,
    editor = user,
    target = list("self"),
    date_modified = Sys.time(),
    data = list(
      title = .get(meta,c("text","title")),
      abstract = .get(meta,c("text","abstract")
        )
      ),
      type = "vt"
    )
 
  #
  # Get summary for the attributes with the less occurences.
  #
  attributes = .get(view,c("data","attributes"))
  
  if(noDataCheck(selectedAttribute)){ 
    selectedAttribute =  tolower(names(which(min(sapply(attributes,length)) == sapply(attributes,length))))[[1]]
  }


  sourceSummary <- mxDbGetLayerSummary(
    layer = idSource,
    variable = selectedAttribute
    )

  newView <- mxUpdateDefViewVt(newView, sourceSummary$list)

  #
  # Add the view to the db
  #
  mxDbAddRow(
    data=newView,
    table=.get(config,c("pg","tables","views"))
    )

  newView$`_edit` = TRUE 


  mglSetSourcesFromViews(
    id = .get(config,c("map","id")),
    viewsList = newView,
    render = FALSE,
    country = country
    )


  mxProgress(id="importSource", enable=FALSE)
  #
  # Generate the modal panel
  #
  output$panelModal <- renderUI(mxPanel(
      id="uiSuccessufulImport",
      headIcon="check",
      html=tags$p(d("msgSuccessImport",dict=dict,lang=language)),
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))


  #
  # Remove original geojson
  #
  mglRemoveView(
    idView = .get(view,"id") 
    )

  },error=function(cond){

   mxDbGetQuery(sprintf("delete from mx_views where id='%s'",idView)) ;
   mxDbGetQuery(sprintf("delete from mx_sources where id='%s'",idSource)) ;
   mxDbGetQuery(sprintf("drop table if exists %s",idSource)) ;

   output$panelModal <- renderUI(mxPanel(
      id="uiErrorImport",
      headIcon="times",
      html=tags$p(d("msgErrorImport",dict=dict,lang=language)),
      addCloseButton=TRUE,
      background=TRUE,
      closeButtonText=d("btn_close",language)
      ))

   mxDebugToJs(
     list(
       cond = cond$message,
       stack = traceback()
       )
     )
  })

  reactData$updateViewListFetchOnly <- runif(1)
  mxProgress(id="importSource", enable=FALSE)
})


