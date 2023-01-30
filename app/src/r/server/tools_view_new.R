

observeEvent(input$btnAddView, {
  isGuest <- isGuestUser()
  userRole <- getUserRole()
  isPublisher <- !isGuest && "publishers" %in% userRole$groups


  if (!isPublisher) {
    return()
  }

  userData <- reactUser$data
  idUser <- userData$id
  isDev <- mxIsUserDev(idUser)
  language <- reactData$language

  idView <- randomString(
    prefix = "MX-",
    splitIn = 3,
    addLETTERS = TRUE,
    addLetters = FALSE,
    splitSep = "-",
    sep = "-"
  )

  if (isDev) {
    typeChoices <- config[[c("views", "type_dev")]]
  } else {
    typeChoices <- config[[c("views", "type")]]
  }

  names(typeChoices) <- d(unlist(typeChoices), language)

  reactData$viewAddId <- idView

  buttons <- list(
    actionButton(
      inputId = "btnAddViewConfirm",
      label = d("create", language),
      disable = TRUE
    )
  )

  mxModal(
    id = "createNewView",
    title = d("view_new_text", language),
    buttons = buttons,
    textCloseButton = d("btn_cancel", language),
    content = tags$div(
      selectizeInput(
        inputId = "selectViewType",
        label = d("view_type_select", language),
        choices = typeChoices,
        options = list()
      ),
      textInput(
        inputId = "txtViewTitle",
        label = d("view_title", language),
        value = idView
      ),
      uiOutput("uiViewTitleValidation")
    )
  )
})


observe({
  mxCatch("tools_view_new.R", {
    title <- trimws(subPunct(input$txtViewTitle, " "))
    viewType <- input$selectViewType
    isolate({
      if (!isTRUE(reactData$mapIsReady)) {
        return()
      }
      userData <- reactUser$data
      idUser <- userData$id
      isDev <- mxIsUserDev(idUser)

      if (isDev) {
        typeChoices <- config[[c("views", "type_dev")]]
      } else {
        typeChoices <- config[[c("views", "type")]]
      }

      project <- reactData$project
      language <- reactData$language
      idView <- reactData$viewAddId
      v <- .get(config, c("validation", "input", "nchar"))
      errors <- logical(0)
      warning <- logical(0)

      errors["error_type_missing"] <- isEmpty(viewType) || !viewType %in% typeChoices
      errors["error_title_short"] <- isEmpty(title) || nchar(title) < v$viewTitle$min
      errors["error_title_long"] <- isNotEmpty(title) && nchar(title) > v$viewTitle$max
      errors["error_title_bad"] <- mxProfanityChecker(title)
      errors["error_title_exists"] <- mxDbViewTitleExists(
        title = title,
        project = project,
        languages = config[["languages"]][["list"]]
      )

      errors <- errors[errors]
      hasError <- length(errors) > 0

      if (hasError) {
        browser()
      }

      mxUiHide(
        id = "btnAddViewConfirm",
        hide = FALSE,
        disable = hasError
      )

      output$uiViewTitleValidation <- renderUI(
        mxErrorsToUi(
          errors = errors,
          warning = warning,
          language = language
        )
      )

      reactData$viewAddHasError <- hasError
      reactData$viewAddTitle <- title
    })
  })
})


observeEvent(input$btnAddViewConfirm, {
  project <- reactData$project
  userData <- reactUser$data
  title <- reactData$viewAddTitle
  idView <- reactData$viewAddId
  language <- reactData$language
  viewType <- input$selectViewType
  hasErrors <- reactData$viewAddHasError

  if (hasErrors) {
    return()
  }

  #
  # Role check
  #
  isGuest <- isGuestUser()
  userRole <- getUserRole()
  isPublisher <- !isGuest && "publishers" %in% userRole$groups

  if (!isPublisher) {
    return()
  }



  #
  # view data skeleton
  #
  data <- list(
    title = list(),
    abstract = list()
  )

  #
  # Set values data text
  #
  data[[c("title", language)]] <- title
  # data[[c("collections")]] <- as.list(collections)

  #
  # Row to add in db
  #
  newView <- list(
    id = idView,
    project = project,
    editor = userData$id,
    date_modified = Sys.time(),
    readers = list(),
    editors = list(),
    data = data,
    type = viewType
  )

  mxDbAddRow(
    data = newView,
    table = .get(config, c("pg", "tables", "views"))
  )

  # edit flag
  newView$`_edit` <- TRUE

  # add this as new (empty) source
  mglUpdateViewsList(
    id = .get(config, c("map", "id")),
    viewsList = list(newView),
    render = TRUE,
    project = project
  )

  reactData$updateViewListFetchOnly <- runif(1)

  mxModal(
    id = "createNewView",
    title = d("view_new_created", language),
    content = tags$span(d("view_new_created", language))
  )
})
