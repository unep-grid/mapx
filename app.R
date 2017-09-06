#
#  Shiny app.
#
server <- source("src/server/main.R",local=TRUE)$value

shinyApp(
  server = server
  )

