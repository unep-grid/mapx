source('global.R')


titleSource <- ""
msgSuccess <- ""
msgError <- ""

tryCatch({
  args <- commandArgs(trailingOnly=TRUE)
  cgs <- readRDS(args[1])
  titleSource <<- mxDbGetLayerTitle(cgs$idSource, asNamedList=F)
  msgSuccess <<- sprintf("WMS layer updated successfully for source %1$s", titleSource)
  msgError <<- sprintf("WMS layer not updated for source %1$s", titleSource)

  mxUpdateGeoserverSourcePublishing(
    idProject = cgs$project,
    idSource = cgs$idSource,
    idGroups = as.list(cgs$idGroupsServices),
    idGroupsOld = as.list(cgs$idGroupsServicesOld)
  )

  mxSendMail(
    to=cgs$email,
    subject = msgSuccess,
    content= msgSuccess
  )
  print('Finished success')

},error=function(e){
  mxSendMail(
    to=cgs$email,
    subject = msgError,
    content = msgError
  )
  mxSendMail(
      to = config$mail$admin,
      subject = msgError,
      content = sprintf("%1$s: %2$s", msgError, as.character(e))
    )
  print('Finished with errors')
}, finally={
  mxDbPoolClose()
})

