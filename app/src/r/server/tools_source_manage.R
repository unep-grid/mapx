#
# Toolbox button : trigger select modal
#
observeEvent(input$btnEditSourceSettings, {
  mxCatch(title = "btn edit source metadata", {
    userRole <- getUserRole()
    isPublisher <- isTRUE(userRole$publisher)
    if (!isPublisher) {
      return()
    }

    mxShowSelectSourceEdit(id = "selectSourceLayerForManage")
  })
})

#
# Modal prompt value
#
observeEvent(input$selectSourceLayerForManage, {
  mxCatch(title = "Edit source : trigger manage", {
    #
    # data = {idSource:<id_src>, update:timestamp}
    #
    data <- input$selectSourceLayerForManage
    if (isEmpty(data$idSource)) {
      return()
    }
    reactData$triggerSourceManage <- data
  })
})



reactSourceEditInfo <- reactive({
  idSource <- reactData$triggerSourceManage$idSource
  userData <- reactUser$data
  language <- reactData$language
  idProject <- reactData$project
  idUser <- .get(userData, c("id"))

  if (isEmpty(idSource)) {
    return(list())
  }

  mxDbGetSourceEditInfo(
    idProject = idProject,
    idSource = idSource,
    idUser = idUser,
    language
  )
})






#
# Trigger received
#
observeEvent(reactData$triggerSourceManage, {
  mxCatch(title = "Edit source settings", {
    idSource <- reactData$triggerSourceManage$idSource
    userRole <- getUserRole()
    isPublisher <- isTRUE(userRole$publisher)
    language <- reactData$language
    idSources <- reactListEditSources()
    isAllowed <- idSource %in% idSources
    project <- reactData$project
    isRoot <- isTRUE(userRole$root)

    if (!isPublisher || !isAllowed) {
      return()
    }

    #
    # Get sources data
    #
    src <- reactSourceEditInfo()

    #
    # Who can view this
    #
    sourceReadTarget <- c("publishers", "admins")
    sourceEditTarget <- c("publishers", "admins")
    #
    # uncomment if ogc service requested for join
    # if (src$type %in% c('join','vector'))
    #
    if (src$type %in% list("vector")) {
      sourceEditServices <- c("mx_download", "gs_ws_b", "mx_postgis_tiler")
    } else {
      sourceEditServices <- c("mx_download")
    }
    names(sourceEditServices) <- d(sourceEditServices, lang = language)

    #
    # Build views table
    #
    if (src$hasViews) {
      tableViews <- src$tableViews[, c(
        "title",
        "email_editor",
        "title_project"
      )]
      names(tableViews) <- c(
        d("title", w = FALSE, lang = language),
        d("email_editor", w = FALSE, lang = language),
        d("project", w = FALSE, lang = language)
      )

      tblViews <- tagList(
        tags$label(d("tbl_views_depending_source", language)),
        tableOutput("tbl_views_depending_source")
      )
    } else {
      tblViews <- tagList()
    }

    #
    # Build table for dependencies
    #
    if (src$hasDependencies) {
      #
      # Table format
      #
      tableDependencies <- src$tableDependencies[, c(
        "title",
        "email_editor",
        "title_project"
      )]
      names(tableDependencies) <- c(
        d("title", w = FALSE, lang = language),
        d("email_editor", w = FALSE, lang = language),
        d("project", w = FALSE, lang = language)
      )

      tblDependencies <- tagList(
        tags$label(d("tbl_dependencies_source", language)),
        tableOutput("tbl_dependencies_source")
      )
    } else {
      tblDependencies <- tagList()
    }

    #
    # Quick source summmary
    #
    uiSummary <- tags$ul(
      class = "list-group",
      tagList(
        tags$li(
          class = "list-group-item",
          tags$label(
            d("source_title", w = FALSE, lang = language)
          ),
          tags$span(
            class = "badge",
            src$sourceTitle
          )
        ),
        tags$li(
          class = "list-group-item",
          tags$label(
            d("source_id", w = FALSE, lang = language)
          ),
          tags$span(
            class = "badge",
            idSource
          )
        ),
        tags$li(
          class = "list-group-item",
          tags$label(
            d("email_editor", w = FALSE, lang = language)
          ),
          tags$span(
            class = "badge",
            src$emailLastEditor
          )
        )
      )
    )

    uiOut <- tagList(
      tags$div(
        class = "mx-sticky-top-20",
        uiOutput("uiValidateSourceSettings")
      ),
      uiSummary,
      selectizeInput(
        inputId = "selectSourceReadersUpdate",
        label = d("source_target_readers", language),
        choices = sourceReadTarget,
        selected = src$readers,
        multiple = TRUE,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
        )
      ),
      selectizeInput(
        inputId = "selectSourceEditorsUpdate",
        label = d("source_target_editors", language),
        choices = sourceEditTarget,
        selected = src$editors,
        multiple = TRUE,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
        )
      ),
      selectizeInput(
        inputId = "selectSourceServicesUpdate",
        label = d("source_services", language),
        choices = sourceEditServices,
        selected = as.list(src$services),
        multiple = TRUE,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
        )
      ),
      checkboxInput(
        "checkSourceGlobal",
        label = ddesc("check_source_global_enable", language),
        value = isTRUE(src$global),
      ),
      tblViews,
      tblDependencies,
    )

    btnList <- tagList(
      actionButton(
        inputId = "btnUpdateSource",
        label = d("btn_update", language)
      ),
      actionButton(
        inputId = "btnDeleteSource",
        class = "mx-modal-btn-float-right",
        label = d("btn_delete", language)
      )
    )

    mxModal(
      id = "editSourceSettings",
      title = d("source_edit_settings", language),
      content = uiOut,
      buttons = btnList,
      textCloseButton = d("btn_close", language),
      minWidth = 700
    )

    #
    # Set value for checkbox 'global' source
    #
    mxUpdateCheckboxInput(
      id = "checkSourceGlobal",
      disabled = !isRoot,
      checked = src$global
    )

    #
    # Render table
    #

    if (src$hasViews) {
      output$tbl_views_depending_source <- renderTable({
        tableViews
      })
    }

    if (src$hasDependencies) {
      output$tbl_dependencies_source <- renderTable({
        tableDependencies
      })
    }
  })
})


#
# Validation
#
observe({
  mxCatch(title = "Edit source validate", {
    src <- reactSourceEditInfo()
    userRole <- getUserRole()
    readers <- input$selectSourceReadersUpdate
    editors <- input$selectSourceEditorsUpdate
    global <- isTRUE(input$checkSourceGlobal)
    language <- reactData$language

    isolate({
      errors <- logical(0)
      warning <- logical(0)

      hasNoLayer <- isEmpty(src$idSource)
      isPublisher <- isTRUE(userRole$publisher)

      if (hasNoLayer || !isPublisher) {
        return()
      }

      hasNoReaders <- isEmpty(readers)

      blockDelete <- src$hasViews || src$hasDependencies
      blockUpdate <- hasNoReaders && (src$hasExtViews || src$hasExtDependencies)
      blockGlobal <- src$hasExtViews || src$hasExtDependencies

      errors["error_views_need_publishers"] <- blockUpdate
      errors["error_views_require_source"] <- src$hasViews
      errors["error_source_has_dependencies"] <- src$hasDependencies

      errors <- errors[errors]
      hasError <- length(errors) > 0

      output$uiValidateSourceSettings <- renderUI(
        mxErrorsToUi(
          errors = errors,
          warning = warning,
          language = language
        )
      )

      mxToggleButton(
        id = "btnUpdateSource",
        disable = blockUpdate
      )

      mxToggleButton(
        id = "btnDeleteSource",
        disable = blockDelete
      )

      if (blockGlobal) {
        mxUpdateCheckboxInput(
          id = "checkSourceGlobal",
          disabled = blockGlobal,
          checked = blockGlobal
        )
      }
    })

    reactData$sourceEditBlockDelete <- blockDelete
    reactData$sourceEditBlockUpdate <- blockUpdate
  })
})


#
# Delete confirmation
#
observeEvent(input$btnDeleteSource, {
  language <- reactData$language
  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  if (blockDelete) {
    return()
  }

  #
  # Button to confirm the source removal
  #
  btnList <- list(
    actionButton(
      inputId = "btnDeleteSourceConfirm",
      label = d("btn_confirm", language)
    )
  )
  #
  # Generate the modal panel
  #
  mxModal(
    id = "editSourceManageDeleteConfirm",
    title = d("source_confirm_remove", language),
    content = tags$span(d("source_confirm_remove", language)),
    buttons = btnList,
    textCloseButton = d("btn_close", language),
    addBackground = TRUE
  )
})



#
# Source delete final
#
observeEvent(input$btnDeleteSourceConfirm, {
  mxCatch(title = "Edit source : delete ", {
    blockDelete <- isTRUE(reactData$sourceEditBlockDelete)
    idSource <- reactData$triggerSourceManage$idSource
    userRole <- getUserRole()
    isPublisher <- isTRUE(userRole$publisher)
    project <- reactData$project
    language <- reactData$language
    idUser <- reactUser$data$id

    if (blockDelete || !isPublisher) {
      return()
    }

    mxModal(
      id = "editSourceManageDeleteConfirm",
      close = TRUE
    )


    mxDbDropLayer(idSource)

    mxModal(
      id = "editSourceSettings",
      close = TRUE
    )

    reactData$updateEditSourceLayerList <- runif(1)

    mxModal(
      id = "uiConfirmSourceRemoveDone",
      title = d("source_removed"),
      content = tags$span(d("source_removed", lang = language)),
      textCloseButton = d("btn_close", language)
    )
  })
})


#
# Update source
#
observeEvent(input$btnUpdateSource, {
  mxCatch(title = "Edit source : update", {
    userRole <- getUserRole()
    idSource <- reactData$triggerSourceManage$idSource
    project <- reactData$project
    language <- reactData$language
    idUser <- reactUser$data$id
    email <- reactUser$data$email
    isPublisher <- isTRUE(userRole$publisher)
    isRoot <- isTRUE(userRole$root)
    idGroupsServices <- input$selectSourceServicesUpdate
    readers <- input$selectSourceReadersUpdate
    editors <- input$selectSourceEditorsUpdate
    isGlobal <- input$checkSourceGlobal


    blockUpdate <- isTRUE(reactData$sourceEditBlockUpdate)

    if (blockUpdate || !isPublisher) {
      return()
    }

    #
    # Last check
    # -> stop if global has been changed and a join or a view has been created
    # in the meantime
    #
    if (isRoot) {
      src <- reactSourceEditInfo()

      hasDependencies <- src$hasExtDependencies
      hasViews <- src$hasExtViews

      if (!isGlobal && (hasDependencies || hasViews)) {
        isGlobal <- TRUE
      }
    }

    #
    # Control roles
    #
    mxDbUpdate(
      table = .get(config, c("pg", "tables", "sources")),
      idCol = "id",
      id = idSource,
      column = "date_modified",
      value = Sys.time()
    )

    mxDbUpdate(
      table = .get(config, c("pg", "tables", "sources")),
      idCol = "id",
      id = idSource,
      column = "services",
      value = as.list(idGroupsServices)
    )

    mxDbUpdate(
      table = .get(config, c("pg", "tables", "sources")),
      idCol = "id",
      id = idSource,
      column = "readers",
      value = as.list(readers)
    )

    mxDbUpdate(
      table = .get(config, c("pg", "tables", "sources")),
      idCol = "id",
      id = idSource,
      column = "editor",
      value = idUser
    )

    mxDbUpdate(
      table = .get(config, c("pg", "tables", "sources")),
      idCol = "id",
      id = idSource,
      column = "editors",
      value = as.list(editors)
    )


    if (isRoot) {
      mxDbUpdate(
        table = .get(config, c("pg", "tables", "sources")),
        idCol = "id",
        id = idSource,
        column = "global",
        value = isGlobal
      )
    }

    #
    # Generate the modal panel
    #
    mxFlashIcon("floppy-o")
    mxUpdateText(
      "editSourceSettings_txt",
      sprintf("Saved at %1$s", format(Sys.time(), "%H:%M"))
    )

    #
    # Invalidate source list
    #
    reactData$updateEditSourceLayerList <- runif(1)

    #
    # Invalidate view list
    #
    reactData$updateViewsList <- runif(1)
  })
})
