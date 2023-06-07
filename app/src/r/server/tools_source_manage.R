observeEvent(input$btnEditSourceSettings, {
  mxCatch(title = "btn edit source metadata", {
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    if (!isPublisher) {
      return()
    } else {
      mxShowSelectSourceEdit(id = "selectSourceLayerForManage")
    }
  })
})


observeEvent(input$selectSourceLayerForManage, {
  data <- input$selectSourceLayerForManage
  if (isEmpty(data$idSource)) {
    return()
  }
  reactData$triggerSourceManage <- data
})



observeEvent(reactData$triggerSourceManage, {
  mxCatch(title = "Edit source settings", {
    layer <- reactData$triggerSourceManage$idSource
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project

    if (!isPublisher || !isAllowed) {
      return()
    } else {
      idSource <- layer
      sourceData <- mxDbGetQuery("SELECT readers, editors,type FROM mx_sources WHERE id ='" + idSource + "'")
      services <- mxDbGetSourceServices(idSource)
      readers <- mxFromJSON(sourceData$readers)
      editors <- mxFromJSON(sourceData$editors)
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
      data <- reactTableViewsUsingSource()
      data <- data[, c("title", "email")]
      hasRow <- isTRUE(nrow(data) > 0)

      if (hasRow) {
        names(data) <- c(
          d("view_title", w = F, lang = language),
          d("login_email", w = F, lang = language)
        )

        tblViews <- tagList(
          tags$label(d("tbl_views_depending_source", language)),
          mxTableToHtml(data)
        )
      } else {
        tblViews <- tagList()
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
        tblViews,
        uiOutput("uiValidateSourceSettings")
      )


      btnDelete <- actionButton(
        inputId = "btnDeleteSource",
        class = "mx-modal-btn-float-right",
        label = d("btn_delete", language)
      )

      btnList <- tagList(
        actionButton(
          inputId = "btnUpdateSource",
          label = d("btn_update", language)
        )
      )

      #
      # Todo : check why btnDelete 'disabled' attribute
      # could not be set using actionButton(.... disabled=FALSE);
      #
      if (!hasRow) {
        btnList <- tagList(btnList, btnDelete)
      }

      mxModal(
        id = "editSourceSettings",
        title = d("source_edit_settings", language),
        content = uiOut,
        buttons = btnList,
        textCloseButton = d("btn_close", language)
      )
    }
  })
})


#
# Validation
#
observe({
  userRole <- getUserRole()
  idSource <- reactData$triggerSourceManage$idSource
  language <- reactData$language
  readers <- input$selectSourceReadersUpdate
  editors <- input$selectSourceEditorsUpdate
  errors <- logical(0)
  warning <- logical(0)
  userData <- reactUser$data
  idUser <- .get(userData, c("id"))
  hasNoLayer <- noDataCheck(idSource)
  hasNoReaders <- !isTRUE("publishers" %in% readers)
  isPublisher <- "publishers" %in% userRole$groups

  if (hasNoLayer || !isPublisher) {
    return()
  }

  data <- reactTableViewsUsingSource()

  isolate({
    hasData <- !noDataCheck(data)
    hasViewsFromOthers <- !isTRUE(all(data$editor %in% idUser))

    blockUpdate <- (hasNoLayer || (hasData && hasNoReaders && hasViewsFromOthers))
    blockDelete <- (hasNoLayer || (hasData))

    errors["error_no_layer"] <- hasNoLayer

    if (!hasNoLayer) {
      errors["error_views_need_publishers"] <- blockUpdate
      errors["error_views_need_data"] <- hasData
    }

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
    addBackground = T
  )
})



#
# Source delete final
#
observeEvent(input$btnDeleteSourceConfirm, {
  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  if (blockDelete) {
    return()
  }

  idSource <- reactData$triggerSourceManage$idSource

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


#
# Update source
#
observeEvent(input$btnUpdateSource, {
  idSource <- reactData$triggerSourceManage$idSource
  project <- reactData$project
  language <- reactData$language
  idUser <- reactUser$data$id
  email <- reactUser$data$email

  mxCatch(title = "btn update manage source", {
    userRoles <- getUserRole()

    blockUpdate <- isTRUE(reactData$sourceEditBlockUpdate)

    if (blockUpdate) {
      return()
    }
    idGroupsServicesOld <- mxDbGetSourceServices(idSource)
    idGroupsServices <- input$selectSourceServicesUpdate

    readers <- input$selectSourceReadersUpdate
    editors <- input$selectSourceEditorsUpdate
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

    # mxUpdateGeoserverSourcePublishingAsync(
    # email = email,
    # idProject = project,
    # idSource = idSource,
    # idGroups = as.list(idGroupsServices),
    # idGroupsOld = as.list(idGroupsServicesOld)
    # )

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
