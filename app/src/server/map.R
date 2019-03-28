
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

    timer <- mxTimeDiff("Init map")
    projectData <- mxDbGetProjectData(project)
    mapPos <- projectData$map_position
    
    #
    # Set map options
    # 
    mapConfig <- list(
      #
      # Log level to report
      #
      dbLogLevels = .get(config,c("db_log","levels"),default=c("ERROR")),
      #
      # Intial views
      #
      viewsList = reactViewsCompact(),
      viewsCompact = TRUE,
      #
      # Api settings base url
      #
      apiPort = .get(config,c("api","port")),
      apiHost = .get(config,c("api","host")),
      #
      # Default from user
      #
      project = project,
      language = language,
      mapPosition = mapPos,
      #
      # value from config
      # 
      id = .get(config,c("map","id")), 
      paths = .get(config,c("map","paths")),
      token = .get(config,c('map','token')),
      minZoom = .get(config,c("map","minZoom")),
      maxZoom = .get(config,c("map","maxZoom")),
      languages = .get(config,c("languages","codes")),
      countries =  .get(config,c("countries","table","iso3")),
      #
      # Colorscheme
      #
      colorScheme =  query$style,
      #
      # Elements : id of element for listener setting
      #
      idViewsList = .get(config,c("map","idViewsList")),
      idViewsListContainer = .get(config,c("map","idViewsListContainer"))
      )

    # init map
    mglInit(mapConfig)
    mxTimeDiff(timer)
})
})



observe({
  eventMapName <-  sprintf("mglEvent_%s_ready",.get(config,c("map","id"))) 
  map <- input[[eventMapName]]
  isReady <- !noDataCheck(map)
  reactData$mapIsReady <- isReady
})

