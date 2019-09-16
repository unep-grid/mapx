#
# Access to self table data info
#

#
# Save variable in global for errored exiting
#
dbSelfCon_done = FALSE

observe({

  userRole <- getUserRole()

  isolate({
    language <- reactData$language
    dbInfo <- tags$div()
    isMember <- "members" %in% userRole$groups

    if( isMember ){

      dbInfo <- tagList(
        tags$h4(d("title_tools_db",language)),
        actionButton(
          label = d("btn_show_db_info_self",language),
          inputId = "btnShowDbInfoSelf",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_db_info_self"
          ),
        actionButton(
          label = d("btn_show_db_query_maker",language),
          inputId = "btnShowQueryMaker",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_db_query_maker"
          )
        )
    }

    output$uiBtnShowDbInfo <- renderUI(dbInfo)

  })
})




observeEvent(input$btnShowDbInfoSelf,{

  userRole <- getUserRole()
  language <- reactData$language
  isMember <- "members" %in% userRole$groups

  if( isMember ){

    mxCatch("dbMember",{
      sourcesList <- reactListEditSources()
      #sourcesList <- reactSourcesListEdit()
      
      ui <- tags$div(
        selectizeInput(
          "selectDbSelfSource",
          label = d("source_select_layer",language),
          choices = sourcesList
          ),
        uiOutput("uiValidateDbSelfSource")
        )

      btns <- list(
        btnGenerate <- actionButton(
          inputId = "btnDbSelfGenerate",
          label = d("btn_selfdb_generate_info",language)
          )
        )

      mxModal(
        id = "dbInfo",
        title = d("title_tools_dbself_select",language),
        content = ui,
        buttons = btns,
        textCloseButton = d("btn_cancel",language) 
        )
  })
  }

})

observe({
  layer <- input$selectDbSelfSource 
  language <- reactData$language
  errors <- logical(0)
  warning <- logical(0)
  isolate({

    hasNoLayer <- noDataCheck(layer)
    errors['error_no_layer'] <- hasNoLayer
    errors <- errors[errors]
    hasError <- length(errors) > 0


    output$uiValidateDbSelfSource <- renderUI(
      mxErrorsToUi(
        errors = errors,
        warning = warning,
        language = language
        )
      )

    mxToggleButton(
      id="btnDbSelfGenerate",
      disable = hasError 
      )
  })
})



observeEvent(input$btnDbSelfGenerate,{
  mxCatch("dbSelfGenerate",{

    idUser <- .get(reactUser,c("data","id"))
    project <- reactData$project
    language <- reactData$language
    sourcesList <- as.list(input$selectDbSelfSource)
    viewsList <- sapply(reactViewsCompact(),`[[`,"id")
    dataTempUser <- mxDbCreateTempUser(idUser,sourcesList)
    dbSelfCon_done <<- FALSE
    #
    # On session end or on modal close, drop privileges
    #
    dbSelfClose <- function(){

      if(!dbSelfCon_done){
        #
        # Update all views for each source
        #
        for( id in sourcesList ){
          mxDbUpdateAllViewDataFromSource(
            idSource = id,
            onProgress = function( progress, view ){

              if(!isTRUE(session$isClosed())){
                mxUpdateText(
                  id = "txtDbSelfInfo",
                  text = "Update views for  source "+ id +" (" + (progress*100) + "%)"
                  )
                if( !noDataCheck(view) && isTRUE(view$id %in% viewsList) ){

                  view$`_edit` = TRUE 

                  mglAddView(
                    viewData = view
                    )
                }
              }
            })
        }
        #
        # Drop user
        #
        dataTempUser$dropUser()

        #
        # Set updated to true : avoid second evaluation
        #
        dbSelfCon_done <- TRUE
        
        #
        # Close the modal
        #
        if(!session$isClosed()){
          mxModal(
            id = "dbInfo",
            close = TRUE
            )
        }
      }
    }
    reactData$dbSelfClose <- dbSelfClose

    #onSessionEnded(function(){
    #if(!dbSelfClose) {
    #dbSelfClose()
    #}   
    #})

    #
    # Info list
    #
    dbInfo <- listToHtmlSimple(list(
        db_name =  .get(config,c("pg","dbname")),
        db_host = .get(config,c("pg","host")),
        db_port = .get(config,c("pg","port")),
        db_username =  .get(dataTempUser,c("user")),
        db_password =  .get(dataTempUser,c("password"))
        ))


    ui <- tags$p(
      id = "txtDbSelfInfo",
      dbInfo
      )

    btns <- list(
      actionButton(
        inputId = "btnDbSelfClose",
        label = d("btn_close")
        )
      )

    mxModal(
      id = "dbInfo",
      title = d("title_tools_dbself_info",language),
      content = ui,
      removeCloseButton = TRUE,
      buttons = btns
      )
  })
})


observeEvent(input$btnDbSelfClose,{
  mxCatch("dbSelfClose",{
    reactData$dbSelfClose()
  })
})


