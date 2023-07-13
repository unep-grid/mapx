#
# Update environment
#
# - always be in the app location
setwd(Sys.getenv("MAPX_PATH_APP"))
# - Some package uses "~" as project root and report error
#   as there is nothing in /home/app -> /app
Sys.setenv("HOME" = "/")
# if SHINY_PORT is set, shiny think it's in shiny-server
# if SHINY_SERVER_VERSION is not set, it  complains
Sys.setenv("SHINY_SERVER_VERSION" = "0.5.0")

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

#
# Load helpers
#
source("src/r/helpers/misc.R", local = .GlobalEnv)
mxSource("src/r/helpers/binding_mgl.R")
mxSource("src/r/helpers/binding_mx.R")
mxSource("src/r/helpers/binding_epsgio.R")
mxSource("src/r/helpers/binding_jed.R")
mxSource("src/r/helpers/binding_wms_client.R")
mxSource("src/r/helpers/login_utils.R")
mxSource("src/r/helpers/query_parser.R")
mxSource("src/r/helpers/email_sender.R")
mxSource("src/r/helpers/api_fetch.R")
mxSource("src/r/helpers/story_auto_start.R")
mxSource("src/r/helpers/db.R")
mxSource("src/r/helpers/db_pool.R")
mxSource("src/r/helpers/db_projects.R")
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
addResourcePath("assets", "./www")

tryCatch(
  {
    #
    # Init pool and master direct connection
    #
    mxDbPoolInit()

    #
    # Set finalizers when the app (runApp) is exiting
    #

    # Shiny stop
    onStop(function() {
      cat("mxDbPoolClose (onStop), global.R\n")
      mxDbPoolClose()
    })
    # Session end
    .Last <- function() {
      cat("mxDbPoolClose (.Last), global.R\n")
      mxDbPoolClose()
    }
  },
  error = function(e) {
    #
    # Print error
    #
    msg <- sprintf(
      "Init, Early Error: API HOST PUBLIC: %1$s;\nERROR: %2$s",
      Sys.getenv("API_HOST_PUBLIC"),
      as.character(e)
    )
    #
    # If available, send mail
    #
    if (exists("mxSendMail")) {
      mxSendMail(
        to = config$mail$admin,
        subject = "Init early error",
        content = msg,
        # if the db is down, do not try to encrypt
        encrypt = FALSE
      )
    }

    #
    # If available, clean DB pool
    #
    if (exists("mxDbPoolClose")) {
      mxDbPoolClose()
    }

    #
    # Quit
    #
    if (exists(mxKillProcess)) {
      mxKillProcess(msg)
    } else {
      stop(msg)
    }
  }
)
