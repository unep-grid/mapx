observeEvent(input$btnAnalysisOverlap,{

  mxCatch("Edit source panel",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    project <- reactData$project
    userData <- reactUser
    idUser <- .get(userData,c("data","id"))

    if( !isPublisher ){

      reactData$validateOverlap = FALSE
      return()

    }else{


      layers <- reactTableEditSources()

      if(noDataCheck(layers)){
        layers <- list("noLayer")
      }else{
        layers <- mxGetLayerNamedList( layers )
      }

      countries <- mxDbGetProjectData(project)$countries


      uiOut <- tags$form(id='formOverlapTool',tagList(
          selectInput(
            inputId = "selectOverlapLayers",
            label = d("select_overlap_layers",language),
            choices = layers,
            selected = layers[[1]],
            multiple = TRUE
            ),
          selectInput(
            inputId = "selectOverlapCountries",
            label = d("select_overlap_countries",language),
            choices = mxGetCountryList(language,includeWorld=F),
            selected = countries
            ),
          tags$div(
            class="form-group",
            tags$label(d('calc_area_result',language)),
            tags$div(
              id="txtAreaResult",
              class="form-control"
              )           
            ),
          uiOutput("uiValidateOverlap")
          )
        )

      btnList <- list(
        actionButton(
          inputId = "btnOverlapArea",
          label = d("btn_calculate_area",language),
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
  
  isolate({
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE

    err[['n_layers_less_1']] <- noDataCheck(layers) || length(layers) < 1
    err[['n_layers_more_3']] <- length(layers) > 3
    err[['n_country_not_1']] <- noDataCheck(countries) || length(countries) != 1

    output$uiValidateOverlap <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    reactData$validateOverlap = !hasErrors
    mxToggleButton(
      id="btnOverlapArea",
      disable = hasErrors
      )
  })
})

observeEvent(input$btnOverlapArea,{

  if(!reactData$validateOverlap) return()

  mglGetOverlapAnalysis(list(
      layers = as.list(input$selectOverlapLayers),
      countries = as.list(input$selectOverlapCountries),
      method = "getArea", 
      idTextResult = "txtAreaResult"
      ))

})

