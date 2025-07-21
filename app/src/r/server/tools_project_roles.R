observeEvent(input$btnShowRoleManager, {
  mxCatch(title = "btn show role manager", {
    userRole <- getUserRole()
    isAdmin <- isTRUE(userRole$admin)
    ready <- isMapReady()

    if (!isAdmin || !ready) {
      return()
    }

    mxProjectManageRoles()
  })
})
