#
# Launch manualy the app
#
args <- commandArgs(trailingOnly=TRUE)

if(is.na(args[1])){
  port <- 3434
}else{
  port <- args[1]
}

library(shiny)
runApp(".",host="0.0.0.0",launch.browser=FALSE,port=as.numeric(port))


