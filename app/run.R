#
# Launch manualy the app
#
args <- commandArgs(trailingOnly = TRUE)

if (is.na(args[1])) {
  port <- 3434
} else {
  port <- args[1]
}
# -> A package use ~ for some reasons, which resolves as /home/app.
#    there is no /home/app, and a warning is issued
source("./global.R")
source("./server.R")
source("./ui.R")

app <- shinyApp(ui, server, uiPattern = ".*")


#
# Hack to serve www as /
#
app$staticPaths <- list(`/` = structure(list(
  path = file.path(getwd(), "www"),
  options = structure(list(
    indexhtml = FALSE, fallthrough = TRUE,
    html_charset = NULL, headers = NULL, validation = NULL,
    exclude = FALSE
  ), class = "staticPathOptions", normalized = TRUE)
), class = "staticPath"))



runApp(app, host = "0.0.0.0", launch.browser = FALSE, port = as.numeric(port))
