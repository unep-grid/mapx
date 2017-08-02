
# 
# Main map 
# NOTE: use config file for default.  
#

observe({
  mxCatch("map.R",{

    hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[["map"]][["id"]]) ]])

    if(hasMap) return()

    dat <- reactUser$data

    language <- .get(dat,c("data","user","cache","last_language"))
    country <- .get(dat,c("data","user","cache","last_project"))

    if(noDataCheck(language)){
      language <- .get(config,c("languages","default","first"))
    }

    if(noDataCheck(country)){
      country =  .get(config,c("countries","default","first"))
    }

    countryData <- .get(config,c("countries","table"))

    countryData <- countryData[countryData$iso3 == country,][1,]

    #
    # Construct vt base url a service running 
    # on the same location as the current app
    #

    #cdata <- list(
      #protocol = session$clientData$url_protocol,
      #hostname = session$clientData$url_hostname,
      #pathname = session$clientData$url_pathname,
      #port = session$clientData$url_port,
      #search = session$clientData$url_search
      #)

    #vtBaseUrl <- sprintf("%1$s//%2$s%3$s/tile/{z}/{x}/{y}.mvt",
      #cdata$protocol,
      #cdata$hostname,
      #.get(config,c("vt","port"))
      #)

    #browser()
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
      colorScheme = .get(config,c("ui","colors","default")),
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


