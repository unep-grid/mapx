observeEvent(input$btnShowProjectDelete, {
  userRole <- getUserRole()
  idProject <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  isProjectDefault <- isTRUE(idProject == config[[c("project", "default")]])


  if (!isAdmin || isProjectDefault) {
    return()
  }
  projectData <- mxDbGetProjectData(idProject)
  projectTitle <- .get(projectData, c("title", language))

  if (isEmpty(projectTitle)) {
    projectTitle <- .get(projectData, c("title", "en"))
  }

  modalTitle <- sprintf(
    "%1$s \" %2$s \"",
    dd("project_delete_title", language),
    projectTitle
  )

  reactData$projectTitle <- projectTitle
  reactData$projectModalTitle <- modalTitle

  #
  # Set public mode and
  # create select input for members, publishers and admins
  #
  ui <- tagList(
    textInput(
      "txtProjectConfirmName",
      label = dd("project_delete_confirm_title", language),
    ),
    uiOutput("uiProjectDeleteValidation")
  )

  btnDelete <- actionButton(
    "btnDeleteProject",
    dd("btn_delete", language)
  )

  mxModal(
    id = "deleteProject",
    title = modalTitle,
    content = ui,
    textCloseButton = dd("btn_cancel", language),
    buttons = list(btnDelete)
  )
})


observeEvent(input$txtProjectConfirmName, {
  language <- reactData$language
  projectTitle <- reactData$projectTitle
  projectConfirmName <- input$txtProjectConfirmName

  errors <- logical(0)
  warning <- logical(0)

  errors["error_title_no_match"] <- isTRUE(
    tolower(projectTitle) != tolower(projectConfirmName)
  )
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
  project <- reactData$project
  projectTitle <- reactData$projectTitle
  modalTitle <- reactData$projectModalTitle
  language <- reactData$language

  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  isProjectDefault <- isTRUE(project == config[[c("project", "default")]])

  if (!isAdmin || isProjectDefault) {
    return()
  }

  mxCatch(title = "Delete project: search data to remove", {
    mxModal(
      id = "deleteProject",
      title = modalTitle,
      content = dd("project_delete_analyze", language),
      buttons = list(),
      removeCloseButton = TRUE
    )

    querySource <- sprintf(
      "
      SELECT id
      FROM mx_sources
      WHERE project = '%1$s'
      ",
      project
    )

    queryViews <- sprintf(
      "
      SELECT distinct id
      FROM mx_views_latest
      WHERE project = '%1$s'
      ",
      project
    )

    sourcesToRemove <- mxDbGetQuery(querySource)$id
    viewsProject <- mxDbGetQuery(queryViews)$id

    tableViewsProject <- mxDbGetViewsTitle(
      viewsProject,
      asNamedList = FALSE,
      language = language
    )

    tableSourcesProject <- mxDbGetSourceTitle(
      sourcesToRemove,
      asTable = TRUE,
      language = language
    )

    #
    # Remove linked views
    #
    tableViewsDep <- data.frame(
      id = character(0),
      title = character(0),
      project = character(0)
    )
    for (src in sourcesToRemove) {
      tableViewsBySource <- mxDbGetViewsTableBySourceId(src)
      tableViewsDep <- rbind(tableViewsDep, tableViewsBySource)
    }

    hasViews <- isNotEmpty(tableViewsProject)
    hasViewsDep <- isNotEmpty(tableViewsDep)
    hasSources <- isNotEmpty(tableSourcesProject)


    if (hasViewsDep) {
      tableViewsDep <- tableViewsDep[
        !tableViewsDep$project %in% project && hasViews &&
          !tableViewsDep$id %in% tableViewsProject$id,
        c("id", "title", "project")
      ]
      tableViewsDep <- tableViewsDep[!duplicated(tableViewsDep$id), ]
    }


    reactData$projectDeleteViews <- if (hasViews) {
      tableViewsProject$id
    } else {
      NULL
    }
    reactData$projectDeleteSources <- if (hasSources) {
      tableSourcesProject$id
    } else {
      NULL
    }
    reactData$projectDeleteViewsDep <- if (hasViewsDep) {
      tableViewsDep$id
    } else {
      NULL
    }

    ui <- tags$ul(
      if (hasSources) {
        tags$li(
          tags$b(dd("project_delete_table_sources", language)),
          ":",
          if (hasSources) mxTableToHtml(tableSourcesProject)
        )
      },
      if (hasViews) {
        tags$li(
          tags$b(dd("project_delete_table_views", language)),
          ":",
          mxTableToHtml(tableViewsProject)
        )
      },
      if (hasViewsDep) {
        tags$li(
          tags$b(dd("project_delete_table_views_dep", language)),
          ":",
          mxTableToHtml(tableViewsDep)
        )
      }
    )

    btnDelete <- actionButton(
      "btnDeleteProjectConfirm",
      dd("btn_confirm", language)
    )

    mxModal(
      id = "deleteProject",
      title = modalTitle,
      content = ui,
      textCloseButton = dd("btn_cancel", language),
      buttons = list(btnDelete)
    )
  })
})


observeEvent(input$btnDeleteProjectConfirm, {
  mxCatch(title = "Project remove confirmed", {
    if (reactData$projectDeleteHasError) {
      return()
    }
    userRole <- getUserRole()
    idProject <- reactData$project
    language <- reactData$language
    isAdmin <- isTRUE(userRole$admin)
    isProjectDefault <- isTRUE(idProject == config[[c("project", "default")]])

    if (!isAdmin || isProjectDefault) {
      return()
    }

    #
    # Get id of what to remove
    #
    views <- na.omit(unique(c(
      reactData$projectDeleteViews,
      reactData$projectDeleteViewsDep
    )))


    sources <- na.omit(unique(reactData$projectDeleteSources))

    mglViewsCloseAll()

    con <- mxDbGetCon()

    on.exit({
      mxDbReturnCon(con)
    })

    dbBegin(con)

    tryCatch(
      {
        #
        # Delete mapx views
        # - all views, included view from other projects that are
        #   dependent on global sources from this project
        #
        for (v in views) {
          mxDebugMsg("REMOVE VIEW" + v)
          query <- sprintf("DELETE FROM mx_views WHERE id = '%s'", v)
          rowsAffected <- dbExecute(con, query)
          #
          # expeecting at least one view, many views version possible
          # Check if the count of affected rows > 0
          #
          if (rowsAffected == 0) {
            msg <- sprintf(
              "Error removing view '%s': %d rows were affected",
              v,
              rowsAffected
            )
            stop(msg)
          }
        }

        for (s in sources) {
          mxDebugMsg("REMOVE SOURCE" + s)
          #
          # Fetch the type of the source
          #
          querySourceType <- sprintf(
            "SELECT type FROM mx_sources WHERE id = '%s'",
            s
          )
          sourceType <- dbGetQuery(con, querySourceType)$type

          if (sourceType == "join") {
            #
            # Delete postgres views
            #
            queryViewDrop <- sprintf(
              "DROP VIEW IF EXISTS %s",
              s
            )
            dbExecute(con, queryViewDrop)
          } else {
            #
            # Delete table / layer
            #
            queryTableDrop <- sprintf(
              "DROP TABLE IF EXISTS %s",
              s
            )

            dbExecute(con, queryTableDrop)
          }

          #
          # Delete source
          #

          querySourceDelete <- sprintf(
            "DELETE FROM mx_sources WHERE id = '%s'",
            s
          )
          rowsAffected <- dbExecute(con, querySourceDelete)
          if (rowsAffected != 1) {
            msg <- sprintf(
              "Error removing source '%s': %d rows were affected",
              s,
              rowsAffected
            )
            stop(msg)
          }
        }

        #
        # Reset views external
        #
        mxDebugMsg("Reset views external")
        mxDbProjectResetViewsExternal(con)

        #
        # Delete project
        #
        queryProjectDelete <- sprintf(
          "DELETE FROM mx_projects WHERE id = '%s'",
          idProject
        )

        rowsAffected <- dbExecute(con, queryProjectDelete)
        if (rowsAffected != 1) {
          msg <- sprintf(
            "Error removing project '%s': %d rows were affected",
            s,
            rowsAffected
          )
          stop(msg)
        }



        # If everything went well, commit the transaction
        dbCommit(con)
      },
      error = function(e) {
        dbRollback(con)
        stop(e)
      },
      warning <- function(e) {
        waring(e)
      }
    )

    #
    # Clear query parameters
    #
    mxUpdateQueryParameters(list(
      project = ""
    ))

    #
    # Clear modals and force logout
    #
    mxModal(
      id = "deleteProject",
      close = TRUE
    )

    mxSetCookie(
      deleteAll = FALSE,
      reloadPage = TRUE
    )
  })
})
