#
# Launch manualy the app
#
library(shiny)
#library(profvis)

rs = function(){
#profvis({  
  runApp(".",launch.browser=FALSE,port=3434)
#})
}

rs()


