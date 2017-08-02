

buttonAddView <- tagList(
  tags$h4(`data-lang_key`="title_tools_views"),
  actionButton(
    label = "",
    inputId = "btnAddView",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_add_view"
    ))


buttonSourceEdit <- tagList(
  tags$h4(`data-lang_key`="title_tools_sources"),
  actionButton(
    label = "",
    inputId = "btnEditSources",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_edit_source"
    ),
  actionButton(
    label = "",
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

  access <- reactUser$role$access

  qgisInfo <- tags$div()


  if( "qgis" %in% access ){

    qgisInfo <- listToHtmlSimple(list(
      db_name =  .get(config,c("pg","dbname")),
      db_host = session$clientData$url_hostname,
      db_port = .get(config,c("pg","port")),
      db_username =  .get(config,c("pg","user")),
      db_password =  .get(config,c("pg","password"))
      ))


    qgisInfo <- tagList(
        tags$h4(`data-lang_key`="title_tools_qgis"),
        qgisInfo
      )

  }


  output$uiListQgisInfo <- renderUI(qgisInfo)

})






