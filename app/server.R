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
    obsBrowserData <- observeEvent(input$browserData,{
      obsBrowserData$destroy()
      #obsBrowserData.
      browserData <- input$browserData;

      mxCatch(title="MapX main process",{

        mxInitBrowserData(browserData,function(email){
          
          #
          # Get query parameters
          #
          query <- mxParseQuery(session$clientData$url_search)

          #
          # Set initial login
          # and store browserData client side, 
          # in cookie, for fingerprinting
          #
          reactUser$data <- mxLogin(email,browserData,query);

          if(!isTRUE(query$kioskMode)){

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
                "login.R",
                "roles.R",
                "project.R",
                "language.R",
                "controls.R",
                "map.R",
                "input_register.R",
                #
                # Tools panel handler
                #
                "tools_db_connect.R",
                "tools_app_config.R",
                "tools_project_main.R",
                "tools_project_new.R",
                "tools_project_roles.R",
                "tools_project_config.R",
                "tools_project_external_views.R",
                "tools_project_add_content.R",
                "tools_project_add_content_form.R",
                "tools_project_delete.R",
                "tools_project_join.R",
                "tools_project_invite.R",
                "tools_query_maker.R",
                "tools_source_edit_metadata.R",
                "tools_source_manage.R",
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
                "source_download.R",
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
          }


})


})
})
}


