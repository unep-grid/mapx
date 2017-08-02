
observeEvent(input$uploadGeojson,{
  mxCatch(
    title="Upload Geojson",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
     },
    {
    language <- reactData$language 
    country <- reactData$country
    dict <- .get(config,c("dictionaries","schemaMetadata")) 
    msgSave <- d("msgProcessWait", lang=language, dict=dict)
    idUser <- .get(reactUser$data,c("id"))
    canRead <- .get(reactUser$role,c("desc","read"))
    mxProgress(id="dataUploaded", text=paste(msgSave," :  md5 sum " ), percent=50)

    #
    # Get geojson
    #

    view  <- input$uploadGeojson
    gj <- .get(view,c("data","source","data"))
    md5 <- mxMd5(jsonlite::toJSON(gj))
    view <- .set(view,c("data","source","md5"),md5)

    isDuplicate <- FALSE
    #
    # Check if the data alredy exists and available to the user
    # 
    mxProgress(id="dataUploaded", text=paste(msgSave," : duplicate analysis " ), percent=50)

    duplicates = mxDbGetQuery(sprintf(
        "select id,editor,data#>>'{\"meta\",\"text\",\"title\"}' title from %1$s where data#>>'{\"md5\"}' = '%2$s' limit 1",
        .get(config,c("pg","tables","sources")),
        .get(view,c("data","source","md5"))
        ))

    if(!noDataCheck(duplicates)){

      layers <-  mxDbGetLayerTable(
        project = country,
        userId = idUser,
        target = canRead,
        language = language
        )

      isDuplicate <- isTRUE(duplicates$id %in% layers$id)
    }

    if(isDuplicate){

      titles <- lapply(duplicates$title,jsonlite::fromJSON,simplifyVector=F)[[1]]

      names(titles) <- names(d(names(titles),language))

      uiOut <- tagList(
        tags$p(d("msgErrorImport",dict=dict,lang=language)),
        tags$p(d("msgErrorDuplicate",dict=dict,lang=language),': '),
        listToHtmlSimple(list("source_title"=titles),lang=language)
        )

      mxProgress(id="importSource", percent=100, enable=F)

      mxModal(
          id="uiErrorDuplicate",
          content=uiOut,
          addBackground=TRUE,
          textCloseButton=d("btn_close",language)
          )
    }else{

      # save state
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
      mxModal(
          id="modalSourceCreate",
          content=uiOut,
          buttons=btnList,
          addBackground=TRUE,
          textCloseButton=d("btn_close",language)
          )
    }
})
}) 


#
# Send the json data when the ui is generated
#
observeEvent(input$sourceNew_init,{
  mxCatch(
    title="Init Schema for source edition",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
      mxModal(id="modalSourceCreate",close=T)
    },
    {
      language <- reactData$language 
      rolesTarget <- .get(reactUser$role,c("desc","publish"))

      view <- reactData$viewSourceGeojson 

      startVal <- NULL

      jedSchema(
        id="sourceNew",
        schema = mxSchemaSourceMeta(
          language = language,
          rolesTarget = rolesTarget,
          title = .get(view, c("data","title","en")),
          abstract =.get(view, c("data","abstract","en")), 
          extent = .get(view, c("data","geometry","extent")),
          attributesNames = names(.get(view, c("data","attributes")))
          ),
        startVal = startVal,
        options = list("no_additional_properties"=FALSE)
        )
    })
})

#
# Validate and lock reactive values.
#
observeEvent(input$sourceNew_issues,{

  errs = input$sourceNew_issues$msg

  #
  # Simple validation using editor's issues
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
  mxCatch(
    title="Save new source",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
      mxModal(id="modalSourceCreate",close=T)
      mxDbGetQuery(sprintf("delete from mx_sources where id='%s'",idSource)) ;
      mxDbGetQuery(sprintf("drop table if exists %s",idSource)) ;
    },
    {
      meta <-input$sourceNew_values$msg
      country <- reactData$country
      language <- reactData$language
      user <- reactUser$data$id
      view <- reactData$viewSourceGeojson
      type <- "vector"
      gj <- .get(view,c("data","source","data"))
      dict <- .get(config,c("dictionaries","schemaMetadata")) 

      msgSave <- d("msgProcessWait", lang=language, dict=dict)

      mxProgress(id="importSource", text= paste(msgSave,": import in DB"), percent=1)
      if(reactData$viewSourceHasIssues) return()

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
      # Add view to the DB
      #
      mxDbAddGeoJSON(
        geojsonList=gj,
        tableName=idSource,
        onProgress=function(x){
          mxProgress(id="importSource", text= paste(msgSave,": import in DB"), percent=x)
        }
        )
      #
      # Add source row to DB
      #
      mxDbAddRow(
        data=sourceRow,
        table=.get(config,c("pg","tables","sources"))
        )

      #
      # Trigger new view panel
      #
      reactData$triggerNewViewForSourceId <- idSource
      reactData$updateSourceLayerList <- runif(1)  

      mxProgress(id="importSource", percent=100, enable=F)
    })
})


