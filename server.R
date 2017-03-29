options(shiny.reactlog=FALSE) 
#
#  SERVER FUNCTION
#
server <- function(input,output,session){

  #
  # cdata : non reactive list of client data 
  # for use outside reactive context
  #


  observeEvent(input$cookies,{

    cdata <- list(
      protocol = session$clientData$url_protocol,
      hostname = session$clientData$url_hostname,
      pathname = session$clientData$url_pathname,
      port = session$clientData$url_port,
      search = session$clientData$url_search
      )

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


