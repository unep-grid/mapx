#
# on exit, disconnect pg connection 
#
onStop(mxDbCloseCon)


#
#  SERVER FUNCTION
#
server <- function(input,output,session){

  #
  # Session query search string
  #
  query <- list()


  mxUpdateSettings(
    #
    # See all defaults in /src/js/mx_settings_default.js
    #
    list(
      api = .get(config,c("api")),
      validation = .get(config,c('validation')),
      dbLogLevels = .get(config,c("db_log","levels"),default=c("ERROR")),
      language = .get(config,c("language","default")),
      languages = .get(config,c("languages","codes")),
      project =  .get(config,c("project","default")),
      countries =.get(config,c("countries","table","id")),
      map = .get(config,c("map")),
      paths = .get(config,c("paths")),
      ui = .get(config,c("ui")),
      links = .get(config,c("links"))
      )
    )

  #
  # Init reactive objects
  #
  mxSource(
    base = config$srvPath,
    env = environment(),
    files = c(
      "react_login_key_status.R",
      "react_objects.R",
      "react_ip_data.R",
      "react_source_list.R",
      "react_source_summary.R",
      "react_view_list.R",
      "react_map.R",
      "react_roles.R",
      "react_project_members.R"
      )
    )
  #
  # Read browser data, cookies, etc..
  #
  obsBrowserData <- observeEvent(input$browserData,{
    obsBrowserData$destroy()
    #
    # Get query and browser/navigator data
    #
    browserData <- input$browserData
    query <<- mxParseQuery(input$urlSearchQuery)


    #
    # Launch init
    #
    mxCatch(title="MapX main process",{

      if("MAINTENANCE" %in% .get(config,c("mode"))){

        mxSource(
          base = config$srvPath,
          env = environment(),
          files = c(
            'maintenance.R'
            )
          )

      }else{

        mxInitBrowserData(browserData,function(email){


          #
          # Set initial login
          # and store browserData client side, 
          # in cookie, for fingerprinting
          #
          userInfo <- mxLogin(email,browserData, query);

          reactUser$data <- userInfo$info;
          reactUser$token <- userInfo$token;

          mxSource(
            base = config$srvPath,
            env = environment(),
            files = c(
              #
              # Base
              #
              "login.R",
              "ip.R",
              #"roles.R",
              "project.R",
              "language.R",
              "controls.R",
              "map.R",
              "input_register.R",
              "root_mode.R", 
              #
              # Tools panel handler
              #
              "tools_db_connect.R",
              "tools_app_config.R",
              "tools_project_main.R",
              "tools_project_new.R",
              "tools_project_views_state.R",
              "tools_project_roles.R",
              "tools_project_config.R",
              "tools_project_external_views.R",
              "tools_project_sources_views.R",
              "tools_project_delete.R",
              "tools_project_join.R",
              "tools_project_invite.R",
              "tools_query_maker.R",
              "tools_source_new.R",
              "tools_source_edit_metadata.R",
              "tools_source_manage.R",
              "tools_source_overlap.R",
              "tools_source_validate_geom.R",
              #
              # Views creation
              #
              "tools_view_new.R",
              #
              # View edit
              #
              "view_update_client.R",
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
              # source download handler
              #
              "source_download.R",
              #
              # misc
              #
              "db_logger.R"
              )
            )
          })

      }
      })
    })

}


