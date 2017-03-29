options(shiny.reactlog=FALSE) 
#
#  SERVER FUNCTION
#
server <- function(input,output,session){

  observeEvent(input$cookies,{

    #
    # Context specific reactive values
    #
    reactUser <- reactiveValues()
    reactData <- reactiveValues()

    #
    # Source server function 
    # 
    mxSourceSrv(
      c(
        "init.R",
        "login.R",
        "country.R",
        "language.R",
        "controls.R",
        "map.R",
        "view_create.R",
        "view_fetch.R",
        "view_edit.R",
        "source_vt_create.R",
        "source_edit.R",
        "image_import.R",
        "input_register.R"
        )
      )
  })

}


