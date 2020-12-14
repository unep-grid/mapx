source('global.R')

titleView <- ""
msgSuccess <- ""
msgError <- ""

tryCatch({
  args <- commandArgs(trailingOnly=TRUE)
  cgs <- readRDS(args[1])
  titleView <<- mxDbGetViewsTitle(cgs$idView, asNamedList=F)$title
  msgSuccess <<- sprintf("WMS layer updated successfully for view %1$s", titleView)
  msgError <<- sprintf("WMS layer not updated for view %1$s", titleView)

  updated <- mxPublishGeoServerViewAuto(
    idView = cgs$idView,
    publish = cgs$publish
  )

  if(updated){
    mxSendMail(
      to=cgs$email,
      subject = msgSuccess,
      content= msgSuccess
    )
  }
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
