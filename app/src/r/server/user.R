
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

    token <- reactUser$token
    roles <- getUserRole()
    userEmail <- ifelse(roles$guest, "", userData$email)


    mxUpdateSettings(list(
      user = list(
        roles = roles,
        id = idUser,
        email = userEmail,
        token = token,
        # Alias
        guest = roles$guest,
        root = roles$root,
        developer = roles$developer
      )
    ))

    reactData$updateViewsList <- getUserAtProject()
  },
  priority = 1
) # Should happen every time before map
