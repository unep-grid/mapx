

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

  out <- mxPanel(
    headIcon="plus",
    subtitle = d("view_new_text",language),
    listActionButton = buttons,
    addCloseButton=TRUE,
    closeButtonText=d("btn_cancel",language),
    html = tags$div(
      selectInput(
        inputId = "selectViewType",
        label = d("view_type_select",language),
        choices = typeChoices
        ),
      textInput(
        inputId="txtViewTitle",
        label=d("view_title",language),
        value = idView
        ),
      tags$span(d("view_id",language),":",tags$b(idView)),
      uiOutput("uiTxtValidation")
      )
    )

  output$panelModal <- renderUI(out)

})


observeEvent(input$txtViewTitle,{

  title <- input$txtViewTitle
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

  out <- mxPanel(
    headIcon="check",
    subtitle = d("view_new_created",language),
    addCloseButton=TRUE,
    closeButtonText=d("btn_close",language),
    html = tags$span(d("view_new_created",language))
    )

  output$panelModal <- renderUI(out)

  }
})


