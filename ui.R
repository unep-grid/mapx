#
# Client 
#

#
# set ressouce path
#
mxSetResourcePath(config[["resources"]])


#
# main ui frame
#
tagList(
  tags$head(
    suppressDependencies("jquery","shiny","babel-polyfill","json2"),
  includeScript(
    "web/dist/app.shiny.min.js"
    ),
    #
    # Load metadata, title, header
    #
    mxSource("ui/header.R"),
    #
    # Styles
    #
    includeCSS("web/dist/app.min.css"),
    includeCSS("web/dist/app.colors.min.css",title="mx_colors")
    ),
  tags$body(
    class="full-page mx",
    #
    # Display something if no js
    #
    mxSource("ui/no_js.R"),
    #
    # Ui components
    #
    #mxSource("ui/modals.R"),
    mxSource("ui/bar_main.R"),
    mxSource("ui/map.R")
    ),
  #
  # Scripts
  #

  includeScript(
    "web/dist/app.mapx.min.js"
    )

  )

