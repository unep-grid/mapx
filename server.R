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
        #
        # Base
        #
        "init.R",
        "login.R",
        "country.R",
        "language.R",
        "controls.R",
        "map.R",
        "input_register.R",
        #
        # Views handler
        #
        "view_create.R",
        "view_fetch.R",
        "view_edit.R",
        #
        # source handler
        #
        "source_vt_create.R",
        "source_edit.R",
        #
        # tools handler
        #
        "tools_manage.R",
        #
        # images handler
        #
        "image_import.R"
        )
      )
  })

}


