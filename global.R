#
# Init config list, checkpoint date and package installation
#

library(checkpoint)

checkPointOptions <- list(
  path = normalizePath("~/.mapx/.checkpoint",mustWork=F),
  date = "2016-11-30" 
  )

dir.create(
  path = checkPointOptions$path,
  showWarnings = F,
  recursive = T
  )

checkpoint(
  snapshotDate = checkPointOptions$date,
  checkpointLocation = checkPointOptions$path,
  scanForPackages = FALSE
  )

# dependencies
packagesOk <- all(c(
require(roxygen2)
require(memoise)
require(shiny)
require(jsonlite)
require(devtools)
require(Rcpp)
require(rio)
require(xml2)
require(RPostgreSQL)
require(magrittr)
require(base64)
require(infuser)
))


if(!packagesOk){
checkpoint(
  snapshotDate = checkPointOptions$date,
  checkpointLocation = checkPointOptions$path,
  scanForPackages = TRUE
  )
}



# load local packages
load_all("packages/mx")
load_all("packages/jed")

# load schemas function
source("templates/jed/view_story.R")
source("templates/jed/view_style.R")
source("templates/jed/source_meta.R")

#
# Additional app specific config files
#
source(file.path("settings","settings-global.R"),local=.GlobalEnv)
source(file.path("settings","settings-local.R"),local=.GlobalEnv)


