
#
# Initial write
#
obsIpData <- observe({

  data <- reactIpInfo()
  idProject <- reactData$project
  isGuest <- isGuestUser()
  idUser <- reactUser$data$id
  ipUser <- data$ip

  isNotComplete <- noDataCheck(idUser) || 
    noDataCheck(idProject) || 
    noDataCheck(data) || 
    noDataCheck(ipUser) ||
    noDataCheck(isGuest)


  if(isNotComplete){
    return()
  }

  obsIpData$destroy();

  mxDbLogger("USER_ACTION", list(
      side = "app",
      id_log = "session_start",
      id_project = idProject ,
      id_user = idUser,
      ip_user = ipUser,
      is_guest = isGuest,
      data = data
      ))

  session$onSessionEnded(function() {

    mxDbLogger("USER_ACTION", list(
        side = "app",
        id_log = "session_end",
        id_project = idProject,
        id_user = idUser,
        ip_user = ipUser,
        is_guest = isGuest,
        data = list()
        ))
})
})


