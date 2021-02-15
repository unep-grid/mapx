

#
# After project change, send new set of views (initial set of views send when map init)
#
observe({
  userData <- reactUser$data
  project <- reactData$project 

  isolate({
  
    isMapOk <- isMapReady()
    isGuest <- isGuestUser()
    hasProject <- !noDataCheck(project)
    hasRole <- !noDataCheck(getUserRole())

    if(!isMapOk) return()
    if(!hasRole) return()
    if(!hasProject) return()

    mxDebugMsg("Update views request ( autoFetchAll )")

    mglUpdateViewsList(
      id = .get(config,c("map","id")),
      project = project,
      autoFetchAll = TRUE,
      resetView = TRUE
      )

  })
})



