

#
# After project change, send new set of views (initial set of views send when map init)
#
observeEvent(reactData$updateViewsList,{

  project <- reactData$project 
  isMapOk <- isMapReady()
  isGuest <- isGuestUser()
  hasProject <- !noDataCheck(project)
  hasRole <- !noDataCheck(getUserRole())

  if(!isMapOk) return()
  if(!hasRole) return()
  if(!hasProject) return()

  mxDebugMsg('PROJECT UPDATE VIEWS for' + project)

  mglUpdateViewsList(
    id = .get(config,c("map","id")),
    project = project,
    resetView = TRUE
  )

})



