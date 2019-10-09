

observeEvent(input$btnAddView,{

  language <- reactData$language

  idView <- randomString(
    prefix="MX-",
    splitIn=3,
    addLETTERS=T,
    addLetters=F,
    splitSep="-",
    sep = "-"
    )


  typeChoices <- config[[c("views","type")]]

  names(typeChoices) <- d(unlist(typeChoices), language)

  reactData$viewAddId<- idView

  buttons <- list(
    actionButton(
      inputId = "btnAddViewConfirm",
      label = d("create",language),
      disable=TRUE
      )
    )

  mxModal(
    id = "createNewView",
    title = d("view_new_text",language),
    buttons = buttons,
    textCloseButton = d("btn_cancel",language),
    content = tags$div(
      selectizeInput(
        inputId = "selectViewType",
        label = d("view_type_select",language),
        choices = typeChoices,
        options = list(
          )
        ),
      textInput(
        inputId = "txtViewTitle",
        label = d("view_title",language),
        value = idView
        ),
      uiOutput("uiViewTitleValidation")
      )
    )


})


observeEvent(input$txtViewTitle,{

  title <- trimws(subPunct(input$txtViewTitle," "))
  project <- reactData$project
  language <- reactData$language
  idView <- reactData$viewAddId
  v <- .get(config,c('validation','input','nchar'))
  errors <- logical(0)
  warning <- logical(0)

  errors['error_title_short'] <- noDataCheck(title) || nchar(title) < v$viewTitle$min
  errors['error_title_long'] <-  nchar(title) > v$viewTitle$max
  errors['error_title_bad'] <- mxProfanityChecker(title)
  errors['error_title_exists'] <-  mxDbViewTitleExists(
    title = title,
    project= project,
    languages = config[["languages"]][["list"]]
    )

  errors <- errors[errors]
  hasError <- length(errors) > 0

  mxUiHide(
    id = "btnAddViewConfirm",
    hide = FALSE,
    disable = hasError
    )

  output$uiViewTitleValidation<- renderUI(
    mxErrorsToUi(
      errors = errors,
      warning = warning,
      language = language
      )
    )

  reactData$viewAddHasError <- hasError
  reactData$viewAddTitle <- title

})


observeEvent(input$btnAddViewConfirm,{

  project <- reactData$project
  userData <- reactUser$data
  title  <- reactData$viewAddTitle
  idView <- reactData$viewAddId
  language <- reactData$language
  viewType <- input$selectViewType
  hasErrors  <- reactData$viewAddHasError

  if(hasErrors) return();

  #
  # view data skeleton
  # 
  data <- list(
    title =  list(),
    abstract = list()
    )

  #
  # Set values data text
  #
  data[[c("title", language )]] <- title
  #data[[c("collections")]] <- as.list(collections)

  #
  # Row to add in db
  #
  newView <- list(
    id = idView,
    project = project,
    editor = userData$id,
    date_modified = Sys.time(),
    readers =  list(),
    editors = list(),
    data = data,
    type = viewType
    )

  mxDbAddRow(
    data=newView,
    table=.get(config,c("pg","tables","views"))
    )

  # edit flag
  newView$`_edit` = TRUE 

  # add this as new (empty) source
  mglUpdateViewsList(
    id = .get(config,c("map","id")),
    viewsList = newView,
    render = TRUE,
    project = project
    )

  reactData$updateViewListFetchOnly <- runif(1)

  mxModal(
    id="createNewView",
    title=d("view_new_created",language),
    content=tags$span(d("view_new_created",language))
    )

})


