#
# Project members
#
reactTableUsers <- reactive({
  update <- reactData$updateRoleList
  project <- reactData$project
  out <- mxDbGetProjectMembers(project)
  return(out)
})

reactTableEditableUsers <- reactive({
  out <- data.frame()
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  if( isAdmin ){
    out <-  reactTableUsers()
  }
  return(out)
})


