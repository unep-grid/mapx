#
# Init config list, checkpoint date and package installation
#
source(file.path("settings","settings-init.R"),local=.GlobalEnv)


# dependencies
library(roxygen2)
library(memoise)
library(shiny)
library(jsonlite)
library(devtools)
library(Rcpp)
library(rio)
library(xml2)
library(RPostgreSQL)
library(magrittr)
library(base64)
library(infuser)

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


