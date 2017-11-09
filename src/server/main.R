#
# Init checkpoint, libraries and config
#
source(file.path("src","server","init_server.R"))


#
#  SERVER FUNCTION
#
server <- function(input,output,session){

  #
  # Context specific reactive values
  #

  reactUser <- reactiveValues()
  reactData <- reactiveValues()

  #
  # As soon as the document is ready, source every listeners
  #
  observeEvent(input$cookies,{

    #
    # Retrieve query value. Used in country and fetch view server files.
    #
    query <- parseQueryString(session$clientData$url_search)

    if(!noDataCheck(query$views)){
      query$views <- unlist(strsplit(query$views,","))
    }

    if(!noDataCheck(query$collections)){
      query$collections <- unlist(strsplit(query$collections,","))
    }
    if(!noDataCheck(query$style)){
      query$style <- jsonlite::fromJSON(mxDecode(query$style))
    }else{
      query$style <- .get(config,c("ui","colors","default"))
    }

    #
    # Source server function 
    # 
    mxSource(
      base = config$srvPath,
      env = environment(),
      files = c(
        #
        # Base
        #
        "init_session.R",
        "user.R",
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
        "view_edit_style.R",
        "view_edit_dashboard.R",
        "view_edit_story_map.R",
        "view_edit_custom.R",
        #
        # Tools
        #
        "share.R",
        #
        # source handler
        #
        "source_vt_upload_from_browser_storage.R",
        "source_vt_upload_from_file_explorer.R",
        "source_vt_upload_progress.R",
        "source_vt_upload_optional_view.R",
        "source_edit.R",
        #
        # tools handler
        #
        "tools_manage.R",
        #
        # images handler
        #
        "image_import.R",
        #
        # misc
        #
        "wms_creator.R"
        )
      )

    #})
})
}


