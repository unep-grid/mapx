#
# Define project selection.
#
# Priorities:
# 1. query
# 2. select
# 3. db
# 4. current
# 5. default
observe({
  mxCatch("project_access_logic", {
    #
    # Static
    #
    project_def <- config[[c("project", "default")]]

    #
    # Reactive
    #
    project_ui <- input$selectProject
    project_query <- .get(
      reactChain$requestProject,
      c("value", "project"),
      query$project
    )

    #
    # Deduced
    #
    id_user <- .get(reactUser$data, c("id"))
    data_user <- mxDbGetUserInfoList(id_user)
    project_last <- .get(
      data_user,
      c("data", "user", "cache", "last_project"),
      project_def
    )
    project_db <- mxDbProjectCheck(project_last, project_def)


    isolate({
      # user info
      isGuest <- isGuestUser()
      language <- reactData$language

      # If this is guest, over ride db project
      if (isGuest) {
        project_db <- project_def
      }

      # check current project
      project_react <- reactData$project

      if (isNotEmpty(project_ui) && (project_ui != project_react)) {
        project_query <- NULL
      }

      # Project requested can be an iso3 code or mapx project id or custom alias.
      if (isNotEmpty(project_query)) {
        # case project requested is an iso3code. e.g. COD, USA, etc
        if (nchar(project_query) == 3) project_query <- mxDbGetProjectIdByOldId(project_query)

        # case project requested is an alias
        project_query <- mxDbGetProjectIdByAlias(project_query)

        # General check
        project_query <- mxDbProjectCheck(project_query)
      }

      if (isNotEmpty(project_query)) {
        # priority to query
        project_out <- project_query
      } else {
        # if there is no already defined project but there is something from the db, use the later
        if (isEmpty(project_react) && isNotEmpty(project_db)) {
          project_out <- project_db

          # if the change comes from the ui, apply
        } else if (isNotEmpty(project_ui)) {
          mxModal(id = "uiSelectProject", close = T)
          project_out <- project_ui
        } else {
          # nothing to do
          return()
        }
      }

      #
      # Check roles, change project, set roles, log action
      #
      if (isNotEmpty(project_out)) {
        project_out <- toupper(project_out)

        #
        # Roles checking
        #
        roles <- mxDbGetProjectUserRoles(id_user, project_out)


        if (isEmpty(roles$groups)) project_out <- project_def


        noAccess <- isTRUE(project_query != project_out)

        if (noAccess) {
          #
          # Handle case when requested project is known, but user can't
          # access it.
          #
          # 1) user not logged in -> login callback
          #   - Logged in
          #         -> available -> ok
          #         -> not available -> retry
          idMsg <- ifelse(
            isGuest,
            "login_required_for_project_access_guest",
            "login_required_for_project_access_non_member"
          )
          reactChainCallback("showLogin",
            message = d(idMsg, language),
            type = "login_requested_project_access",
            callback = function() {
              #
              # 'views' item is not used here. See useQueryFilters option
              # src/js/mx_helper_map_view_fetch.js
              #
              reactChainCallback("requestProject",
                value = list(
                  # views = query$views,
                  project = project_query
                )
              )
            }
          )
          #
          # Quit here, login should trigger reactChain$requestProject
          #
          reactData$projectIgnoreQueryFilters <- TRUE
          reactData$project <- project_out
          return()
        }


        reactData$project <- project_out
        reactData$projectPrevious <- project_react
      }

      #
      # Set requested project to null
      #
      query$project <<- NULL
      reactChain$requestProject <<- NULL
    })
  })
})





#
# In case project change log project change AND IP
# IP can take a while to be updated
#
observe({
  ipUser <- reactIp()
  idProject <- reactData$project

  isolate({
    #
    # Check current user values
    #
    idUser <- reactUser$data$id
    isGuest <- isGuestUser()
    idProjectPrevious <- reactData$projectPrevious

    isNotComplete <- isEmpty(idUser) ||
      isEmpty(ipUser) ||
      isEmpty(idProject)

    if (isNotComplete) {
      return()
    }
  })
})

#
# Query request -> show project list
# showProjectsListByTitle or showProjectsListByRole
# Trigger the project panel
# Trigger -> user not logged in -> show login panel -> retry show project list
#
observeEvent(reactData$mapIsReady, {
  if (!reactData$mapIsReady) {
    return()
  }

  byTitle <- isNotEmpty(query$showProjectsListByTitle)
  byRole <- isNotEmpty(query$showProjectsListByRole)

  if (byRole || byTitle) {
    mxDebugMsg("Trigger show project list")
    reactChainCallback("showProjectsList",
      type = "show_projects_query",
    )
  }
})


#
# Show project panel
#
observeEvent(reactChain$showProjectsList, {
  userRole <- getUserRole()
  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language
  idUser <- .get(reactUser, c("data", "id"))
  projectData <- mxDbGetProjectData(project)
  projectName <- .get(projectData, c("title", language))
  projectAllowsJoin <- isTRUE(.get(projectData, c("allow_join")))
  userIsMember <- FALSE
  userIsGuest <- isGuestUser()

  filterRoles <- "any"
  filterTitle <- NULL

  # "showProjectsList" requested with required authentication.
  # If the user is not logged in, display the login panel and try again after
  # logged in.
  reactChainCallbackHandler(reactChain$showProjectsList,
    type = "show_projects_query",
    expr = {
      if (userIsGuest) {
        #
        # Trigger show login panel with a callback :
        # Retry showsProjectList after log in
        #
        reactChainCallback("showLogin",
          message = d("login_required_for_project_list", language),
          type = "login_requested_project_list",
          callback = function() {
            reactChainCallback("showProjectsList",
              message = "",
              type = "show_projects_query"
            )
          }
        )

        return()
      }

      filterRoles <- mxQueryRoleParser(query$showProjectsListByRole, "any")
      filterTitle <- mxQueryTitleParser(query$showProjectsListByTitle, "")
      #
      # Reset query parameters
      #
      query$showProjectsListByRole <<- NULL
      query$showProjectsListByTitle <<- NULL
    }
  )


  btn <- list()

  projects <- mxDbGetProjectListByUser(
    id = idUser,
    language = language,
    whereUserRoleIs = filterRoles,
    whereTitleMatch = filterTitle,
    asDataFrame = TRUE,
    token = reactUser$token
  )

  if (isEmpty(projects)) {
    return()
  }

  projects <- projects[with(projects, order(-admin, -publisher, -member, title)), ]
  projectsMember <- projects[projects$member, ]
  userIsMember <- project %in% projectsMember$id

  btnJoinProject <- actionButton(
    inputId = "btnJoinProject",
    label = sprintf(d("btn_join_current_project", language), projectName)
  )

  reactChainCallback("renderUserProjectsList",
    data = list(
      idList = "mxListProjects",
      projects = projects
    )
  )

  uiProjects <- tagList(
    tags$h3(d("project_list", language)),
    tags$p(d("project_list_select_desc", language)),
    tags$div(id = "mxListProjects")
  )

  if (!userIsGuest && !userIsMember && projectAllowsJoin) {
    btn <- tagList(
      btn,
      btnJoinProject
    )
  }

  mxModal(
    id = "uiSelectProject",
    buttons = btn,
    title = d("project_list", language),
    content = uiProjects,
    textCloseButton = d("btn_close", language)
  )
})


#
# Render project list
#
observeEvent(reactChain$renderUserProjectsList, {
  session$sendCustomMessage(
    "mxRenderUserProjectsList",
    reactChain$renderUserProjectsList$data
  )
})


#
# Update project related stuff
#
observeEvent(reactData$project, {
  idProject <- reactData$project
  projectData <- mxDbGetProjectData(idProject)
  isGuest <- isGuestUser()
  roles <- getUserRole()

  mxUpdateQueryParameters(list(
    project = idProject
  ))

  mxUpdateSettings(list(
    project = projectData
  ))

  if (!isGuest) {
    # update reactive value and db if needed
    mxDbUpdateUserData(reactUser,
      path = c("user", "cache", "last_project"),
      value = idProject
    )
  }

  reactData$updateViewsList <- getUserAtProject()
})

#
# Update map position based on project config
#
observe({
  # data
  idMap <- .get(config, c("map", "id"))
  project <- reactData$project
  hasProject <- isNotEmpty(project)
  hasMap <- isTRUE(reactData$mapIsReady)
  update <- reactData$updateProject #-> when config saved
  skip <- !hasMap || !hasProject

  if (skip) {
    return()
  }

  isolate({
    projectData <- mxDbGetProjectData(project)
    countryClip <- projectData$countries
    mapPos <- projectData$map_position
    mapProj <- projectData$map_projection
    theme <- projectData$theme
    hasMaxBounds <- isTRUE(mapPos$useMaxBounds)
    language <- reactData$language
    hasNoClip <- isEmpty(countryClip) || "WLD" %in% countryClip
    posChange <- !identical(reactData$mapPos, mapPos)

    if (isEmpty(mapPos)) {
      mapPos <- list()
    }
    if (isEmpty(mapPos$zoom)) {
      mapPos$zoom <- mapPos$z
      mapPos$z <- NULL
    }

    #
    # Set highlight
    #
    mglSetHighlightedCountries(
      id = idMap,
      idLayer = "country-code",
      countries = as.list(countryClip)
    )

    #
    # Updaet theme
    #
    if (isNotEmpty(theme)) {
      mglSetTheme(theme)
    }

    #
    # Update map pos config
    # before setting projection
    # -> Set max bounds
    # -> button globe update require that info
    #    to have the correct state (lock/unlock)
    #
    if (posChange) {
      mglSetMapPos(
        id = idMap,
        mapPos
      )
      reactData$mapPos <- mapPos
    }


    #
    # Update map projection
    #
    if (isEmpty(mapProj) || hasMaxBounds) {
      mglSetMapProjection(
        id = idMap,
        name = config$projections$default,
        origin = "server"
      )
    } else {
      mglSetMapProjection(
        id = idMap,
        name = mapProj$name,
        center = list(mapProj$center_lng, mapProj$center_lat),
        parallels = list(mapProj$parallels_lat_0, mapProj$parallels_lat_1),
        origin = "server"
      )
    }
  })
})
