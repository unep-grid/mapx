

buttonAddView <- tagList(
  tags$h4(`data-lang_key`="title_tools_views"),
  actionButton(
    inputId = "btnAddView",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_add_view",
    icon("plus")
    ))


buttonSourceEdit <- tagList(
  tags$h4(`data-lang_key`="title_tools_sources"),
  actionButton(
    inputId = "btnEditSources",
    class = "btn btn-sm btn-default hint",
    `data-lang_key` = "btn_edit_sources",
    icon("plus")
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
      name = "map-x-db",
      host = session$clientData$url_hostname,
      port = .get(config,c("pg","port")),
      database =  .get(config,c("pg","dbname")),
      username =  .get(config,c("pg","user")),
      password =  .get(config,c("pg","password"))
      ))

    qgisInfo <- tagList(
        tags$h4(`data-lang_key`="title_tools_qgis"),
        qgisInfo
      )

  }


  output$uiListQgisInfo <- renderUI(qgisInfo)

})






