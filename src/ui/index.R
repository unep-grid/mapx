#
# Map-x (c) unepgrid 2017-present


tags$html(
  tags$head(
    mxSource("src/ui/header.R")
    ),
  #
  # Index
  #
  tags$body(
    class="full-page mx",
    tags$div(
      class="mx-wrapper",
      # Display something if no js
      mxSource("src/ui/no_js.R"),
      # Display loading spinner
      mxSource("src/ui/loader.R"),
      # Controls and left panel
      mxSource("src/ui/panel_main.R"),
      # Map element
      mxSource("src/ui/map.R")
      )
    )
  )
