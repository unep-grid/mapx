#
# React list of collections
#
reactCollections <- reactive({
  input$viewsListCollections
})

#
# Reactive views. Used in fetch and edit
#

reactViewsCompact <- reactive({
  #
  # Ivalidated by :
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  language <- reactData$language
  idProject <- reactData$project
  idUser <- userData$id
  userRole <- getUserRole()
  hasRole <- !noDataCheck(userRole)
  token <- reactUser$token

  #
  # Value from request
  #
  viewsId <- query$views
  collections <- query$collections
  collectionsSelectOperator <- query$collectionsSelectOperator
  noViews <- isTRUE(query$noViews)
  filterViewsByRoleMax <- query$filterViewsByRoleMax

  #
  # Set logic
  #

  if (!hasRole) {
    return()
  }

  if (noViews) {
    out <- list()
  } else {
    out <- mxApiGetViews(
      idUser = idUser,
      idProject = idProject,
      idViews = viewsId,
      token = token,
      filterViewsByRoleMax = filterViewsByRoleMax,
      collections = collections,
      collectionsSelectOperator = collectionsSelectOperator,
      language = language,
      keys = c("id", "pid", "type", "project", "_edit", "_title", "_source")
    )
  }

  return(out)
})


reactViewsListIdAll <- reactive({
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  language <- reactData$language
  idProject <- reactData$project
  idUser <- userData$id
  token <- reactUser$token

  timerFetchPublic <- mxTimeDiff("Fetching all view public")
  viewsPublic <- mxApiGetViewsAllPublicProject(
    idUser = idUser,
    idProject = idProject,
    idProjectExclude = idProject,
    types = c("vt", "cc", "rt"),
    token = token,
    language = language,
    keys = c("id", "_title", "_title_project")
  )
  mxTimeDiff(timerFetchPublic)

  timerFetchProject <- mxTimeDiff("Fetching views project")
  viewsProject <- mxApiGetViews(
    idUser = idUser,
    idProject = idProject,
    token = token,
    types = c("vt", "cc", "rt"),
    language = language,
    keys = c("id", "_title", "_title_project")
  )
  mxTimeDiff(timerFetchProject)

  timer <- mxTimeDiff("Fetching all view: post process")

  viewsProjectList <- vapply(viewsProject, function(v) {
    v$id
  }, character(1))
  viewsProjectTitle <- vapply(viewsProject, function(v) {
    " [ " + v$`_title_project` + " ] " + v$`_title`
  }, character(1))
  viewsPublicList <- vapply(viewsPublic, function(v) {
    v$id
  }, character(1))
  viewsPublicTitle <- vapply(viewsPublic, function(v) {
    " [ " + v$`_title_project` + " ] " + v$`_title`
  }, character(1))

  names(viewsPublicList) <- viewsPublicTitle
  names(viewsProjectList) <- viewsProjectTitle

  viewsProjectList <- viewsProjectList[order(names(viewsProjectList))]
  viewsPublicList <- viewsPublicList[order(names(viewsPublicList))]

  out <- c(viewsProjectList, viewsPublicList)

  mxTimeDiff(timer)
  return(out)
})

reactViewsCompactListVector <- reactive({
  views <- reactViewsCompact()
  if (noDataCheck(views)) {
    return(list())
  }
  views <- views[sapply(views, function(v) {
    v$type %in% c("vt")
  })]
  idViews <- sapply(views, `[[`, "id")
  names(idViews) <- trimws(sapply(views, `[[`, "_title"))
  idViews <- idViews[order(names(idViews))]
  return(idViews)
})


reactViewsCheckedList <- reactive({
  viewsStatus <- input$mx_client_views_status
  viewsChecked <- .get(viewsStatus, c("vChecked"), default = list())
  if (noDataCheck(viewsChecked)) {
    viewsChecked <- list()
  }
  return(viewsChecked)
})



reactViewsExternal <- reactive({
  update <- reactData$triggerExternalViews
  userRole <- getUserRole()
  project <- reactData$project
  isPublisher <- isTRUE(userRole$publisher)
  userData <- reactUser$data
  viewsExternal <- mxDbProjectGetViewsExternal(project)

  if (isPublisher) {
    viewsExternal
  } else {
    list()
  }
})

reactViewsListProject <- reactive({
  timer <- mxTimeDiff("Fetching list of view")

  #
  # Ivalidated by :
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  language <- reactData$language
  idProject <- reactData$project
  idUser <- userData$id
  token <- reactUser$token

  views <- mxApiGetViews(
    idUser = idUser,
    idProject = idProject,
    token = token,
    language = language,
    keys = c("id", "_title")
  )

  if (noDataCheck(views)) {
    viewsList <- list()
  } else {
    viewsList <- lapply(views, `[[`, "id")
    names(viewsList) <- lapply(views, `[[`, "_title")
  }
  mxTimeDiff(timer)
  return(viewsList)
})
