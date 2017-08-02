
observeEvent(input$btnUploadSources,{

  language <- reactData$language 

  #
  # json editor output
  #
  uiOut = tagList(
     fileInput('fileGeojson', 
       'Choose geojson File',
       accept=c('application/vnd.geo+json','.json','.geojson')
       ),
     jedOutput(id="sourceNewUpload")
    )

  #
  # List of button for the modal window
  #
  btnList <- list(
    actionButton(
      inputId="btnImportNewSource",
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


})


#
# Init schema editor
#
observeEvent(input$sourceNewUpload_init,{

  language <- reactData$language 
  rolesTarget <- .get(reactUser$role,c("desc","publish"))

  jedSchema(
    id="sourceNewUpload",
    schema = mxSchemaSourceMeta(
      language = language,
      rolesTarget = rolesTarget
      ),
    startVal = NULL
    )

})


#
# File is there
#
observe({
  
  msg <- input$sourceNewUpload_issues$msg
  file <- input$fileGeojson$datapath
  noFile <- noDataCheck(file) || !file.exists(file)
  hasIssues <- !noDataCheck(msg) || length(msg) > 0
  disableUpload <- noFile || hasIssues 

  mxToggleButton(
    id="btnImportNewSource",
    disable = disableUpload
    )

})


#
# Validate and lock reactive values.
#
observeEvent(input$btnImportNewSource,{
  mxCatch(title="Upload new source",{

    mxToggleButton(
    id="btnImportNewSource",
    disable = TRUE
    )


    filePath <- input$fileGeojson$datapath
    meta <- input$sourceNewUpload_values$msg
    country <- reactData$country
    language <- reactData$language
    user <- reactUser$data$id
    type <- "vector"

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
    # Start progress
    #
    mxProgress(id=idSource, text= "Start conversion and importation into databas", percent=1)
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
        md5 = mxMd5(filePath)
        ),
      type = "vector"
      )

    #
    # Add view to the DB
    #
    mxDbAddGeoJSON(
      geojsonPath=filePath,
      tableName=idSource
      )

    nFeatures <- mxDbGeojsonCountFeatures(filePath) 

    #
    # Create temporary observer for progress
    #
    uploadObserver <- observe({

      invalidateLater(1000, session)

      tableExists <- mxDbExistsTable(idSource)

      if(tableExists){
        count <- mxDbGetQuery(sprintf("select count(*) from %1$s",idSource))$count
        percent <- ((count/nFeatures)*100)-1

        mxProgress(id=idSource, text= sprintf("Importation of %1$s/%2$s features",count,nFeatures), percent=percent)

        if(percent>=99){
          #
          # Add source row to DB
          #
          mxDbAddRow(
            data=sourceRow,
            table=.get(config,c("pg","tables","sources"))
            )

        mxProgress(id=idSource, text= "Done.", percent=100)
          #
          # Trigger new view (see in source_vt_create)
          #
          reactData$triggerNewViewForSourceId <- idSource
          reactData$updateSourceLayerList <- runif(1)  
          
          #
          # Destroy Observer
          #
          uploadObserver$destroy()


        }

      }
    })



    })
})




