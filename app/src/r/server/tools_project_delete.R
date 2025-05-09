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

  mxCatch(
    title = "Delete project: search data to remove",
    {
      mxModal(
        id = "deleteProject",
        title = modalTitle,
        content = dd("project_delete_analyze", language),
        buttons = list(),
        removeCloseButton = TRUE
      )

      querySource <- sprintf(
        "
      SELECT id, global
      FROM mx_sources
      WHERE project = '%1$s'
      ",
        project
      )

      queryViews <- sprintf(mxReadText("src/sql/get_projects_views_extended.sql"), project)

      tableViewsProject <- mxDbGetQuery(queryViews)

      sourcesToRemove <- mxDbGetQuery(querySource)

      tableSourcesProject <- mxDbGetSourceTitle(
        sourcesToRemove$id,
        asTable = TRUE,
        language = language
      )
      tableSourcesProject$global <- ifelse(sourcesToRemove$global, "YES", "NO")


      #
      # Remove linked views
      #
      sourcesGlobal <- sourcesToRemove[sourcesToRemove$global, "id"]


      tableViewsDep <- data.frame(
        id = character(0),
        title = character(0),
        project = character(0)
      )

      for (src in sourcesGlobal) {
        tableViewsBySource <- mxDbGetViewsTableBySourceId(src)
        tableViewsDep <- rbind(tableViewsDep, tableViewsBySource)
      }

      tableSourcesDep <- data.frame(
        id = character(0),
        title = character(0),
        id_project = character(0)
      )

      for (src in sourcesGlobal) {
        tableSourcesBySource <- mxDbGetTableDependencies(src)
        tableSourcesDep <- rbind(tableSourcesDep, tableSourcesBySource)
      }


      hasViews <- isNotEmpty(tableViewsProject)
      hasViewsDep <- isNotEmpty(tableViewsDep)
      hasSources <- isNotEmpty(tableSourcesProject)
      hasSourcesDep <- isNotEmpty(tableSourcesDep)

      if (hasViewsDep) {
        filter <-
          !tableViewsDep$project %in% project &
            !duplicated(tableViewsDep$id)
        tableViewsDep <- tableViewsDep[
          filter,
          c("id", "title", "project", "title_project")
        ]
      }

      if (hasSourcesDep) {
        filter <-
          !tableSourcesDep$id_project %in% project &
            !duplicated(tableSourcesDep$id)

        tableSourcesDep <- tableSourcesDep[
          filter,
          c("id", "title", "id_project", "title_project")
        ]
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

      reactData$projectDeleteSourcesDep <- if (hasSourcesDep) {
        tableSourcesDep$id
      } else {
        NULL
      }


      if (hasViews) {
        tableViewsProject$title <- lapply(
          seq_along(tableViewsProject$id), function(i) {
            id <- tableViewsProject[i, "id"]
            title <- tableViewsProject[i, "title"]

            url <- mxGetAppUrlParam(
              list(views = id, zoomToViews = "true"),
              static = TRUE
            )

            link <- tags$a(
              href = url,
              title,
              target = "_blank"
            )
            as.character(link)
          }
        )
      }

      if (hasViewsDep) {
        tableViewsDep$title <- lapply(
          seq_along(tableViewsDep$id), function(i) {
            id <- tableViewsDep[i, "id"]
            title <- tableViewsDep[i, "title"]

            url <- mxGetAppUrlParam(
              list(views = id, zoomToViews = "true"),
              static = TRUE
            )

            link <- tags$a(
              href = url,
              title,
              target = "_blank"
            )
            as.character(link)
          }
        )

        tableViewsDep$project <- lapply(
          seq_along(tableViewsDep$id), function(i) {
            id <- tableViewsDep[i, "project"]
            title <- tableViewsDep[i, "title_project"]
            id_view <- tableViewsDep[i, "id"]

            url <- mxGetAppUrlParam(
              list(project = id, viewsOpen = id_view),
            )

            link <- tags$a(
              href = url,
              title,
              target = "_blank"
            )
            as.character(link)
          }
        )
        tableViewsDep$title_project <- NULL

        tableSourcesDep$id_project <- lapply(
          seq_along(tableSourcesDep$id), function(i) {
            id <- tableSourcesDep[i, "id_project"]
            title <- tableSourcesDep[i, "title_project"]

            url <- mxGetAppUrlParam(
              list(project = id),
            )

            link <- tags$a(
              href = url,
              title,
              target = "_blank"
            )
            as.character(link)
          }
        )
        tableSourcesDep$title_project <- NULL
      }

      if (hasViews) {
        names(tableViewsProject) <- c(
          dd("view_id_short"),
          dd("view_title"),
          dd("project_delete_view_n_share"),
          dd("project_delete_view_n_external"),
          dd("project_delete_view_n_story")
        )
      }

      if (hasSources) {
        names(tableSourcesProject) <- c(
          dd("source_id"),
          dd("source_title"),
          dd("check_source_global_enable")
        )
      }

      if (hasViewsDep) {
        names(tableViewsDep) <- c(
          dd("view_id_short"),
          dd("view_title"),
          dd("project")
        )
      }

      if (hasSourcesDep) {
        names(tableSourcesDep) <- c(
          dd("source_id"),
          dd("source_title"),
          dd("project")
        )
      }

      ui <- tags$ul(

        # For Views
        tags$li(
          tags$b(dd("project_delete_table_views", language)),
          ":",
          if (hasViews) mxTableToHtml(tableViewsProject)
        ),

        # For Sources
        tags$li(
          tags$b(dd("project_delete_table_sources", language)),
          ":",
          if (hasSources) mxTableToHtml(tableSourcesProject)
        ),

        # For Views Dependencies
        tags$li(
          tags$b(dd("project_delete_table_views_dep", language)),
          ":",
          if (hasViewsDep) mxTableToHtml(tableViewsDep)
        ),

        # For Sources Dependencies
        tags$li(
          tags$b(dd("project_delete_table_sources_dep", language)),
          ":",
          if (hasSourcesDep) mxTableToHtml(tableSourcesDep)
        )
      )

      btnDelete <- actionButton(
        "btnDeleteProjectConfirm",
        dd("btn_confirm", language)
      )

      mxModal(
        id = "deleteProject",
        title = modalTitle,
        minWidth = "100%",
        top = "0px",
        left = "0px",
        content = ui,
        textCloseButton = dd("btn_cancel", language),
        buttons = list(btnDelete)
      )
    }
  )
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

    sources <- na.omit(unique(c(
      reactData$projectDeleteSources,
      reactData$projectDeleteSourcesDep
    )))


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
        if (length(views) > 0) {
          viewsQuery <- sprintf(
            "DELETE FROM mx_views WHERE id IN ('%s')",
            paste(views, collapse = "','")
          )
          dbExecute(con, viewsQuery)
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
            # - CASCADE required if removing a pg view dependencies before
            #   the join
            #
            queryTableDrop <- sprintf(
              "DROP TABLE IF EXISTS %s CASCADE",
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
        warning(e)
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
