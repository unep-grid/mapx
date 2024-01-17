observeEvent(input$btnShowProjectDelete, {
  userRole <- getUserRole()
  idProject <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  isProjectDefault <- isTRUE(idProject == config[[c("project", "default")]])

  if (isAdmin && !isProjectDefault) {
    projectData <- mxDbGetProjectData(idProject)
    projectTitle <- .get(projectData, c("title", language))
    if (noDataCheck(projectTitle)) {
      projectTitle <- .get(projectData, c("title", "en"))
    }
    reactData$projectTitle <- projectTitle

    #
    # Set public mode and
    # create select input for members, publishers and admins
    #
    ui <- tagList(
      textInput(
        "txtProjectConfirmName",
        label = d("project_delete_confirm_title", language, web = F),
      ),
      uiOutput("uiProjectDeleteValidation")
    )

    btnDelete <- actionButton(
      "btnDeleteProject",
      d("btn_delete", language, web = F)
    )

    mxModal(
      id = "deleteProject",
      title = d("project_delete_title", language, web = F) + " \" " + projectTitle + " \" ",
      content = ui,
      textCloseButton = d("btn_cancel", language, web = F),
      buttons = list(btnDelete)
    )
  }
})


observeEvent(input$txtProjectConfirmName, {
  language <- reactData$language
  projectTitle <- reactData$projectTitle
  projectConfirmName <- input$txtProjectConfirmName

  errors <- logical(0)
  warning <- logical(0)

  errors["error_title_no_match"] <- isTRUE(tolower(projectTitle) != tolower(projectConfirmName))
  errors <- errors[errors]
  hasError <- length(errors) > 0

  if (!hasError) {
    warning["warning_delete_project"] <- TRUE
  }


  mxUiHide(
    id = "btnDeleteProject",
    hide = FALSE,
    disable = hasError
  )

  output$uiProjectDeleteValidation <- renderUI(
    mxErrorsToUi(
      errors = errors,
      warning = warning,
      language = language
    )
  )

  reactData$projectDeleteHasError <- hasError
})


observeEvent(input$btnDeleteProject, {
  if (reactData$projectDeleteHasError) {
    return()
  }

  mxCatch(title = "Delete project: search data to remove", {
    project <- reactData$project
    projectTitle <- reactData$projectTitle
    language <- reactData$language

    mxModal(
      id = "deleteProject",
      title = d("project_delete_title", language, web = F) + " \" " + projectTitle + " \" ",
      content = d("project_delete_analyze", language),
      buttons = list(),
      removeCloseButton = TRUE
    )

    sourcesToRemove <- mxDbGetQuery("
      SELECT id
      FROM mx_sources
      WHERE project = '" + project + "'")$id
    viewsProject <- mxDbGetQuery("
      SELECT distinct id
      FROM mx_views_latest
      WHERE project = '" + project + "'")$id

    viewsToRemove <- c()
    #
    # Remove remaining views
    #

    for (src in sourcesToRemove) {
      viewsToRemove <- c(mxDbGetViewsTableBySourceId(src)$view_id, viewsToRemove)
    }

    viewsToRemove <- c(viewsToRemove, viewsProject)
    viewsToRemove <- unique(viewsToRemove)

    reactData$projectDeleteViews <- viewsToRemove
    reactData$projectDeleteSources <- sourcesToRemove
  })


  ui <- tags$ul(
    tags$li(
      tags$b(d("project_delete_number_of_sources", language)),
      ":",
      tags$span(length(sourcesToRemove))
    ),
    tags$li(
      tags$b(d("project_delete_number_of_views", language)),
      ":",
      tags$span(length(viewsToRemove))
    )
  )

  btnDelete <- actionButton(
    "btnDeleteProjectConfirm",
    d("btn_confirm", language, web = F)
  )

  mxModal(
    id = "deleteProject",
    title = d("project_delete_title", language, web = F) + " \" " + projectTitle + " \" ",
    content = ui,
    textCloseButton = d("btn_cancel", language, web = F),
    buttons = list(btnDelete)
  )
})


observeEvent(input$btnDeleteProjectConfirm, {
  mxCatch(title = "Project remove confirmed", {
    if (reactData$projectDeleteHasError) {
      return()
    }

    views <- unique(reactData$projectDeleteViews)
    sources <- unique(reactData$projectDeleteSources)

    userRole <- getUserRole()
    idProject <- reactData$project
    language <- reactData$language
    isAdmin <- isTRUE(userRole$admin)
    isProjectDefault <- isTRUE(idProject == config[[c("project", "default")]])

    if (!isAdmin || isProjectDefault) {
      return()
    }

    mglViewsCloseAll()

    mxUpdateQueryParameters(list(
      project = ""
    ))

    #
    # Remove all related views
    #
    for (v in views) {
      mxDbGetQuery("delete from mx_views where id = '" + v + "'")
    }
    #
    # Remove all related sources
    #
    for (s in sources) {
      mxDbGetQuery("delete from mx_sources where id = '" + s + "'")
      mxDbGetQuery("drop table if exists " + s)
    }
    #
    # Remove project itself
    #
    mxDbGetQuery("delete from mx_projects where id = '" + idProject + "'")

    #
    # Force logout
    #
    mxModal(
      id = "deleteProject",
      close = TRUE
    )

    reactData$project <- .get(config, c("project", "default"))
  })
})
