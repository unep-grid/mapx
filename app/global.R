#
# Dependencies
#
tryCatch({
library(shiny)
library(RPostgreSQL)
library(memoise)
library(jsonlite)
library(magrittr)
library(parallel)
library(curl)
library(xml2)
library(geosapi)
library(pool)

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
mxSource("src/r/helpers/db_pool.R")
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
# Init pool and master direct connection
#
mxDbPoolInit()

#
# Set finalizers when the app (runApp) is exiting
#

# Shiny stop
onStop(function(){
  cat("mxDbPoolClose (onStop), global.R\n")
  mxDbPoolClose()
})
# Session end
.Last <- function() {
  cat("mxDbPoolClose (.Last), global.R\n")
  mxDbPoolClose()
}
## Current function exit
#on.exit({
  #cat("mxDbPoolClose (on.exit), global.R\n")
  #mxDbPoolClose()
#})
},error = function(e){
  browser()

})
