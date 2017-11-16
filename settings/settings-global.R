#
# Configuration and options
#
config <- list()


#
# Shiny options
#
options(shiny.maxRequestSize=1000*1024^2) 
options(shiny.reactlog=TRUE)
#
# get info about the host
#
config[["system"]] <- list(
  os = Sys.info()[["sysname"]],
  hostname = Sys.info()[["nodename"]],
  hostnameRemote = "map-x-full"
  )
#
# postgres configuration
#
config[["pg"]] = list(
    host ='127.0.0.1',
    dbname = 'mapx',
    port = '5432',
    user = 'mapxw',
    encryptKey = "",
    password= "",
    conPool = 5,
    geomCol = "geom",
    tables = list(
      "users"="mx_users",
      "views"="mx_views",
      "sources"="mx_sources"
      )
  )

#
# web resources : will be exposed to the client using shiny::addRessourcePath. 
#
# List name will be prefix 
# The key is used from the client as :
# http://{location}:{port}/{prefix}/{resource.xxx}
#  http://localhost:8080/dict/dict.csv
#config[["resources"]]  =  list(
      #"dict"  = file.path("src","data","dictionaries"),
      #"countries"  = file.path("src","data","countries"),
      #"sprites" = file.path("src","data","styles","sprites"),
      #"styles" = file.path("src","data","styles"),
      #"src" = file.path("src","src"),
      #"dist" = file.path("src","dist"),
      #"userdata" = file.path("/vagrant/data/userdata") # expected shared folder from vagrant
    #)
config[["resources"]]  =  list(
      "data"  = file.path("src","data"),
      "sprites" = file.path("src","sprites"),
      "src" = file.path("src"),
      "dist" = file.path("www"),
      "userdata" = file.path("/vagrant/data/userdata") ## expected shared folder from vagrant
    )
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
  main = read.csv(
    file.path(
      config[[c("resources","data")]],"dict_main.csv"
      ),
     stringsAsFactors=F
    ),
  countries = read.csv(
    file.path(
      config[[c("resources","data")]],"dict_countries.csv"
      ),
     stringsAsFactors=F
    ),
  languages = read.csv(
    file.path(
      config[[c("resources","data")]],"dict_languages.csv"
      ),
     stringsAsFactors=F
    ),
  schemaMetadata = read.csv(
    file.path(
      config[[c("resources","data")]],"dict_schema_source.csv"
      ),
     stringsAsFactors=F
    )
  )

#
# Update main dictionary 
#
config[["dict"]] <- rbind(
  .get(config,c("dictionaries","main")),
  .get(config,c("dictionaries","countries")),
  .get(config,c("dictionaries","languages"))
  )


#
# vt configuration : updated live
#
config[["vt"]] <- list(
  port = ":3030",
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
  token = "pk.eyJ1IjoidW5lcGdyaWQiLCJhIjoiY2lrd293Z3RhMDAzNHd4bTR4YjE4MHM0byJ9.9c-Yt3p0aKFSO2tX6CR26Q",
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
      "mx_ui_background" = "rgba(248,248,248,0.92)",
      "mx_ui_shadow" = "rgba(153,153,153,0.4)",
      "mx_map_background" = "rgba(248,248,248,1)",
      "mx_map_mask" = "rgba(153,153,153,0.4)",
      "mx_map_water" = "rgba(102,102,102,1)",
      "mx_map_road" = "rgba(94,37,25,1)",
      "mx_map_admin" = "rgba(127,127,127,1)",
      "mx_map_admin_disputed" = "rgba(255,0,0,1)"
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
  "فارسی (Dari/Persian)" = "fa"
  )

#
# countries data
#
config[["countries"]] <- list()

# fallback countries
config[["countries"]][["default"]] <- list(
  "first" = "COD",
  "second" = "AFG",
  "third" = "SLE"
  )

# read countriea
config[["countries"]]$table <- read.csv(
  file.path(
    config[[c("resources","data")]],"countries.csv"
    ),
  stringsAsFactors=F
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
  "str" # stresses
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
    name = "shapefile",
    type = "vector",
    fileExt = c(".shp",".shx",".dbf",".prj"),
    multiple = TRUE
    ),
  list(
    name = "geojson",
    type = "vector",
    fileExt = c(".geojson",".json"),
    multiple = FALSE
    )
  )

#
# email default
#
config[["mail"]] =  list(
  "bot" = "Map-x bot <mapx.admin@unepgrid.ch>",
  "guest" = "guest@mapx.io",
  "admin" = "frederic.moser@unepgrid.ch"
  )


# default user value
#
config[["users"]] <- list(
  defaultEmail =  config[[c("mail","guest")]],
  defaultName = "user",
  loginTimerMinutes = 20,
  cookieExpireDays = 30,
  cookieName = "mx_data"
  )


# default data
config[[c("users","data")]] <- list() 

# default data for new users
config[[c("users","data","public")]] <- list(
  user = list(
    cache = list (
      last_project = config[["countries"]][['default']][['first']],
      last_language = config[["languages"]][["list"]][[1]],
      last_story_map = c()
      )
    ),
  admin = list(
    roles =  list(
      list(
        project = "world",
        role = "user"
        )
      )
    )
  )

# default data for new  superuser if database is empty
config[["users"]][["data"]][["superUser"]]  <- list(
  user = list(
    cache = list (
      last_country = config[["countries"]][['default']][['first']], 
      last_language = config[["languages"]][["list"]][[1]],
      last_story_map = c()
      )
    ),
  admin = list(
    roles =  list(
      list(
        project = "world",
        role = "superuser"
        )
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
    level=4,
    access = c(),
    read = c("public"),
    publish = c(),
    edit = c(),
    profile = c(),
    admin = c()
    ),
  list(
    name="user",
    level=3,
    access = c(),
    read = c("self","public","user"),
    publish = c("self","publisher"),
    edit = c("self"),
    profile = c("self"),
    admin = c()
    ),
  list(
    name="publisher",
    level=2,
    access = c(),
    read = c("self","public","user","publisher"),
    publish = c("self","public","user","publisher"),
    edit = c("self","public","user","publisher"),
    profile = c("self"),
    admin = c()
    ),
  list(
    name="admin",
    level=1,
    access = c(),
    read = c("self","public","user","publisher","admin"),
    publish = c("self","public","user","publisher","admin"),
    edit = c("self","public","user","publisher","admin"),
    profile = c("self","public","user","publisher","admin"),
    admin = c("self","public","user","publisher")
    ),
  list(
    name="superuser",
    level=0,
    access = c("db"),
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


