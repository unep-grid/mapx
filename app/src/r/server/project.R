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

    # Project requested can be an iso3 code or mapx project id or custom alias.
    if(!noDataCheck(project_query)){

      # case project requested is an iso3code. e.g. COD, USA, etc
      if(nchar(project_query)==3) project_query <- mxDbGetProjectIdByOldId(project_query) 
      
      # case project requested is an alias
      project_query <- mxDbGetProjectIdByAlias(project_query)
      
      # General check
      project_query <- mxDbProjectCheck(project_query)
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
        project_out <- project_ui
      }else{
        # nothing to do
        return()
      }
    }

    # Set requested project to null
    query$project <<- NULL

    #
    # Check roles, change project, set roles, log action
    #
    if(!noDataCheck(project_out)){

      project_out <- toupper(project_out)

      #
      # Roles checking
      #
      roles <- mxDbGetProjectUserRoles(id_user,project_out)
      if(noDataCheck(roles$groups)) project_out <- project_def;
      
      reactData$project <- project_out
      reactData$projectPrevious <- project_react


       mxUpdateSettingsUser(list(
        roles = roles
        ));

    }

  })
})


observeEvent(reactData$project,{
  #
  # Update browser query parameter
  #
  idProject <- reactData$project
  mxUpdateQueryParameters(list(
      project = idProject
      ))
  mxUpdateSettings(list(
      project = idProject
      ))

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

    isNotComplete <- noDataCheck(idUser) ||
      noDataCheck(ipUser) ||
      noDataCheck(idProject) 

    if(isNotComplete){
      return()
    }
   
  })

})


#
# After map is ready, check query for 
# showProjectsListByTitle or showProjectsListByRole
#
observeEvent(reactData$mapIsReady,{
  if(reactData$mapIsReady){
    byTitle = !noDataCheck(query$showProjectsListByTitle)
    byRole = !noDataCheck(query$showProjectsListByRole)
    if(byRole || byTitle){
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
  
  reactData$timerProjectList = mxTimeDiff('Build project list') ## end timer in control.js

  event <- reactData$showProjectsList 
  userRole <- getUserRole()
  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language
  idUser  <- .get(reactUser,c("data","id"))
  projectData <- mxDbGetProjectData(project)
  projectName <- .get(projectData,c("title",language))
  projectAllowsJoin <- isTRUE(.get(projectData,c('allow_join')))
  userIsMember <- FALSE
  userIsGuest <- isGuestUser()

  filterRoles <- NULL
  filterTitle <- NULL

  if( typeof(event) == "list" && event$msg == "start"){

    if(userIsGuest){
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
    asDataFrame = T,
    token = reactUser$token
    )

  if(noDataCheck(projects)){
    return()
  }

  projects <- projects[with(projects, order(-admin,-publisher,-member,title)),]
  projectsMember <- projects[projects$member,]
  userIsMember <- project %in% projectsMember$id

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

  if(!userIsGuest && !userIsMember && projectAllowsJoin){
    btn <- tagList(
      btn,
      btnJoinProject
      )
  }
 
  mxModal(
    id = "uiSelectProject",
    buttons = btn,
    title = d("project_list",language),
    content = uiProjects,
    textCloseButton = d("btn_close",language)
    )

})


#
# Render project list
#
observeEvent(reactData$renderUserProjectsList,{
  session$sendCustomMessage("mxRenderUserProjectsList",reactData$renderUserProjectsList)
  mxTimeDiff(reactData$timerProjectList)
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

      if(noDataCheck(mapPos)){
        mapPos = list()
      }
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

      mapPos$jump = TRUE

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



