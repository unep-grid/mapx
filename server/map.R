
# 
# Main map 
# NOTE: use config file for default.  
#

observe({


  hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[["map"]][["id"]]) ]])

  if(hasMap) return()

  dat <- reactUser$data

  language <- .get(dat,c("data","user","cache","last_language"))
  country <- .get(dat,c("data","user","cache","last_country"))

  if(noDataCheck(language)){
    language <- .get(config,c("languages","default","first"))
  }

  if(noDataCheck(country)){
    country =  .get(config,c("countries","default","first"))
  }

  countryData <- .get(config,c("countries","table"))

  countryData <- countryData[countryData$iso3 == country,][1,]


  d <- session$clientData

  vtBaseUrl <- sprintf("%1$s//%2$s:%3$s/tile/{z}/{x}/{y}.mvt",
    d$url_protocol,
    d$url_hostname,
    .get(config,c("vt","port"))
    )

  mapConfig<- list(
    # Default from user
    language = language,
    lat = countryData$lat, 
    lng =  countryData$lng, 
    zoom =  countryData$zoom,
    # value from config
    id = .get(config,c("map","id")), 
    token = .get(config,c('map','token')),
    minZoom = .get(config,c("map","minZoom")),
    maxZoom = .get(config,c("map","maxZoom")),
    paths = .get(config,c("map","paths")),
    languages = .get(config,c("languages","list")),
    countries =  .get(config,c("countries","table","iso3")),
    # vt conf
    vtUrl = vtBaseUrl,
    # id of element for listener setting
    idViewsList = .get(config,c("map","idViewsList")),
    idViewsListContainer = .get(config,c("map","idViewsListContainer"))
    )

  # init map
  mglInit(mapConfig)

})


