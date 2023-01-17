
observe(
  {
    project <- reactData$project
    userData <- reactUser$data
    idUser <- userData$id

    if (noDataCheck(project)) {
      return()
    }
    if (noDataCheck(idUser)) {
      return()
    }

    isGuest <- isGuestUser()
    isRoot <- mxIsUserRoot(idUser)
    isDev <- mxIsUserDev(idUser)

    userEmail <- ifelse(isGuest, "", userData$email)
    token <- reactUser$token
    roles <- getUserRole()


    mxUpdateSettings(list(
      user = list(
        roles = roles,
        id = idUser,
        guest = isGuest,
        root = isRoot,
        dev = isDev,
        email = userEmail,
        token = token
      )
    ))

    reactData$updateViewsList <- getUserAtProject()
  },
  priority = 1
) # Should happen every time before map
