#
# Launch manualy the app
#
library(shiny)

rs = function(){
  runApp(".",launch.browser=FALSE,port=3434)
}

rs()


