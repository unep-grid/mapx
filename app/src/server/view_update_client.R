

#
# After project change, send new set of views (initial set of views send when map init)
#
observe({

  project <- reactData$project
  userData <- reactUser$data

  isolate({

    mapIsReady <- isMapReady()
    role <- getUserRole()

    if(!mapIsReady) return()
    if(noDataCheck(role)) return()
    if(noDataCheck(project)) return()

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



