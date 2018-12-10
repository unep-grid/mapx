#
# Dependencies
#
library(shiny)
library(RPostgreSQL)
library(memoise)
library(jsonlite)
library(magrittr)
library(parallel)
library(curl)
library(xml2)
library(pool)
library(geosapi)

#
# Load helpers
#
source("src/helper/misc.R",local=.GlobalEnv)
mxSource("src/helper/login_utils.R")
mxSource("src/helper/query_parser.R")
mxSource("src/helper/mgl.R")
mxSource("src/helper/email_sender.R")
mxSource("src/helper/epsgio.R")
mxSource("src/helper/jed.R")
mxSource("src/helper/geoserver.R")
mxSource("src/helper/story_auto_start.R")
mxSource("src/helper/db.R")
mxSource("src/helper/db_projects.R")
mxSource("src/helper/db_views.R")
mxSource("src/helper/schema_source_meta.R")
mxSource("src/helper/schema_view_story.R")
mxSource("src/helper/schema_view_style.R")

#
# Global configuration
#
mxSource("settings/settings-global.R")

#
# Additional settings
#
mxSource("settings/settings-local.R")

#
# Resolve ressource path
#
mxSetResourcePath(.get(config,c("resources")))

#
# Creating db pool
#
pg <- .get(config,c("pg"))

mxDebugMsg("pool create")
config <- .set(config,c("db","pool"),
  dbPool(
    drv = dbDriver("PostgreSQL"),
    dbname = pg$dbname,
    host = pg$host,
    user = pg$user,
    password = pg$password,
    port = pg$port
    )
  )
onStop(function() {
  pool <- .get(config,c("db","pool"))
  mxDebugMsg("pool close")
  poolClose(pool)
  })
