
mxStoryAutoStart = function(
  idView,
  language="en",
  style
  ){

  views <- mxDbGetViews(
    views = idView,
    allReaders = TRUE,
    allProjects = TRUE
    )


  if(noDataCheck(views) || length(views) !=1) return(FALSE)

  view <- views[[1]]
  type <- .get(view,c("type"))

  if(isTRUE(type != "sm")) return(FALSE)

  project <- .get(view,c("project"))
  firstStep <- .get(view,c("data","story","steps"))[[1]]
  position <- .get(firstStep,c("position"))
  if(noDataCheck(language)) language <- .get(config,c("languages","list"))[[1]]
  if(noDataCheck(style)) style = .get(config,c("ui","colors","default"))

  mapConfig <- list(
    #
    # Bypass everything, start the story map now.
    #
    storyAutoStart=TRUE,
    #
    # Intial views
    #
    viewsList = views,
    viewsCompact = FALSE,
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
    lat = position$lat, 
    lng =  position$lng, 
    zoom =  position$z,
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
    colorScheme = style,
    #
    # Elements : id of element for listener setting
    #
    idViewsList = .get(config,c("map","idViewsList")),
    idViewsListContainer = .get(config,c("map","idViewsListContainer"))
    )

  # init map
  mglInit(mapConfig)

  return(TRUE)
}


