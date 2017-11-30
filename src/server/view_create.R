

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

  typeChoices <- d(unlist(typeChoices), language)

  reactData$viewAddId <- idView

  buttons <- list(
    actionButton(
      inputId="btnAddViewConfirm",
      label=d("create",language),
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
          dropdownParent="body"
          )
        ),
      textInput(
        inputId="txtViewTitle",
        label=d("view_title",language),
        value = idView
        ),
      uiOutput("uiTxtValidation")
      )
    )


})


observeEvent(input$txtViewTitle,{

  title <- subPunct(input$txtViewTitle," ")
  country <- reactData$country
  language <- reactData$language

  idView <- reactData$viewAddId

  errors <- logical(0)
  warning <- logical(0)

  errors['error_view_title_short'] <- noDataCheck(title) || nchar(title) < 5

  errors['error_view_title_exists'] <-  mxDbExistsViewTitle(
    title = title,
    country= country,
    languages = config[["languages"]][["list"]]
    )

  errors <- errors[errors]


  hasError <- length(errors) > 0

  mxUiHide(
    id="btnAddViewConfirm",
    hide=FALSE,
    disable=hasError
    )

  output$uiTxtValidation <- renderUI(
    mxErrorsToUi(
      errors=errors,
      warning=warning,
      language=language
      )
    )

  reactData$viewAddHasError <- hasError
  reactData$viewAddTitle <- title

})


observeEvent(input$btnAddViewConfirm,{

  if(!reactData$viewAddHasError){
    country <- reactData$country
    userData <- reactUser$data
    title  <- reactData$viewAddTitle
    idView <- reactData$viewAddId

    language <- reactData$language
    collections <- query$collections
    viewType <- input$selectViewType
     
    #languageList <- config[[c("languages","list")]]

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
    data[[c("collections")]] <- as.list(collections)

    #
    # Row to add in db
    #
    newView <- list(
      id = idView,
      country = country,
      editor = userData$id,
      target = list("self"),
      date_modified = Sys.time(),
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
  mglSetSourcesFromViews(
    id = .get(config,c("map","id")),
    viewsList = newView,
    render = FALSE,
    country = country
    )

  reactData$updateViewListFetchOnly <- runif(1)

   mxModal(
      id="createNewView",
      close=TRUE
      )

   mxModal(
      id="createNewViewSuccess",
      title=d("view_new_created",language),
      content=tags$b(d("view_new_created",language))
      )

  }
})


