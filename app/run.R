#
# Launch manualy the app
#
args <- commandArgs(trailingOnly = TRUE)

if (is.na(args[1])) {
  port <- 3434
} else {
  port <- args[1]
}
library(shiny)
# or use $MAPX_PATH_APP
# -> A package use ~ for some reasons, which resolves as /home/app.
#    there is no /home/app, and a warning is issued
Sys.setenv("HOME" = getwd())

runApp(".", host = "0.0.0.0", launch.browser = FALSE, port = as.numeric(port))
