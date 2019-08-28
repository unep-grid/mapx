


observe({
  dbLog <- input$dbLogger
  isolate({
    idUser <- reactUser$data$id
    idProject <- reactData$project
    mxCatch("save log",{
      if(!mxDbLogValidate(dbLog,idUser,idProject)) return()
      dbLog$date_modified <- Sys.time()
      mxDbAddRow(dbLog, config$pg$tables$logs)
}) 
  })
})


