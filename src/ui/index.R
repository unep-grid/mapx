#
# Map-x (c) unepgrid 2017-present
#

#
# Index
#

tagList(
  tags$head(
    # Load metadata, title, header
    mxSource("src/ui/header.R")
    ),
  tags$body(
    class="full-page mx",
    # Display something if no js
    mxSource("src/ui/no_js.R"),
    # Controls and left panel
    mxSource("src/ui/bar_main.R"),
    # Map element
    mxSource("src/ui/map.R")
    )
  )


