
observeEvent(input$btnValidateSourceGeom,{

  mxCatch(title="btn validate source geom",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    reactData$validateGeomValidation = isPublisher

    if( !isPublisher ){
      return()
    }else{

      layers <- reactListEditSources()

      uiOut <- tags$form(id='formValidateGeomTool',tagList(
          selectizeInput(
            inputId = "selectSourceValidateGeom",
            label = d("source_select_layer",language),
            choices = layers,
            multiple = FALSE,
            options = list(
              sortField="label"
              )
            ),
          checkboxInput(
            inputId = "checkSourceValidateGeomOptions",
            label = d("source_validate_geom_show_expert_options",language),
            value = FALSE
            ),
          conditionalPanel(
            condition = "input.checkSourceValidateGeomOptions",
            wellPanel(
              checkboxInput(
                inputId = "checkSourceValidateGeomUseCache",
                label = d("source_validate_geom_use_cache",language),
                value = TRUE
                ),
              checkboxInput(
                inputId = "checkSourceValidateGeomAutoCorrect",
                label = d("source_validate_geom_auto_correct",language),
                value = FALSE
                ),
              conditionalPanel(
                condition = "input.checkSourceValidateGeomAutoCorrect",
                tags$p(class='text-muted',d('source_validate_geom_auto_correct_info',language))
                )
              )
            ),
          tags$div(
            class="form-groups",
            tags$label(d('logs',language)),
            tags$div(
              class="form-control mx-logs",
              tags$ul(id="ulValidateGeomMessage")
              )
            )


          )
        )

      btn <- list(
        actionButton(
          "btnValidateGeom",
          d("btn_analyse",language),
          disabled = TRUE
          )
        )

      mxModal(
        id = "validateSourceGeom",
        title = d("source_validate_title",language),
        content = uiOut,
        buttons = btn,
        textCloseButton = d("btn_close",language)
        )

    }
})
})

#
# Disable btn edit if not allowed
#
observeEvent(input$selectSourceValidateGeom,{

  language <- reactData$language
  layer <- input$selectSourceValidateGeom
  layers <- reactListEditSources()
  isAllowed <- layer %in% layers
  disableValidate <- TRUE
  disableCorrect <- TRUE

  if(isAllowed){
    disableValidate <- FALSE
    disableCorrect <- !all(mxDbGetLayerGeomTypes(layer)$geom_type %in% c('polygon'))
  }
  mxToggleButton(
    id="btnValidateGeom",
    disable = disableValidate
    )
  mxToggleButton(
    id = "checkSourceValidateGeomAutoCorrect",
    disable = disableCorrect
    )
  updateCheckboxInput(
    session,
    inputId = 'checkSourceValidateGeomAutoCorrect',
    value = FALSE
    )
  reactData$validateGeomValidation = !disableValidate 

})

observeEvent(input$btnValidateGeom,{

  if(!reactData$validateGeomValidation) return()

  mxToggleButton(
    id="btnValidateGeom",
    disable = TRUE
    )

  opt <- input$checkSourceValidateGeomOptions
  useCache <- ifelse(opt,input$checkSourceValidateGeomUseCache,TRUE)
  autoCorrect <- ifelse(opt,input$checkSourceValidateGeomAutoCorrect,FALSE)

  mglGetValidateSourceGeom(list(
      idForm = "formValidateGeomTool", 
      idSource = input$selectSourceValidateGeom,
      useCache = useCache,
      autoCorrect = autoCorrect,
      idListMessage = "ulValidateGeomMessage",
      idButtonValidate = "btnValidateGeom"
      ))
})

