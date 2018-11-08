#
# Project members
#
reactTableEditableUsers <- reactive({

  update <- reactData$updateRoleList
  out <- data.frame()
  userData <- reactUser$data
  project <- reactData$project
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)

  if( isAdmin ){
    out <-  mxDbGetProjectMembers(project)
  }

  return(out)

})


