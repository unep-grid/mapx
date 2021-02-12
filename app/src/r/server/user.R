
observe({
  project <- reactData$project
  userData <- reactUser$data
  idUser <- userData$id

  if(noDataCheck(project)) return()
  if(noDataCheck(idUser)) return()

  isGuest <- isGuestUser()  
  userEmail <-  ifelse(isGuest,"",userData$email)
  token <- reactUser$token
  roles <- getUserRole()

  mxDebugMsg("Update client user settings")

  mxUpdateSettings(list(
      user = list(
        roles = roles,
        id = idUser,
        guest = isGuest,
        email =  userEmail,
        token = token
      )
))

},priority=1) # Should happen every time before map


