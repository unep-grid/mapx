

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

    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = reactViewsCompact(),
      viewsCompact = TRUE,
      render = FALSE,
      project = project,
      resetView = TRUE
      )

    mxTimeDiff(timer)
  })
})



