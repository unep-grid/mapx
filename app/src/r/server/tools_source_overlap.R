observeEvent(input$btnAnalysisOverlap,{

  mxCatch("Edit source panel",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    project <- reactData$project
    userData <- reactUser
    idUser <- .get(userData,c("data","id"))
    emailUser <- .get(userData,c("data","email"))

    if( !isPublisher ){

      reactData$validateOverlap = FALSE
      return()

    }else{
      layers <- reactListEditSourcesVector()
      countries <- mxDbGetProjectData(project)$countries

      uiOut <- tags$form(id='formOverlapTool',tagList(
          selectizeInput(
            inputId = "selectOverlapLayers",
            label = d("select_overlap_layers",language),
            choices = layers,
            selected = NULL,
            multiple = TRUE,
            options=list(
              plugins = list(
                "remove_button",
                "drag_drop"
                )
              )
            ),
          checkboxInput(
            inputId='checkOverlapAddSourceFromView',
            label = d('check_add_source_from_view',language)
            ),
          conditionalPanel(
            condition = "input.checkOverlapAddSourceFromView",
            wellPanel(
              selectizeInput(
                inputId = "selectOverlapSourceFromView",
                label = d("select_overlap_source_from_view",language),
                choices = reactViewsCompactListVector(),
                selected = reactViewsCheckedList(),
                multiple = TRUE,
                options = list(
                  plugins = list("remove_button"),
                  sortField = "label"
                  )
                ),
              actionButton(
                inputId = "btnOverlapAddSourceFromView",
                label = d("btn_add_source_from_view",language)
                )
              )
            ),
          selectInput(
            inputId = "selectOverlapCountries",
            label = d("select_overlap_countries",language),
            choices = mxGetCountryList(language,includeWorld=F),
            selected = countries
            ),
          radioButtons("radioOverlapMode", d("radio_source_overlap_mode",language),
            choiceNames = list(
              d('source_overlap_mode_area',language),
              d('source_overlap_mode_create_source',language)
              ),
            choiceValues = list(
              "getArea","createSource"
              )
            ),
          conditionalPanel(
            condition='input.radioOverlapMode=="createSource"',
            textInput(
              inputId='txtSourceTitle',
              label=d('source_title',language)  
              ),
             p(class="text-muted",
               sprintf(
                 d("source_overlap_new_source_email_info",language),
                   emailUser
                 )
               )
            ),
          conditionalPanel(
            condition='input.radioOverlapMode=="getArea"',
            tags$div(
              class="form-group",
              tags$label(d('calc_area_result',language)),
              tags$div(
                id="txtAreaResult",
                class="form-control"
                )
              )
            ),
          tags$div(
            class="form-groups",
            tags$label(d('logs',language)),
            tags$div(
              class="form-control mx-logs",
              tags$ul(id="ulOverlapMessages")
              )
            ),
          uiOutput("uiValidateOverlap")
          )
        )

      btnList <- list(
        actionButton(
          inputId = "btnOverlapAnalyse",
          label = d("btn_analyse",language),
          disabled = TRUE
          )
        )

      #
      # create modal
      #
      mxModal(
        id = "modalOverlapTool",
        title = d("title_overlap_tools",language),
        content = uiOut,
        textCloseButton = d("btn_close",language),
        buttons = btnList
        )

    }


})

})


#
# Validation of download format
# 
observe({

  layers <- input$selectOverlapLayers
  countries <- input$selectOverlapCountries
  title <- input$txtSourceTitle
  createMode <- isTRUE(input$radioOverlapMode == "createSource")

  isolate({
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE

    err[['n_layers_less_1']] <- noDataCheck(layers) || length(layers) < 1
    err[['n_layers_more_3']] <- length(layers) > 3
    err[['n_country_not_1']] <- noDataCheck(countries) || length(countries) != 1
    if(createMode){
      err[['error_title_short']] <- noDataCheck(title) || nchar(title) < 5
      err[['error_title_not_valid']] <- mxProfanityChecker(title)
    }

    output$uiValidateOverlap <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    reactData$validateOverlap = !hasErrors
    mxToggleButton(
      id="btnOverlapAnalyse",
      disable = hasErrors
      )
  })
})


observeEvent(input$btnOverlapAddSourceFromView,{

  mxCatch("Update overlap source list from view list",{
  language <- reactData$language
  #
  # Get views list, get linked source
  #
  views <- reactViewsCompact()
  idViewsSelected <- input$selectOverlapSourceFromView
  if(noDataCheck(idViewsSelected)) return()

  viewsSubset <- views[sapply(views,function(v){v$id %in% idViewsSelected})]
  idSourcesViews <- lapply(viewsSubset,`[[`,"_source")
 
  #
  # Build all source list
  #
  idSourcesAll <- unique(c(reactListEditSourcesVector(),idSourcesViews))
  idSourcesAll <-  mxDbGetSourceTitle(idSourcesAll,asNamedList=TRUE, language=language)
  
  #
  # Build selected list
  #
  idSourcesSelected <- input$selectOverlapLayers
  if(noDataCheck(idSourcesSelected)){
    idSourcesSelected <- list()
  }
  idSourcesSelected <- unique(c(as.list(idSourcesSelected),as.list(idSourcesViews)))

  #
  # Update select input
  #
  updateSelectizeInput(
    session = session,
    inputId = 'selectOverlapLayers',
    selected = idSourcesSelected,
    choices = idSourcesAll
    )

  })
})


observeEvent(input$btnOverlapAnalyse,{

  if(!reactData$validateOverlap) return()

    mxToggleButton(
      id="btnOverlapAnalyse",
      disable = TRUE
      )

  mglGetOverlapAnalysis(list(
      layers = as.list(input$selectOverlapLayers),
      countries = as.list(input$selectOverlapCountries),
      method = input$radioOverlapMode, 
      sourceTitle = input$txtSourceTitle,
      idTextResult = "txtAreaResult",
      idListMessage = "ulOverlapMessages",
      idForm = "formOverlapTool",
      idButtonAnalyse = "btnOverlapAnalyse"
      ))

})


