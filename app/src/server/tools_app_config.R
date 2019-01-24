#
# App config
#






observe({

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  isolate({
    language <- reactData$language

    if( "appConfig" %in% access  ){

      appConfig <- tagList(
        tags$h4(d("title_tools_config",language)),
        actionButton(
          label = d("btn_show_app_config",language),
          inputId = "btnShowAppConfig",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_app_config"
          )
        )

      output$uiBtnShowAppConfig <- renderUI(appConfig)

    }

  })
})


observeEvent(input$btnShowAppConfig,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  isolate({
    language <- reactData$language

    if( "appConfig" %in% access  ){

      ui <- tagList(
        jedOutput("appConfigEdit")
        )

      mxModal(
        id = "appConfig",
        title = d("title_tools_config",language),
        content = ui,
        textCloseButton = d("btn_close",language),
        )

    }

  })

})






observeEvent(input$appConfigEdit_init,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))
  languages <- .get(config,c("languages","list"))

  isolate({
    language <- reactData$language

    if( "appConfig" %in% access  ){

      schema = list(
        title = "App config",
        type = "object",
        properties = list(
          #
          # About
          #
          about = list(
            type =  "array",
            title = "About",
            items = list(
              type = "object",
              title = "Section",
              properties = list(
                title = mxSchemaMultiLingualInput(
                  dict = config$dict,
                  language =  language,
                  keyTitle = "title",
                  languagesRequired = c("en"),
                  languagesHidden = languages[!languages %in% language]
                  ),
                content = mxSchemaMultiLingualInput(
                  dict = config$dict,
                  language =  language,
                  keyTitle = "content",
                  format = "textarea",
                  options = list(
                    editor = "ace",
                    language = "html"
                    ),
                  languagesRequired = c("en"),
                  languagesHidden = languages[!languages %in% language]
                  )
                )
              )
            )
          )
        )

      #
      # Create editor
      #
      jedSchema(
        id = "appConfigEdit",
        schema = schema,
        startVal = list(
          about = mxDbConfigGet("about")
          ),
        options = list(
          getValidationOnChange = TRUE,
          getValuesOnChange = TRUE
          )
        )

    }

  })

})


observeEvent(input$appConfigEdit_values,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))
  data <- input$appConfigEdit_values$data;
  hasIssues <- length(input$appConfigEdit_issues$data)>0

  if( "appConfig" %in% access  && !hasIssues ){
    for(name in names(data)){
      mxDbConfigSet(name,data[[name]])
    }
  }

})


