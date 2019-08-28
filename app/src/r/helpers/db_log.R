
mxDbLogValidate <- function(dbLog,idUser,idProject){
  isValid <- FALSE


  tryCatch({
    isValid <-
      !noDataCheck(dbLog) &&
      is.list(dbLog) &&
      !noDataCheck(dbLog$id_log) &&
      is.character(dbLog$id_log) &&
      !noDataCheck(dbLog$id_user) &&
      dbLog$id_user == idUser &&
      !noDataCheck(dbLog$id_project) &&
      dbLog$id_project == idProject &&
      dbLog$level %in% config$db_log$levels &&
      object.size(dbLog) < 2^10*10
  },
  error = function(cond){})

  return(isTRUE(isValid))
}

mxDbLogger <- function(level, opt) {

  if( ! level %in% config$db_log$levels ) return()

  dbLog <- list()
  def <- list(
    level = level,
    side = 'app',
    id_log = NULL,
    id_user = 96,
    is_guest = TRUE,
    id_project = config$project$default,
    data = list() # set as {} in db. Which is ok.
    )

  for(i in names(def)){
    if(noDataCheck(opt[i])){
      dbLog[i] <- def[i]
    }else{
      dbLog[i] <- opt[i]
    }
  }

  isValid <- mxDbLogValidate(dbLog,opt$id_user,opt$id_project) 

  if( isValid ){
    dbLog$date_modified <- Sys.time()
    mxDbAddRow(dbLog, config$pg$tables$logs)
  }
}
