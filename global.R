#
# Init config list, checkpoint date and package installation
#

library(checkpoint)

#
# Option list for packge provisionning
#
opt <- list(
  # Path to the checkpoint installation
  pathFull = normalizePath("~/.mapx/.checkpoint",mustWork=F),
  pathBase =  normalizePath("~/.mapx/",mustWork=F),
  # Date of the CRAN checkpoint
  date = "2016-11-30",
  # Version of R used. 
  version = paste(R.version$major,R.version$minor,sep="."),
  platform = R.version$platform,
  packageOk = FALSE,
  libraryOk = FALSE
  )

opt$libPaths = c(
  file.path(
    opt$pathFull,opt$date,
    "lib",
    opt$platform,
    opt$version
    ),
  file.path(
    opt$pathFull,
    paste0("R-",opt$version)
    )
  )

opt$libraryOk = all(
  sapply(
    opt$libPaths,
    dir.exists
    )
  )

if( opt$libraryOk ){
  .libPaths( opt$libPaths )

  # dependencies
  opt$packagesOk <- all(
      c(
        require(shiny),
        require(RPostgreSQL),
        require(roxygen2),
        require(memoise),
        require(jsonlite),
        require(devtools),
        require(rio),
        require(magrittr),
        require(base64),
        require(infuser),
        require(WDI),
        require(rgdal),
        require(parallel)
        )
      )
}

if( !isTRUE(opt$packagesOk) || !isTRUE(opt$libraryOk) ){

  warning("Packges list or library path is not set, this could take a while")

  dir.create(
    path=opt$pathFull,
    recursive=TRUE,
    showWarnings=FALSE
    )

  checkpoint(
    snapshotDate = opt$date,
    checkpointLocation = opt$pathBase,
    scanForPackages = TRUE
    )
  #
  # Recursive global reload after 
  #
  source("global.R")

}else{


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
}

