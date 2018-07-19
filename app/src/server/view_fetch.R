

#
# Reactive views. Used in fetch and edit
#

reactViewsCompact <- reactive({

  timer <- mxTimeDiff("Fetching view")

  #
  # Ivalidated by :
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language

  #
  # Get user role
  #
  userRole <- getUserRole()

  #
  # Value from request
  #
  viewsId <- query$views
  collections <- query$collections
  collectionsSelectOperator <- query$collectionsSelectOperator 
  empty <- query$noViews 
  #
  # don't use requested views twice
  #
  query$views <<- NULL

  #
  # Set logic
  #
  hasRole <- !noDataCheck(userRole)

  if( !hasRole ) return()

  if(empty){
    out <- list()
  }else{
    out <-  mxDbGetViews(
      views = viewsId, 
      collections = collections,
      collectionsSelectOperator = collectionsSelectOperator,
      project = project,
      rolesInProject=userRole,
      idUser = userData$id,
      language = language,
      keys = c("id","pid","project","_edit","_title")
      )


  }
  mxTimeDiff(timer)
  return(out)
})


#
# Store project title cache. 
#
projects = list()

reactViewsCompactAll <- reactive({

  timer <- mxTimeDiff("Fetching all view")
  
  #
  # Ivalidated by :
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language

  #
  # Get user role
  #
  userRole <- getUserRole()

  #
  # Set logic
  #
  hasRole <- !noDataCheck(userRole)

  if( !hasRole ) return()

  out <- mxDbGetViews(
    rolesInProject = userRole,
    idUser = userData$id,
    language = language,
    allProject = TRUE,
    keys = c("id","pid","project","type","_title","readers")
    )

  #
  # Cache project names
  #

  getProjectTitles <- function(project,language){
    id <- project + ":" + language 
    hasProject <- id %in% names(projects)
    if(hasProject){
      return(projects[id])
    }else{
      projectTitle <- mxDbGetProjectTitle(project,language)
      projects[id] <<- projectTitle
      return(projectTitle)
    }
  }

  out <- lapply(out,function(v){
    isPrivate <- isTRUE(!"public" %in% v$readers && !"publishers" %in% v$readers)
    v["_private"] <- isPrivate
    v["_project_title"] <- getProjectTitles(v$project,language)
    return(v)
    })

  mxTimeDiff(timer)
  return(out)

})





#
# After project change, send new set of views (initial set of views send when map init)
#
observe({

  project <- reactData$project
  userData <- reactUser$data

  isolate({

    mapIsReady <- isMapReady()
    role <- getUserRole()

    if(!mapIsReady) return()
    if(noDataCheck(role)) return()
    if(noDataCheck(project)) return()

    timer <- mxTimeDiff("Sending view")

    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = reactViewsCompact(),
      viewsCompact = TRUE,
      render = FALSE,
      project = project,
      resetView = TRUE
      )

    mxTimeDiff(timer)
  })
})



