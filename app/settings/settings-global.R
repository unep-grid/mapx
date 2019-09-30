#
# Configuration and options
#
config <- list()

#
# Shiny options
#
options(shiny.maxRequestSize=0) 
options(shiny.reactlog=FALSE)

#
# DB log levels
#
config[["db_log"]] <-  list(
  levels = c("ERROR") # c("LOG","MESSAGE","WARNING","ERROR","USER_ACTION")
  )

#
# get info about the host
#
config[["system"]] <- list(
  os = Sys.info()[["sysname"]],
  hostname = Sys.info()[["nodename"]],
  hostnameRemote = "map-x-full"
  )


config[["links"]] <- list(
  repositoryIssues = "https://github.com/unep-grid/map-x-mgl/issues",
  repositoryWiki = "https://github.com/unep-grid/map-x-mgl/wiki", 
  repositoryWikiMapComposer = "https://github.com/unep-grid/map-x-mgl/wiki/Map-composer"
  )

#
# MapX version
#
config$version = jsonlite::fromJSON('package.json')$version


#
# Set MapX mode
#
#config[["mode"]] <- c("MAINTENANCE")
config[["mode"]] <- c()


#
# Brower config
#
config[["browser"]] <- list(
  #
  # Browser info used for fingerprinting. Used in getBrowserData.
  #
  params = c(
    "language",
    "userAgent",
    "timeZone",
    "hasLocalStorage",
    "hasSessionStorage",
    "hasGeolocation"
    )  
  )

#
# api configuration
#
config[["api"]] <- list(
  port = 3030,
  port_public = 8888,
  host = "localhost",
  host_public = "locahost",
  protocol = "http:",
  upload_size_max = 100 * 1024^2,#100MiB
  routes = list(
    getTile = "/get/tile/{x}/{y}/{z}.mvt",
    getSourceMetadata = "/get/source/metadata/",
    getViewMetadata = "/get/view/metadata/",
    getSourceOverlap = "/get/source/overlap/",
    getSourceValidateGeom = "/get/source/validate/geom",
    getSourceTableAttribute = "/get/source/table/attribute",
    getView = "/get/view/item/",
    getViewsListByProject = "/get/views/list/project/",
    getViewsListGlobalPublic ="/get/views/list/global/public",
    downloadSourceCreate = "/get/source/",
    downloadSourceGet = "",
    uploadImage = "/upload/image/",
    uploadVector = "/upload/vector/",
    postEmail = "/send/mail"
    )
  )

#
# postgres configuration
#
config[["pg"]] = list(
  host ='127.0.0.1',
  dbname = 'mapx',
  port = '5432',
  user = 'mapxw',
  read = list(
    user = "mapxr",
    password=""
    ),
  hostMaster = "127.0.0.1",
  portMaster = "5432",
  encryptKey = "",
  password= "",
  geomCol = "geom",
  tables = list(
    "logs"="mx_logs",
    "users"="mx_users",
    "views"="mx_views",
    "views_latest"="mx_views_latest",
    "projects"="mx_projects",
    "sources"="mx_sources",
    "config"="mx_config"
    )
  )

#
# Geoserver
#
config[["geoserver"]] = list(
  url ='localhost:8080/geoserver',
  urlPublic='http://127.0.0.1:8080/geoserver',
  user = 'admin',
  password = '1234',
  dataDir = "/tmp/",
  dataStore = list(
    sep = "@"
    ),
  services = list(
    names = c("WMS","WFS","WCS"),
    groups = list(
      "gs_ws_a" = c("WMS"),
      "gs_ws_b" = c("WMS","WFS","WCS")
      ),
    groupSep = "@"
    )
  )

#
# web resources : will be exposed to the client using shiny::addRessourcePath. 
#
# List name will be prefix 
# The key is used from the client as :
# http://{location}:{port}/{prefix}/{resource.xxx}
config[["resources"]]  =  list(
  "data"  = file.path("src","data"),
  "sprites" = file.path("src","sprites"),
  "src" = file.path("src"),
  "dist" = file.path("www"),
  "userdata" = file.path("./userdata"), ## expected shared folder from vagrant
  "download" = file.path("/tmp/mapx/download")
  )

#
# create temp dirs if not exists
#
dir.create(.get(config,c("resources","download")),showWarnings=F,recursive=TRUE)

#
# Server and UI folder path
#
config[["srvPath"]] = file.path("src","r","server")
#config[["uiPath"]] = file.path("src","ui")
config[["uploadDirPath"]] = tempdir()

#
# Import dictionaries
#
config[["dictionaries"]] <- list(
  main = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict","dict_main.json"
      )
    ),
  countries = fromJSON(
    file.path(
      #
      # all country codes. data from https://github.com/umpirsky/country-list/tree/master/data
      #
      config[[c("resources","data")]],"dict","dict_countries.json"
      )
    ),
  languages = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict","dict_languages.json"
      )
    )
  )

#
# Update main dictionary 
#
config[["dict"]] <- .get(config,c("dictionaries","main"))


# map default 
#
config[["map"]] <- list(
  zoom = 4.936283,
  lat = -2.6781140,
  lng = 17.3440031,
  maxZoom = 22,
  minZoom = 0,
  token = "",
  id = "map_main"
  )

config[['paths']] = list(
  sprite = "sprites/sprite"
  )


#
# Default ui and map colors
#
config[["ui"]] <- list(
  ids = list(
    idViewsListContainer = "viewListContainer", # include filters and search field
    idViewsList = "viewListContent", # include views
    idDashboards= "mxDashboards",
    idDashboardsButton= "btnTabDashboard",
    idDashboardsPanel= "mxDashboardsPanel"
    ),
  colors = list(
    default = list(
      "mx_ui_text" = "rgba(53,53,53,1)",
      "mx_ui_text_faded" = "rgba(53,53,53,0.5)",
      "mx_ui_hidden" = "rgba(2,186,253,0)",
      "mx_ui_border" = "rgba(156,156,156,0.4)",
      "mx_ui_background" = "rgba(255,255,255,1)",
      "mx_ui_shadow" = "rgba(153,153,153,0.4)",
      "mx_map_background" = "rgba(255,255,255,1)",
      "mx_map_mask" = "rgba(153,153,153,0.4)",
      "mx_map_text" = "rgba(53,53,53,0.9)",
      "mx_map_text_outline" = "rgba(255,255,255,0.5)",
      "mx_map_water" = "rgba(102,102,102,1)",
      "mx_map_road" = "rgba(255,255,255,1)",
      "mx_map_road_border" = "rgba(220,220,220,0.5)",
      "mx_map_building" = "rgba(220,220,220,0.5)",
      "mx_map_admin" = "rgba(127,127,127,1)",
      "mx_map_admin_disputed" = "rgba(127,127,127,1)"
      )
    )
  )


#
# wms sources
#
config[["wms"]] = list(
  list(
    label="datacore",
    value="https://datacore.unepgrid.ch/geoserver/wms"
    ),
  list(
    label="preview",
    value="https://preview.grid.unep.ch/geoserver/wms"
    ),
  list(
    label="forestCover",
    value="https://gis-gfw.wri.org/arcgis/services/forest_change/MapServer/WMSServer"
    ),
  list(
    label="columbia.edu",
    value="https://sedac.ciesin.columbia.edu/geoserver/wms"
    ),
  list(
    label="sampleserver6.arcgisonline.com",
    value="https://sampleserver6.arcgisonline.com/arcgis/services/911CallsHotspot/MapServer/WMSServer"
    ),
  list(
    label="nowcoast.noaa.gov",
    value="https://nowcoast.noaa.gov/arcgis/services/nowcoast/analysis_meteohydro_sfc_qpe_time/MapServer/WmsServer"
    )
  )

#
# Set default variable names
#
config[["variables"]] <- list()

config[[c("variables","time")]] <- list(
  "t0"="mx_t0",
  "t1"="mx_t1"
  ) 

#
# Templates
#
config[["templates"]] <- list()

# html template
config[[c("templates","html")]] <-  list()
config[[c("templates","html","email")]] <- paste(readLines("src/templates/email_simple.html"),collapse="\n")

# text template
config[[c("templates","text")]] <-  list()
config[[c("templates","text","email_error")]] <- paste(readLines("src/templates/email_error.txt"),collapse="\n")
config[[c("templates","text","widget_function")]] <- paste(readLines("src/templates/widget_function.js"),collapse="\n")
config[[c("templates","text","custom_view")]] <- paste(readLines("src/templates/custom_view.js"),collapse="\n")
config[[c("templates","text","custom_paint")]] <- paste(readLines("src/templates/custom_paint.json"),collapse="\n")
config[[c("templates","text","custom_paint_example")]] <- paste(readLines("src/templates/custom_paint_example.json"),collapse="\n")

#
# default languages
#
config[["languages"]] <- list()
config[["languages"]][["list"]] <- list(
  "English ( english )" = "en",
  "Français ( french )" = "fr",
  "Español ( spanish )" = "es",
  "Русский ( russian )" = "ru",
  "中国 ( chinese )" = "zh",
  "Deutsch ( german )" = "de",
  "বাংলা  (bengali)" = "bn",
  "فارسی (Dari/Persian)" = "fa",
  "پښتو (Pashto)"="ps"
  )
config[["languages"]][["codes"]] <- unname(unlist(config[["languages"]][["list"]]))

config[["language"]] <- list(
  "default"="en"
  )
#
# Dictionnary of badwords for the profanity checker
#
config[["badwords"]] = list(
  "path" = file.path(
    config[[c("resources","data")]],
    "badwords"
    ),
  "words" = list()
  )

for(l in .get(config,c("languages","list"))){
  dFile <- file.path(.get(config,c("badwords","path")),l)
  if(file.exists(dFile)){
    config[[c("badwords","words",l)]] <- readLines(dFile)
  }
}

#
# Project configuration
#
config[["project"]] <- list()

#
# Admin default
#
config[["project"]] <- list(
  default = "MX-YHJ-6JJ-YLS-SCV-VL1",
  creation = list(
    usersAllowed = c(1)
    )
  )

#
# Root mode
#
config[["root_mode"]] <- list(
  #
  # Members of the root group
  #
  members = c(1) 
  )

#
# countries configuration
#
config[["countries"]] <- list()

#
# Countries names and id without NA
#
config[[c("countries","table")]] <- na.omit(
  .get(config,c("dictionaries","countries"))
  )

#
# Set default no data keys
#
config[["noData"]] <- list(
  "noData",
  "noVariable",
  "noLayer",
  "noTitle",
  "noSelect",
  "noFilter"
  )


#
# views configuration
#
config[["views"]] = list()

#
# Set data classes. Value will be fetched in dict
#
config[[c("views","classes")]] <- list(
  "oth", # other (default)
  "sat", # satellite imagery
  "ext", # extractive
  "dev", # development
  "soc", # social
  "pol", # political
  "env", # environment
  "nrg", # energy
  "inf", # infrastructure
  "str"
  )

#
# Views type
#
config[[c("views","type")]] <- list(
  "vt", # vector tiles
  "rt", # raster tiles
  "sm", # story map
  "cc" # custom code
  )

#
# Data configuration
#
config[["data"]] <- list()

#
# File format meta
#
# https://en.wikipedia.org/wiki/GIS_file_formats
# http://www.w3schools.com/tags/att_input_accept.asp
config[[c("data","format")]] <- list(
  list(
    name = "ESRI Shapefile",
    type = "vector",
    driver = "ESRI Shapefile",
    fileExt = c(".shp",".shx",".dbf",".prj"),
    multiple = TRUE
    ),
  list(
    name = "GeoJSON",
    type = "vector",
    fileExt = c(".geojson",".json"),
    driver = "GeoJSON",
    multiple = FALSE
    ),
  list(
    name = "GML",
    driver = "GML",
    type = "vector",
    fileExt = c(".kml"),
    multiple = FALSE
    ),
  list(
    name = "GPX",
    driver = "GPX",
    type = "vector",
    fileExt = c(".gpx"),
    multiple = FALSE
    ),
  list(
    name = "GPKG",
    driver = "GPKG",
    type = "vector",
    fileExt = c(".gpkg"),
    multiple= FALSE
    ),
  list(
    name = "KML",
    driver = "KML",
    type = "vector",
    fileExt = c(".kml"),
    multiple = FALSE
    ),
  list(
    name = "SQLite",
    driver = "SQLite",
    type = "vector",
    fileExt = c(".sqlite"),
    multiple = FALSE
    ),
  list(
    name = "DXF",
    driver = "DXF",
    type = "vector",
    fileExt = c(".dxf"),
    multiple = FALSE
    ),
  list(
    name = "CSV",
    driver = "CSV",
    type = "vector",
    fileExt = c(".csv"),
    multiple = FALSE
    )
  )


#
# Email configuration
#
config[["mail"]] =  list(
  "bot" = "bot@localhost",
  "guest" = "guest@localhost",
  "admin" = "admin@localhost"
  )

#
# default user value
#
config[["users"]] <- list(
  defaultEmail =  config[[c("mail","guest")]],
  defaultName = "user",
  loginTimerMinutes = 20,
  loginMaxAttempts = 5,
  cookieExpireDays = 7,
  cookieName = "mx_token",
  apiExpireDays = 1
  )

#
# default data
#
config[[c("users","data")]] <- list() 

#
# default data for new users
#
config[[c("users","data","public")]] <- list(
  user = list(
    cache = list (
      last_project = config[["project"]][['default']],
      last_language = config[["languages"]][["list"]][[1]]
      )
    )
  )

#
# default data for new  superuser if database is empty
#
config[["users"]][["data"]][["superUser"]]  <- list(
  user = list(
    cache = list (
      last_project = config[["project"]][['default']],
      last_language = config[["languages"]][["list"]][[1]]
      )
    )
  )

