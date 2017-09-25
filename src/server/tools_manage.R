

buttonAddView <- tagList(
  tags$h4(`data-lang_key`="title_tools_views"),
  actionButton(
    label = "Add view",
    inputId = "btnAddView",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_add_view"
    ))


buttonSourceEdit <- tagList(
  tags$h4(`data-lang_key`="title_tools_sources"),
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

#
# Set view and source ui 
#
observeEvent(reactUser$role,{

  role <- reactUser$role$name

  if( role == "public" ){
    uiSourceEdit = div()
    uiViewAdd =  div()

  }else{

    uiSourceEdit <- buttonSourceEdit
    uiViewAdd <- buttonAddView

  }

  output$uiBtnViewAdd <- renderUI(uiViewAdd)
  output$uiBtnSourceEdit <- renderUI(uiSourceEdit)

})

#
# Set view and source ui 
#
observeEvent(reactUser$role,{

  access <- .get(reactUser,c("role","access"))
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

  }else{
    dbInfo = div()
  }

  output$uiBtnShowDbInfo <- renderUI(dbInfo)

})


observeEvent(input$btnShowDbInfo,{

  access <- .get(reactUser,c("role","access"))

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





