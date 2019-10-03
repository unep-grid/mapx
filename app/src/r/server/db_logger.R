


observe({
  dbLog <- input$dbLogger
  isolate({
    idUser <- reactUser$data$id
    idProject <- reactData$project
    ipUser <- reactIp()
    mxCatch("save log",{
      if(!mxDbLogValidate(dbLog,idUser,idProject)) return()
      dbLog$date_modified <- Sys.time()
      dbLog$ip_user <- reactIp()
      mxDbAddRow(dbLog, config$pg$tables$logs)
}) 
  })
})


