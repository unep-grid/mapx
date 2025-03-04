#
# Configuration and options
# TODO: the configuration should progressivelly transfered to js settings
#  app/src/js/settings/
#
config <- list()

#
# Shiny options
#
options(shiny.maxRequestSize = 0)
options(shiny.reactlog = FALSE)
#
# get info about the host
#
config[["system"]] <- list(
  os = Sys.info()[["sysname"]],
  hostname = Sys.info()[["nodename"]],
  hostnameRemote = "map-x-full"
)

#
# External services
#
config[["services"]] <- list(
  maptiler = list(
    token = "1234"
  ),
  mapbox = list(
    token = "1234"
  )
)

config[["brand"]] <- list(
  name = "MapX"
)


#
# Links
#
configLinks <- as.list(fromJSON("./src/js/settings/links.json"))
config[["links"]] <- configLinks



#
# MapX version
#
config$version <- jsonlite::fromJSON("package.json")$version


#
# Set MapX mode
#
# config[["mode"]] <- c("MAINTENANCE")
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
# Themes
#
config[["themes"]] <- list(
  default = "classic_light",
  ids = c(
    "classic_light",
    "classic_dark",
    "color_light",
    "color_dark",
    "water_light",
    "water_dark"
  ),
  names = c(
    "Classic Light",
    "Classic Dark",
    "Color Light",
    "Color Dark",
    "Water Light",
    "Water Dark"
  )
)
config$themes$idsNamed <- config$themes$ids
names(config$themes$idsNamed) <- config$themes$names

config[["projections"]] <- list(
  default = "mercator",
  ids = c(
    "globe",
    "mercator"
    # "albers",
    # "equalEarth",
    # "lambertConformalConic",
    # "winkelTripel",
    # "naturalEarth",
    # "equirectangular"
  ),
  names = c(
    "Globe",
    "Mercator"
    # "Albers",
    # "Equal Earth",
    # "Lambert Conformal Conic",
    # "Winkel Tripel",
    # "Natural Earth",
    # "Equirectangular"
  )
)

#
# Input valdiation/control
#
configValidation <- as.list(fromJSON("./src/js/settings/validation.json"))
config[["validation"]] <- configValidation

#
# api configuration
#
routes_express <- as.list(fromJSON("./src/js/settings/routes_express.json"))
config[["api"]] <- list(
  port = 3030,
  port_public = 8888,
  host = "localhost",
  host_public = "locahost",
  protocol = "http:",
  upload_size_max = 200 * 1024^2, # 200MiB
  routes = c(routes_express)
)

#
# Search service config
#
config[["search"]] <- list(
  protocol = "http://",
  host = "localhost",
  port = 7700
)

#
# postgres configuration
#
config[["pg"]] <- list(
  host = "127.0.0.1",
  dbname = "mapx",
  port = "5432",
  user = "mapxw",
  read = list(
    user = "mapxr",
    password = ""
  ),
  encryptKey = "",
  password = "",
  geomCol = "geom",
  tables = list(
    "users" = "mx_users",
    "views" = "mx_views",
    "views_latest" = "mx_views_latest",
    "projects" = "mx_projects",
    "sources" = "mx_sources",
    "config" = "mx_config"
  ),
  poolMin = 1,
  poolMax = 1
)

#
# web resources : will be exposed to the client using shiny::addRessourcePath.
# The key is used from the client as :
# http://{location}:{port}/{prefix}/{resource.xxx}
#
config[["resources"]] <- list(
  "dist" = file.path("www")
)
#
# Client side path
#

configPaths <- as.list(fromJSON("./src/js/settings/paths.json"))
config[["paths"]] <- configPaths


#
#  Sprites prefix
#
config[["sprites_prefix"]] <- list(
  point = "^maki-",
  polygon = "^t_|^geol_",
  line = ""
)

#
# Server and UI folder path
#
config[["srvPath"]] <- file.path("src", "r", "server")

#
# Import dictionaries
#
config[["dictionaries"]] <- list(
  main = fromJSON("src/data/dict/_built/dict_full.json"),
  countries = fromJSON("src/data/dict/dict_countries.json"),
  languages = fromJSON("src/data/dict/dict_languages.json")
)



#
# Update main dictionary
#
config[["dict"]] <- .get(config, c("dictionaries", "main"))

#
# map default
#
configMap <- as.list(fromJSON("./src/js/settings/map.json"))
config[["map"]] <- configMap

#
# Default ui and map colors
#
config[["ui"]] <- list(
  ids = list(
    idViewsListContainer = "viewListContainer", # include filters and search field
    idViewsList = "viewListContent", # include views
    idDashboards = "mxDashboards",
    idDashboardsButton = "btnTabDashboard",
    idDashboardsPanel = "mxDashboardsPanel",
    idInputThemeColors = "mxInputThemeColors"
  ),
  ui = list()
)


#
# wms sources
#
configWms <- fromJSON("./src/js/settings/wms.json", simplifyDataFrame = FALSE)
config[["wms"]] <- configWms

#
# Set default variable names
#
config[["variables"]] <- list()

config[[c("variables", "time")]] <- list(
  "t0" = "mx_t0",
  "t1" = "mx_t1"
)

#
# Templates
#
config[["templates"]] <- list()

# html template
config[[c("templates", "html")]] <- list()
config[[c("templates", "html", "email")]] <- paste(readLines("src/templates/email_base.html"), collapse = "\n")
config[[c("templates", "html", "email_footer")]] <- paste(readLines("src/templates/email_footer.html"), collapse = "\n")
config[[c("templates", "html", "email_error")]] <- paste(readLines("src/templates/email_error.html"), collapse = "\n")

# text template
config[[c("templates", "text")]] <- list()
config[[c("templates", "text", "widget_function")]] <- paste(readLines("src/templates/widget_function.js"), collapse = "\n")
config[[c("templates", "text", "custom_view")]] <- paste(readLines("src/templates/custom_view.js"), collapse = "\n")
config[[c("templates", "text", "custom_paint")]] <- paste(readLines("src/templates/custom_paint.json"), collapse = "\n")
config[[c("templates", "text", "custom_paint_example")]] <- paste(readLines("src/templates/custom_paint_example.json"), collapse = "\n")

#
# default languages
#
# TODO: Generate language list based on dict_language.json
config[["languages"]] <- list()
config[["languages"]][["list"]] <- list(
  "English ( english )" = "en",
  "Français ( French )" = "fr",
  "Español ( Spanish )" = "es",
  "عربى ( Arabic )" = "ar",
  "Русский ( Russian )" = "ru",
  "中文 ( Chinese )" = "zh",
  "Deutsch ( German )" = "de",
  "বাংলা   ( Bengali )" = "bn",
  "فارسی ( Dari/Persian )" = "fa",
  "پښتو ( Pashto )" = "ps"
)

config[["languages"]][["codes"]] <- unname(unlist(config[["languages"]][["list"]]))

config[["language"]] <- list(
  "default" = "en"
)
#
# Dictionnary of badwords for the profanity checker
#
config[["badwords"]] <- list(
  "path" = "src/data/badwords",
  "words" = list()
)

for (l in .get(config, c("languages", "list"))) {
  dFile <- file.path(.get(config, c("badwords", "path")), l)
  if (file.exists(dFile)) {
    config[[c("badwords", "words", l)]] <- readLines(dFile)
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
# Dev members
#
config[["dev"]] <- list(
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
config[[c("countries", "table")]] <- na.omit(
  .get(config, c("dictionaries", "countries"))
)


#
# Buld geo keyword from list.
# List key is from
#
config[["m49_geo_keywords"]] <- list(
  global = list("WLD"),
  region = as.list(fromJSON("src/data/dict/dict_m49_regions.json")$id),
  intermediate_region = as.list(fromJSON("src/data/dict/dict_m49_intermediate_regions.json")$id),
  sub_region = as.list(fromJSON("src/data/dict/dict_m49_subregions.json")$id),
  other_region = as.list(fromJSON("src/data/dict/dict_m49_custom.json")$id),
  country = as.list(.get(config, c("countries", "table", "id"), list()))
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
config[["views"]] <- list()

#
# Views type
#
config[[c("views", "type")]] <- list(
  "vt", # vector tiles
  "rt", # raster tiles
  "sm" # story map
)
#
# View type dev
#
config[[c("views", "type_dev")]] <- list(
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
# Date formats
#
config[["dates_format"]] <- list(
  # 2024-03-05T10:01:00.92089+00:00
  "db" = "%Y-%m-%d%tT%T",
  # 2024-03-05 10:02:22.0133 UTC
  "r" = "%Y-%m-%d %H:%M:%OS %Z"
)


#
# File format meta
# ⚠️  moved to  api/modules/file_formats/

#
# Email configuration
#
config[["mail"]] <- list(
  "bot" = "bot@localhost",
  "guest" = "guest@localhost",
  "admin" = "admin@localhost"
)

#
# default user value
#
config[["users"]] <- list(
  defaultEmail = config[[c("mail", "guest")]],
  defaultName = "user",
  loginTimerMinutes = 20,
  loginMaxAttempts = 5,
  cookieExpireDays = 7,
  tokenExpireDays = 7,
  actionLinkExpireDays = 7,
  cookieName = "mx_token",
  apiExpireDays = 1
)

#
# default data
#
config[[c("users", "data")]] <- list()

#
# default data for new users
#
config[[c("users", "data", "public")]] <- list(
  user = list(
    cache = list(
      last_project = config[["project"]][["default"]],
      last_language = config[["languages"]][["list"]][[1]]
    )
  )
)

#
# default data for new  superuser if database is empty
#
config[["users"]][["data"]][["superUser"]] <- list(
  user = list(
    cache = list(
      last_project = config[["project"]][["default"]],
      last_language = config[["languages"]][["list"]][[1]]
    )
  )
)
