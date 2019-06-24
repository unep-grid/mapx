
# 
# Main map 
# NOTE: use config file for default.  
#

observe({
  mxCatch("map.R",{

    userRole <- getUserRole()
    project <- reactData$project
    language <- reactData$language
    isMapReady <- reactData$mapIsReady

    if(!noDataCheck(isMapReady)) return()
    if(noDataCheck(userRole)) return()
    if(noDataCheck(project)) return()
    if(noDataCheck(language)) return()

    #dd <- reactViewsProject()

    timer <- mxTimeDiff("Init map")
    projectData <- mxDbGetProjectData(project)
    mapPos <- projectData$map_position
    
    #
    # Set map options
    # 
    mapConfig <- list(
      viewsList = reactViewsCompact(),
      viewsCompact = TRUE,
      mapPosition = mapPos, 
      colorScheme =  query$style
      )

    # init map
    mglInit(mapConfig)
    mxTimeDiff(timer)
})
})


observe({
  eventMapName <- sprintf("mglEvent_%s_ready",.get(config,c("map","id"))) 
  map <- input[[eventMapName]]
  reactData$mapIsReady <- !noDataCheck(map)
})

