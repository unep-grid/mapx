
observeEvent(reactData$geojsonProgressData,{
  d  <- reactData$geojsonProgressData
  nFeatures <- d$nFeatures
  idSource <- d$idSource
  sourceRow <- d$sourceRow
  idProgress <- d$idProgress
  onDone <- d$onDone
  #
  # Create temporary observer for progress
  #
  uploadObserver <- observe({

    invalidateLater(1000, session)

    isolate({
      
      tableExists <- mxDbExistsTable(idSource)

      if(tableExists){

        count <- mxDbGetQuery(sprintf("
            SELECT count(*) as total
            FROM %1$s"
            ,idSource))
        count <- count$total
        percent <- ((count/nFeatures)*100)-1

        mxProgress(
          id = idProgress,
          text = sprintf("Importation of %1$s/%2$s features",count,nFeatures), 
          percent = percent
          )

        if( percent>=99 ){
          #
          # Add source row to DB
          #
        
          mxDbAddRow(
            data = sourceRow,
            table = .get(config,c("pg","tables","sources"))
            )

          mxProgress(
            id = idProgress, 
            text = "Done.",
            percent = 100
            )
          #
          # Trigger new view (see in source_vt_create)
          #
          reactData$triggerNewViewForSourceId <- idSource
          reactData$updateSourceLayerList <- runif(1)  

          #
          # Callback
          #
          if(!noDataCheck(onDone) && class(onDone)=="function"){
            onDone()
          }
          #
          # Destroy Observer
          #
          uploadObserver$destroy()


        }

      }
    })
  })
})
