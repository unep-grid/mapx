observeEvent(input$btnShowAddProject, {
  mxCatch(title = "btn edit add project", {
    userRole <- getUserRole()
    if (userRole$root || userRole$project_creator) {
      mxProjectAdd()
    }
  })
})
