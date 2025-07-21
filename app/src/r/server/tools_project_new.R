observeEvent(input$btnShowAddProject, {
  mxCatch(title = "btn edit add project", {
    userRole <- getUserRole()
    isRoot <- isTRUE(userRole$root)
    isCreator <- isTRUE(userRole$project_creator)
    if (!isRoot && !isCreator) {
      return()
    }
    mxProjectAdd()
  })
})
