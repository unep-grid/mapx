
library(shiny)
source("src/helper/misc.R")
source("settings/settings-global.R")

write(as.character(mxSource('src/ui/index.R')),'src/html/index.html')
write(as.character(mxSource('src/ui/view_list.dot.R')),'src/html/view_list.dot.html')
write(as.character(mxSource('src/ui/view_list_legend.dot.R')),'src/html/view_list_legend.dot.html')

