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


observeEvent(input$selectSourceLayerForManage, {
  mxCatch(title = "Edit source : trigger manage", {
    data <- input$selectSourceLayerForManage
    if (isEmpty(data$idSource)) {
      return()
    }
    reactData$triggerSourceManage <- data
  })
})



observeEvent(reactData$triggerSourceManage, {
  mxCatch(title = "Edit source settings", {
    layer <- reactData$triggerSourceManage$idSource
    userRole <- getUserRole()
    isPublisher <- isTRUE(userRole$publisher)
    language <- reactData$language
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project
    isRoot <- isTRUE(userRole$root)

    if (!isPublisher || !isAllowed) {
      return()
    }


    idSource <- layer
    sourceData <- mxDbGetSourceData(idSource)
    services <- mxDbGetSourceServices(idSource)
    readers <- sourceData$readers
    editors <- sourceData$editors
    global <- isTRUE(sourceData$global)
    type <- sourceData$type

    #
    # Who can view this
    #
    sourceReadTarget <- c("publishers", "admins")
    sourceEditTarget <- c("publishers", "admins")
    if (type == "vector") {
      sourceEditServices <- c("mx_download", "gs_ws_b", "mx_postgis_tiler")
    } else {
      sourceEditServices <- c("mx_download")
    }
    names(sourceEditServices) <- d(sourceEditServices, lang = language)

    #
    # Format view list by email
    #
    viewsTable <- reactTableViewsUsingSource()
    viewsTable <- viewsTable[, c(
      "title",
      "email_editor",
      "title_project"
    )]
    hasViews <- isNotEmpty(viewsTable)


    if (hasViews) {
      names(viewsTable) <- c(
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
    # Also list hidden dependencies
    #
    tableDependencies <- reactDependenciesUsingSource()
    tableDependencies <- tableDependencies[, c(
      "title",
      "email_editor",
      "title_project"
    )]
    hasDependencies <- isNotEmpty(tableDependencies)

    if (hasDependencies) {
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


    uiOut <- tagList(
      selectizeInput(
        inputId = "selectSourceReadersUpdate",
        label = d("source_target_readers", language),
        choices = sourceReadTarget,
        selected = readers,
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
        selected = editors,
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
        selected = as.list(services),
        multiple = TRUE,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
        )
      ),
      checkboxInput(
        "checkSourceGlobal",
        label = ddesc("check_source_global_enable", language),
        value = isTRUE(global),
      ),
      tblViews,
      tblDependencies,
      uiOutput("uiValidateSourceSettings")
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
      checked = global
    )


    if (hasViews) {
      output$tbl_views_depending_source <- renderTable({
        viewsTable
      })
    }

    if (hasDependencies) {
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
    userRole <- getUserRole()
    idSource <- reactData$triggerSourceManage$idSource
    language <- reactData$language
    readers <- input$selectSourceReadersUpdate
    editors <- input$selectSourceEditorsUpdate
    errors <- logical(0)
    warning <- logical(0)
    userData <- reactUser$data
    idUser <- .get(userData, c("id"))
    hasNoLayer <- isEmpty(idSource)
    hasNoReaders <- !isTRUE("publishers" %in% readers)
    isPublisher <- isTRUE(userRole$publisher)



    if (hasNoLayer || !isPublisher) {
      return()
    }

    views <- reactTableViewsUsingSource()
    dependencies <- reactDependenciesUsingSource()

    isolate({
      hasViews <- isNotEmpty(views)
      hasDependencies <- isNotEmpty(dependencies)
      hasViewsFromOthers <- !isTRUE(all(views$id_editor %in% idUser))

      blockUpdate <- hasViews && hasNoReaders && hasViewsFromOthers
      blockDelete <- hasViews || hasDependencies

      errors["error_views_need_publishers"] <- blockUpdate
      errors["error_views_require_source"] <- hasViews
      errors["error_source_has_dependencies"] <- hasDependencies

      errors <- errors[errors]
      hasError <- length(errors) > 0

      reactData$sourceEditBlockUpdate <- blockUpdate
      reactData$sourceEditBlockDelete <- blockDelete

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

      mxToggleButton(
        id = "checkSourceGlobal",
        disable = hasDependencies || hasViews
      )
    })

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
  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  idSource <- reactData$triggerSourceManage$idSource
  mxCatch(title = "Edit source : delete ", {
    if (blockDelete) {
      stop("Deletion not possible : blocked")
    }

    #
    # Last check
    # prevent deletion if concurent changes
    #
    hasDependencies <- isNotEmpty(mxDbGetTableDependencies(idSource))
    hasViews <- isNotEmpty(mxDbGetViewsTableBySourceId(idSource))

    if (hasDependencies || hasView) {
      stop("Deletion not possible : state changed")
    }

    project <- reactData$project
    language <- reactData$language
    idUser <- reactUser$data$id
    userRoles <- getUserRole()






    mxModal(
      id = "editSourceManageDeleteConfirm",
      close = TRUE
    )

    mxModal(
      id = "editSourceSettings",
      close = TRUE
    )

    mxDbDropLayer(idSource)

    reactData$updateEditSourceLayerList <- runif(1)

    layers <- reactListEditSources()

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


  mxCatch(title = "Edit source : update", {
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
      isGlobalCurrent <- mxDbGetSourceData(idSource)$global
      hasDependencies <- isNotEmpty(mxDbGetTableDependencies(idSource))
      hasViews <- isNotEmpty(mxDbGetViewsTableBySourceId(idSource))
      if (isGlobal != isGlobalCurrent && (hasDependencies || hasViews)) {
        stop("Update of global not possible : concurrency issue ?")
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
    mxUpdateText("editSourceManage_txt", "Saved at " + format(Sys.time(), "%H:%M"))

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
