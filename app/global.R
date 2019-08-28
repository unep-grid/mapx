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
source("src/r/helpers/misc.R",local=.GlobalEnv)
mxSource("src/r/helpers/binding_mgl.R")
mxSource("src/r/helpers/binding_mx.R")
mxSource("src/r/helpers/binding_epsgio.R")
mxSource("src/r/helpers/binding_jed.R")
mxSource("src/r/helpers/binding_wms_client.R")
mxSource("src/r/helpers/login_utils.R")
mxSource("src/r/helpers/query_parser.R")
mxSource("src/r/helpers/email_sender.R")
mxSource("src/r/helpers/api_fetch.R")
mxSource("src/r/helpers/geoserver.R")
mxSource("src/r/helpers/story_auto_start.R")
mxSource("src/r/helpers/db.R")
mxSource("src/r/helpers/db_projects.R")
mxSource("src/r/helpers/db_log.R")
mxSource("src/r/helpers/db_views.R")
mxSource("src/r/helpers/schema_source_meta.R")
mxSource("src/r/helpers/schema_view_story.R")
mxSource("src/r/helpers/schema_view_style.R")

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
if( ! ("MAINTENANCE" %in% .get(config,c("mode")) )){
  mxDebugMsg("pool create")
  pg <- .get(config,c("pg"))
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
}
onStop(function() {
  pool <- .get(config,c("db","pool"))
  if(!noDataCheck(pool)){
  
  mxDebugMsg("pool close")
  poolClose(pool)
  }
})
