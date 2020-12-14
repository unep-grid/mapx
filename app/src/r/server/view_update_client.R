

#
# After project change, send new set of views (initial set of views send when map init)
#
observe({
  userData <- reactUser$data
  mapIsReady <- reactData$mapIsReady
  project <- reactData$project
 
  isolate({

    isMapOk <- isMapReady()
    isGuest <- isGuestUser()
    hasProject <- !noDataCheck(project)
    hasRole <- !noDataCheck(getUserRole())

    if(!isMapOk) return()
    if(!hasRole) return()
    if(!hasProject) return()

    timer <- mxTimeDiff("Sending view")

    mglUpdateViewsList(
      id = .get(config,c("map","id")),
      project = project,
      autoFetchAll = TRUE,
      resetView = TRUE
      )



    mxTimeDiff(timer)
  })
})



