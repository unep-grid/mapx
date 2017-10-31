
# 
# Main map 
# NOTE: use config file for default.  
#

observe({
  mxCatch("map.R",{
    
    
    country <- reactData$country
    language <- reactData$language
    eventMapName <-  sprintf("mglEvent_%s_ready",.get(config,c("map","id"))) 
    map <- input[[eventMapName]]

    if(!noDataCheck(map)) return()
    if(noDataCheck(country)) return()
    if(noDataCheck(language)) return()

    #if(noDataCheck(language)){
      #language <- .get(config,c("languages","default","first"))
    #}

    #if(noDataCheck(country)){
      #country =  .get(config,c("countries","default","first"))
    #}

    countryData <- .get(config,c("countries","table"))
    countryData <- countryData[countryData$iso3 == country,][1,]

    #
    # Set map options
    # 
    mapConfig<- list(
      #
      # Vector tile service : base url
      #
      vtPort = .get(config,c("vt","port")),
      #
      # Default from user
      #
      language = language,
      lat = countryData$lat, 
      lng =  countryData$lng, 
      zoom =  countryData$zoom,
      #
      # value from config
      # 
      id = .get(config,c("map","id")), 
      paths = .get(config,c("map","paths")),
      token = .get(config,c('map','token')),
      minZoom = .get(config,c("map","minZoom")),
      maxZoom = .get(config,c("map","maxZoom")),
      languages = .get(config,c("languages","list")),
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
})
})


