
#
# Main map
# NOTE: use config file for default.
#
observe({
  mxCatch("map.R", {
    userRole <- getUserRole()
    project <- reactData$project
    language <- reactData$language
    isMapReady <- isTRUE(reactData$mapIsReady)
    if (isMapReady) {
      return()
    }
    if (isEmpty(userRole)) {
      return()
    }
    if (isEmpty(project)) {
      return()
    }
    if (isEmpty(language)) {
      return()
    }

    timer <- mxTimeDiff("INIT MAP")
    useQueryFilters <- !isTRUE(reactData$projectIgnoreQueryFilters)
    projectData <- mxDbGetProjectData(project)
    mapPos <- projectData$map_position
    idTheme <- projectData$theme
    reactData$mapPos <- mapPos


    # init map
    mglInit(list(
      idTheme = idTheme,
      mapPosition = mapPos,
      colorScheme = query$style,
      useQueryFilters = useQueryFilters
    ))

    mxTimeDiff(timer)
  })
})


observeEvent(input$mx_client_ready, {
  reactData$mapIsReady <- mxIsDate(input$mx_client_ready)
})
