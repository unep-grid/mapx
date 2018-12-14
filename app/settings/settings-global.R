#
# Configuration and options
#
config <- list()


#
# Shiny options
#
options(shiny.maxRequestSize=1000*1024^2) 
options(shiny.reactlog=FALSE)
#options(shiny.error = function(e=NULL,b=NULL){
  #browser()
#})

#
# get info about the host
#
config[["system"]] <- list(
  os = Sys.info()[["sysname"]],
  hostname = Sys.info()[["nodename"]],
  hostnameRemote = "map-x-full",
  urlRepositoryIssues = "https://github.com/fxi/map-x-mgl/issues"
  )

config$version = jsonlite::fromJSON('package.json')$version


config[["browser"]] <- list(
  #
  # Expected params requested by getBrowserData js function 
  # and stored in cookies
  #
  params = c(
    "userAgent",
    #"screenHeight",
    #"screenWidth",
    #"screenColorDepth",
    "timeZone",
    "hasLocalStorage",
    "hasSessionStorage",
    "hasGeolocation"
    )  
  )


## NOTE: see mx_helper_map_view_validation.js
## View validation
##
#config[["validation"]] <- list(
  #view = list(
    #rules = list("meta_missing_abstract")
    #)
  #)


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
    encryptKey = "",
    password= "",
    conPool = 5,
    geomCol = "geom",
    tables = list(
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
  dataDir = "/tmp/"
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
config[["srvPath"]] = file.path("src","server")
config[["uiPath"]] = file.path("src","ui")
config[["uploadDirPath"]] = tempdir()

#
# Import dictionaries
#
config[["dictionaries"]] <- list(
  main = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict_main.json"
      )
    ),
  countries = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict_countries.json"
      )
    ),
  languages = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict_languages.json"
      )
    ),
  schemaMetadata = fromJSON(
    file.path(
      config[[c("resources","data")]],"dict_schema_source.json"
      )
    )
  )

#
# Update main dictionary 
#
config[["dict"]] <- .get(config,c("dictionaries","main"))
  #.get(config,c("dictionaries","languages"))
  #)


#
# api configuration : updated live
#
config[["api"]] <- list(
  port = ":8888",
  host = "localhost",
  protocol = "http:"
  )

# map default 
#
config[["map"]] <- list(
  zoom = 4.936283,
  lat = -2.6781140,
  lng = 17.3440031,
  maxZoom = 22,
  minZoom = 0,
  token = "",
  id = "map_main",
  idViewsListContainer = "viewListContainer", # include filters and search field
  idViewsList = "viewListContent", # include views
  paths = list(
    #style = "styles/base/mapx.json",
    sprite = "sprites/sprite"
    #, themes="styles/themes/mapx.json"
    #, style = "styles/base/simple.json"
    )
  )


#
# Default ui and map colors
#
config[["ui"]] <- list(
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


# config map sources
#config[["map"]][["sources"]] = list()

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

# js dot renderer
config[[c("templates","dot")]] <-  list()
config[[c("templates","dot","viewListLegend")]] <- as.character(mxSource("src/ui/view_list_legend.dot.R"))
config[[c("templates","dot","viewListOptions")]] <- as.character(mxSource("src/ui/view_list_options.dot.R"))
config[[c("templates","dot","viewList")]] <- as.character(mxSource("src/ui/view_list.dot.R"))

# html template
config[[c("templates","html")]] <-  list()
config[[c("templates","html","email")]] <- paste(readLines("src/templates/email_simple.html"),collapse="\n")

# text template
config[[c("templates","text")]] <-  list()
config[[c("templates","text","email_password")]] <- paste(readLines("src/templates/email_password.txt"),collapse="\n")
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
# countries data
#
config[["countries"]] <- list()
config[["project"]] <- list()


#
# Admin default
#
config[["project"]] =  list(
  default = "MX-YHJ-6JJ-YLS-SCV-VL1",
  creation = list(
    usersAllowed = c(1)
    )
  )



# read countriea
config[["countries"]]$table <- fromJSON(
  file.path(
    config[[c("resources","data")]],"countries.json"
    )
  )

# all country codes. data from https://github.com/umpirsky/country-list/tree/master/data
config[["countries"]]$codes <- na.omit(
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

# Set data classes. Value will be fetched in dict
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

config[[c("views","type")]] <- list(
  "vt", # vector tiles
  "rt", # raster tiles
  "sm", # story map
  "cc" # custom code
  )

#
# data format
#
config[["data"]] <- list()

# structured list data format
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
# email default
#
config[["mail"]] =  list(
  "bot" = "bot@mapx.org",
  "guest" = "guest@mapx.org",
  "admin" = "frederic.moser@unepgrid.ch"
  )


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


# default data
config[[c("users","data")]] <- list() 

# default data for new users
config[[c("users","data","public")]] <- list(
  user = list(
    cache = list (
      last_project = config[["project"]][['default']],
      last_language = config[["languages"]][["list"]][[1]]
      )
    )
  )

# default data for new  superuser if database is empty
config[["users"]][["data"]][["superUser"]]  <- list(
  user = list(
    cache = list (
      last_project = config[["project"]][['default']],
      last_language = config[["languages"]][["list"]][[1]]
      )
    )
  )


# note : could be searched with function
#mxRecursiveSearch(config$$users$roles,"role","==","admin")
# role definition : 
# each user has a role stored in the database : public, user, editor, admin or superuser.
# each roles is described in the following list.
# access : which parts of the app the user can use.
# read : The user can read content targeting those group.
# publish : The user can write content targeting those group. If the user publish to group he don't have right to edit, he will loose its right.
# edit : The user can edit content targeting those group.
# profile : The user can edit profile of all users in this group.
# admin : The user can edit account of all users in this group.
config[["users"]][["roles"]]<- list(
  list(
    name="public",
    level = 5,
    access = c(),
    read = c("public"),
    publish = c(),
    edit = c(),
    profile = c(),
    admin = c()
    ),
  list(
    name = "user",
    level = 4,
    access = c("dbSelf"),
    read = c("self","public","user"),
    publish = c("self","publisher"),
    edit = c("self"),
    profile = c("self"),
    admin = c()
    ),
  list(
    name = "publisher",
    level = 3,
    access = c("dbSelf"),
    read = c("self","public","user","publisher"),
    publish = c("self","public","user","publisher"),
    edit = c("self","public","user","publisher"),
    profile = c("self"),
    admin = c()
    ),
  list(
    name = "developer",
    level = 2,
    access = c("dbSelf","editCustomView","editDashboard"),
    read = c("self","public","user","publisher"),
    publish = c("self","public","user","publisher"),
    edit = c("self","public","user","publisher"),
    profile = c("self"),
    admin = c()
    ),
  list(
    name = "admin",
    level = 1,
    access = c("dbSelf","editRoles"),
    read = c("self","public","user","publisher","admin"),
    publish = c("self","public","user","publisher","admin"),
    edit = c("self","public","user","publisher","admin"),
    profile = c("self","public","user","publisher","admin"),
    admin = c("public","user","publisher")
    ),
  list(
    name = "superuser",
    level = 0,
    access = c("dbSelf","db","editRoles","appConfig"),
    read = c("self","public","user","publisher","admin","superuser"),
    publish = c("self","public","user","publisher","admin","superuser"),
    edit = c("self","public","user","publisher","admin","superuser"),
    profile = c("self","public","user","publisher","admin","superuser"),
    admin = c("public","user","publisher","admin","superuser")
    )
  )


#
# ssh config for remote command. Not that list names are used in cmd 
# 
#config[["ssh"]] <- list( 
  #HostName="localhost",
  #User="vagrant",
  #Port=2222,
  #UserKnownHostsFile="/dev/null",
  #StrictHostKeyChecking="no",
  #PasswordAuthentication="no",
  #IdentityFile="",
  #IdentitiesOnly="yes",
  #LogLevel="FATAL"
  #)


