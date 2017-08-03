
observeEvent(input$uploadGeojson,{
  mxCatch(
    title="Upload Geojson",
    onError = function(){
      mxProgress(id=idProgress, percent=100, enable=F)
     },
    {
    language <- reactData$language 
    country <- reactData$country
    dict <- .get(config,c("dictionaries","schemaMetadata")) 
    #msgSave <- d("msgProcessWait", lang=language, dict=dict)
    idUser <- .get(reactUser$data,c("id"))
    canRead <- .get(reactUser$role,c("desc","read"))
    idProgress <- "dataUpload"
    idModal <- idProgress
    mxProgress(id=idProgress, text="Check md5 sum", percent=50)

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
    mxProgress(id=idProgress, text=paste(" Duplicate analysis " ), percent=50)

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

      mxProgress(id=idProgress, percent=100, enable=F)

      mxModal(
          id=idModal,
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
          id=idModal,
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
      mxProgress(id=idProgress, percent=100, enable=F)
      mxModal(id=idModal,close=T)
    },
    {
      language <- reactData$language 
      rolesTarget <- .get(reactUser$role,c("desc","publish"))
      view <- reactData$viewSourceGeojson 
      idProgress <- "dataUpload"
      idModal <- idProgress

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
      mxProgress(id=idProgress, percent=100, enable=F)
      mxModal(id=idModal,close=T)
      mxDbGetQuery(sprintf("delete from mx_sources where id='%s'",idSource)) ;
      mxDbGetQuery(sprintf("drop table if exists %s",idSource)) ;
    },
    {

      idModal <- "dataUpload"
      idProgress <- "dataUpload"
      meta <-input$sourceNew_values$msg
      country <- reactData$country
      language <- reactData$language
      user <- reactUser$data$id
      view <- reactData$viewSourceGeojson
      hasIssue <- reactData$viewSourceHasIssues
      type <- "vector"
      gj <- .get(view,c("data","source","data"))
      dict <- .get(config,c("dictionaries","schemaMetadata")) 

      #msgSave <- d("msgProcessWait", lang=language, dict=dict)


      if( isTRUE(hasIssue) ) stop("View source had issues, but save button was pressed")

      #
      # Close modal
      #
      mxModal(id=idModal,close=T)

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

      mxProgress(id=idProgress, text= "Start importation, please wait", percent=1)
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
        )

      #
      # Trigger progress
      #
      reactData$geojsonProgressData <- list(
        nFeatures = length(gj$features),
        sourceRow = sourceRow,
        idSource = idSource,
        idProgress = idProgress,
        onDone =  function(){
          #
          # Remove original geojson
          #
          mglRemoveView(
            idView = .get(view,"id") 
            )

        }
        )


    })
})


