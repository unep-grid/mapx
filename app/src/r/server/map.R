
# 
# Main map 
# NOTE: use config file for default.  
#
observe({
  mxCatch("map.R",{

    userRole <- getUserRole()
    project <- reactData$project
    language <- reactData$language
    isMapReady <- isTRUE(reactData$mapIsReady)

    if(isMapReady) return()
    if(noDataCheck(userRole)) return()
    if(noDataCheck(project)) return()
    if(noDataCheck(language)) return()


    timer <- mxTimeDiff("Init map")
    projectData <- mxDbGetProjectData(project)
    mapPos <- projectData$map_position


    #
    # Set map options
    # 
    mapConfig <- list(
      mapPosition = mapPos, 
      colorScheme =  query$style
      )

    mxDebugMsg("INIT MAP")
    # init map
    mglInit(mapConfig)
    mxTimeDiff(timer)
})
})


observeEvent(input$mx_client_ready,{
  reactData$mapIsReady <- mxIsDate(input$mx_client_ready)
})

