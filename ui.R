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

    #
    # Load metadata, title, header
    #
    mxSource("ui/header.R"),
    #
    # Styles
    #
    tags$link(
      rel="stylesheet",
      type="text/css",
      href="dist/app.min.css"
      ),
    tags$link(
      rel="stylesheet",
      type="text/css",
      title="mx_colors",
      href="dist/app.colors.min.css"
      )
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
    mxSource("ui/modals.R"),
    mxSource("ui/bar_main.R"),
    mxSource("ui/map.R")
    ),
  #
  # Scripts
  #
  tags$script(
    src="dist/app.min.js"
    )
  )

