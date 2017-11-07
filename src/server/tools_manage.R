


#
# Set view and source ui 
#
observe({

  userRole <- getUserRole()
  role <- userRole$name

  isolate({
    language <- reactData$language

    if(  "public" %in% role ){
      uiSourceEdit = div()
      uiViewAdd =  div()

    }else{

      uiViewAdd <- tagList(
        tags$h4(`data-lang_key`="title_tools_views",d("title_tools_views",language)),
        actionButton(
          label = "Add view",
          inputId = "btnAddView",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_view"
          ))


      uiSourceEdit <- tagList(
        tags$h4(`data-lang_key`="title_tools_sources",d("title_tools_sources",language)),
        actionButton(
          label = "Edit source",
          inputId = "btnEditSources",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_edit_source"
          ),
        actionButton(
          label = "Upload source",
          inputId = "btnUploadSources",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_source"
          )
        )
    }

    output$uiBtnViewAdd <- renderUI(uiViewAdd)
    output$uiBtnSourceEdit <- renderUI(uiSourceEdit)

    })
})

#
# Set view and source ui 
#
observe({

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  isolate({
    language <- reactData$language
    dbInfo <- tags$div()


    if( "db" %in% access  ){

      dbInfo <- tagList(
        tags$h4(d("title_tools_db",language)),
        actionButton(
          label = "Show db info",
          inputId = "btnShowDbInfo",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_db_info"
          )
        )

    }

    output$uiBtnShowDbInfo <- renderUI(dbInfo)

  })
})


observeEvent(input$btnShowDbInfo,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  if( "db" %in% access ){

    dbInfo <- listToHtmlSimple(list(
        db_name =  .get(config,c("pg","dbname")),
        db_host = session$clientData$url_hostname,
        db_port = .get(config,c("pg","port")),
        db_username =  .get(config,c("pg","user")),
        db_password =  .get(config,c("pg","password"))
        ))

    mxModal(
      id = "dbInfo",
      title = "Postgres info",
      content = dbInfo
      )
  }

})





