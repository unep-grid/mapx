#
#  SERVER FUNCTION
#
server <- function(input, output, session) {
  isMaintenance <- isTRUE(.get(config, c("mode")) == "MAINTENANCE")

  if (isMaintenance) {
    #
    # Set maintenance mode, ignore everything else
    #
    mxSource(
      base = config$srvPath,
      env = environment(),
      files = c(
        "maintenance.R"
      )
    )
    return()
  }

  mxDbFailEarly()

  session$allowReconnect(TRUE)
  #
  # Session query search string
  #
  query <- list()

  mxUpdateSettings(
    #
    # Update values from app/src/js/settings/
    # -> only
    #   - dynamic values ( e.g. from var env )
    #   - simplified version from large tables
    #
    list(
      #
      # Dynamic
      #
      api = .get(config, c("api")),
      search = .get(config, c("search")),
      map = .get(config, c("map")),
      services = .get(config, c("services")),
      #
      # Languages, short version using code and array of code
      #
      language = .get(config, c("language", "default")),
      languages = .get(config, c("languages", "codes")),
      #
      # Project default
      #
      project = list(
        id = .get(config, c("project", "default")),
        public = TRUE
      ),
      #
      # Countries iso3 code
      #
      countries = .get(config, c("countries", "table", "id"))
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
  # Read once browser data, cookies, etc..
  #
  obsBrowserData <- observeEvent(input$browserData, {
    obsBrowserData$destroy()
    #
    # Get query and browser/navigator data
    #
    browserData <- input$browserData
    query <<- mxParseQuery(input$urlSearchQuery)


    #
    # Launch init
    #
    mxCatch(title = "MapX main process", {
      #
      # Get email after browser data validation
      # -> default = guest
      #
      emailInit <- mxGetInitEmail(browserData)

      userInfo <- mxLogin(
        email = emailInit,
        browserData = browserData,
        query = query,
        reactData = reactData
      )

      mxDebugMsg("LOGIN DONE")
      #
      # Set reactUser reactives values
      #
      reactUser$data <- userInfo$info
      reactUser$token <- userInfo$token

      #
      # Source reactive stuff needed for this session
      #


      mxSource(
        base = config$srvPath,
        env = environment(),
        files = c(
          #
          # Base
          #
          "login.R",
          "ip.R",
          "user.R",
          "project.R",
          "language.R",
          "controls.R",
          "map.R",
          "input_register.R",
          "root_mode.R",
          #
          # Tools panel handler
          #
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
          "tools_source_new.R",
          "tools_source_edit_metadata.R",
          "tools_source_manage.R",
          "tools_source_edit_table.R",
          "tools_source_overlap.R",
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
          # Sharing tools
          #
          # "share.R",
          "share_to_project.R",
          #
          # Root buttons
          #
          "tools_geoserver.R",
          "tools_join.R"
        )
      )
    })
  })
}
