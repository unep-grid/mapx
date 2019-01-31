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

  project_def <- config[[c("project","default")]]
  project_query <- query$project
  project_ui <- input$selectProject 
  project_db <- mxDbProjectCheck(.get(reactUser$data,c("data","user","cache","last_project")),project_def)

  id_user <- .get(reactUser$data,c("id"))
  isolate({

    # user info
    isGuest <- isGuestUser()
    language <- reactData$language

    # If this is guest, over ride db project
    if( isGuest ){
      project_db <- project_def
    }

    # check current project
    project_react <- reactData$project

    if(!noDataCheck(project_ui) && (project_ui != project_react)){
      project_query = NULL
    }

    # if query project, check right
    if(!noDataCheck(project_query)){

      if(nchar(project_query)==3) project_query <- mxDbGetProjectIdByOldId(project_query) 
      if(TRUE) project_query <- mxDbGetProjectIdByAlias(project_query)
      project_query <- mxDbProjectCheck(project_query)

      #roles <- mxDbGetProjectUserRoles(id_user,project_query)
      #if(!roles$public){
        #project_query <- NULL
      #}
    }

    if(!noDataCheck(project_query)){
      # priority to query
      project_out <- project_query
    }else{

      # if there is no already defined project but there is something from the db, use the later
      if(noDataCheck(project_react) && !noDataCheck(project_db)){

        project_out <- project_db

        # if the change comes from the ui, apply
      }else if(!noDataCheck(project_ui)){
        mxModal(id="uiSelectProject",close=T)
      #  roles <- mxDbGetProjectUserRoles(id_user,project_ui)
        #if(!roles$public){
          #msg <- d("project_access_denied",language)
          #mxModal(id="homeProjectDenied",content = tags$b(msg))
          #project_ui <- NULL
        #}
        project_out <- project_ui
      }else{
        # nothing to do
        return()
      }
    }


    query$project <<- NULL
    if(!noDataCheck(project_out)){
     
      project_out <- toupper(project_out)

      #
      # Last check
      #
      roles <- mxDbGetProjectUserRoles(id_user,project_out)
      if(noDataCheck(roles$groups)) project_out = project_def;


      mxUpdateUrlParams(list(project=project_out))
      reactData$project <- project_out

      #
      # Log any project change or load
      #
      mxDbLogger("USER_ACTION", list(
          side = "app",
          id_log = "project_load",
          id_project = project_out,
          id_user = id_user,
          is_guest = isGuest,
          data = list(
            new_project = project_out,
            old_project = project_react
            )
          ))


    }

  })
})


#
# After map is ready, check query for 
# showProjectsListByTitle or showProjectsListByRole
#
observeEvent(reactData$mapIsReady,{
  if(reactData$mapIsReady){
    if(!noDataCheck(query$showProjectsListByTitle) || !noDataCheck(query$showProjectsListByRole) ){
      reactData$showProjectsList <- list( 
        msg = "start",
        time = Sys.time()
        )
    }
  }
})

#
# Show project panel
#
observeEvent(reactData$showProjectsList,{

  event <- reactData$showProjectsList 
  userRole <- getUserRole()
  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language
  idUser  <- .get(reactUser,c("data","id"))
  projectData <- mxDbGetProjectData(project)
  projectName <- .get(projectData,c("title",language))
  isMember <- FALSE
  
  filterRoles <- NULL
  filterTitle <- NULL
  if( typeof(event) == "list" && event$msg == "start"){

    if(isGuestUser()){
      reactData$showLogin <- list(
        msg = d("login_first_before_action",language),
        then = function(){
          reactData$showProjectsList <- list( 
            msg = "start",
            time = Sys.time()
            )
        },
        time = Sys.time()
        )

      return()
    }
    filterRoles <- mxQueryRoleParser(query$showProjectsListByRole,'any')
    filterTitle <- mxQueryTitleParser(query$showProjectsListByTitle,'')
    #
    # Reset query parameters
    #
    query$showProjectsListByRole <<- NULL
    query$showProjectsListByTitle <<- NULL

  }

  btn <- list();

  projects <- mxDbGetProjectListByUser(
    id = idUser,
    language = language,
    whereUserRoleIs = filterRoles, 
    whereTitleMatch = filterTitle,
    asDataFrame = T
    )

  projects <- projects[with(projects, order(-admin,-publisher,-member,title)),]
  projectsMember <- projects[projects$member,]
  isMember <- project %in% projectsMember$id

  btnJoinProject <- actionButton(
    inputId = 'btnJoinProject',
    label = sprintf(d('btn_join_current_project',language), projectName)
    )

  reactData$renderUserProjectsList <- list(
    idList = "mxListProjects",
    data = projects,
    trigger = runif(1)
    )


  uiProjects <- tagList(
    tags$h3(d("project_list",language)),
    tags$p(d("project_list_select_desc",language)),
    tags$div(id="mxListProjects")
    )

  if(!isMember){
    btn <- tagList(
      btn,
      btnJoinProject
      )
  }

  mxModal(
    id="uiSelectProject",
    buttons=btn,
    title=d("project_list",language),
    content=uiProjects,
    textCloseButton=d("btn_close",language)
    )

})


#
# Update project related stuff
#
observe({

  # data
  idMap <- .get(config,c("map","id"))
  project <- reactData$project
  hasProject <- !noDataCheck(project)
  hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[[c("map","id")]]) ]])
  isGuest <- isGuestUser()
  update <- reactData$updateProject

  isolate({
    if( hasMap && hasProject ){

      projectData <- mxDbGetProjectData(project)
      countryClip <- projectData$countries
      mapPos <- projectData$map_position 
      language <- reactData$language

      hasNoClip <- noDataCheck(countryClip) || "WLD" %in% countryClip

      mglSetHighlightedCountries(
        id = idMap,
        idLayer = 'country-code',
        countries = as.list(countryClip)
        )

      #if( hasNoClip ){
      #filter = list(
      #"all", 
      #list("in","iso3code",project)
      #)
      #}else{
      #filter = list(
      #"any",
      #c(list("!in","iso3code"),as.list(countryClip)),
      #list("!has","iso3code")
      #)
      #}

      #mglSetFilter(
      #id=idMap,
      #layer="country-code",
      #filter=filter
      #)

      if(noDataCheck(mapPos$zoom)){
        mapPos$zoom <- mapPos$z
        mapPos$z <- NULL
      }
      #
      # Read map position from query
      #
      if(!noDataCheck(query$lat) && !noDataCheck(query$lng) && !noDataCheck(query$zoom)){
        mapPos$lat  = as.numeric(query$lat)
        mapPos$lng = as.numeric(query$lng)
        mapPos$zoom = as.numeric(query$zoom)
        mapPos$fromQuery = TRUE 
        query$lat <<- NULL
        query$lng <<- NULL
        query$zoom <<- NULL
      }

      mglFlyTo(
        id = idMap,
        mapPos
        )

      mxUpdateText(
        "btnShowProject",
        mxDbGetProjectTitle(project,language)
        )

      if(!isGuest){
        # update reactive value and db if needed
        mxDbUpdateUserData(reactUser,
          path = c("user","cache","last_project"),
          value = project
          )
      }
    }
  })
})



