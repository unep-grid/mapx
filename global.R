#
# Init config list, checkpoint date and package installation
#

library(checkpoint)

opt <- list(
  pathFull = normalizePath("~/.mapx/.checkpoint",mustWork=F),
  pathBase =  normalizePath("~/.mapx/",mustWork=F),
  date = "2016-11-30",
  version = paste(R.version$major,R.version$minor,sep="."),
  platform = R.version$platform
  )

opt$libPaths = c(
  file.path(opt$pathFull,opt$date,"lib",opt$platform,opt$version),
  file.path(opt$pathFull,paste0("R-",opt$version))
  )


libraryOk = all(sapply(opt$libPaths,dir.exists))

if(libraryOk){
  .libPaths(opt$libPaths)
}


# dependencies
packagesOk <- all(c(
require(roxygen2),
require(memoise),
require(shiny),
require(jsonlite),
require(devtools),
require(Rcpp),
require(rio),
require(xml2),
require(RPostgreSQL),
require(magrittr),
require(base64),
require(infuser)
))

if( !packagesOk || !libraryOk ){
checkpoint(
  snapshotDate = checkPointOptions$date,
  checkpointLocation = checkPointOptions$pathBase,
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


