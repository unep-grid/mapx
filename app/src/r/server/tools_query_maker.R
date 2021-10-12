
observeEvent(input$btnShowQueryMaker,{

  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isMember <- isTRUE("members" %in% userRole$groups)
  userData <- reactUser$data
  btnList <- list(
    actionButton(
      inputId = "btnMakeQuery",
      label = d("create",language)
      )
    )

  #
  # Hack to clean up old link. No idea why it stays.
  #
  output$uiQueryEncrypted <- renderUI(tagList())

  if( isMember ){

    sourcesList <- reactListReadSources()
    mxModal(
      id="test",
      buttons = btnList,
      content=tagList(
        textInput("txtQuery",d("label_query_write",language)),      
        uiOutput("uiQueryEncrypted"),
        uiOutput("uiValidationQuery"),
        mxFold(
          labelUi=d("label_layer_available",language),
          content = listToHtmlSimple(
            listInput = sourcesList,
            useFold = TRUE,
            unboxText = FALSE
            )
          )
        )
      )
  }
})



observeEvent(input$btnMakeQuery,{

  err <- logical(0)
  out <- tags$b("")
  sql <- input$txtQuery
  language <- reactData$language

  userRole <- getUserRole()
  isMember <- isTRUE("members" %in% userRole$groups)
  apiPort <- config$api$port_public
  apiHost <- config$api$host_public
  if( apiPort != 80 && apiPort != 443){
    apiHost = apiHost + ":" + apiPort 
  }

  queryUrl = "http://" + apiHost + "/get/query?data="

  if( isMember ){
    tablesQuery <- c(mxDbGetDistinctTableFromSql(sql))
    tablesAllowed <- c("mx_countries",reactListReadSources())
    
    err[['query_not_valid']] <- isTRUE(noDataCheck(sql) || noDataCheck(tablesQuery))
    err[["query_not_allowed"]] <- !isTRUE(all(tablesQuery %in% tablesAllowed))

    if(!isTRUE(any(err))){
      out <- mxDbEncrypt(list(
          type = "query",
          validUntil = NULL,
          data = list(
            sql = sql
            )
          ))
      query <- queryUrl + out 
      out = tags$a(href=query,class="mx-text-ellipsis",query,target="_blank")
    }
  }

  output$uiValidationQuery <- renderUI(mxErrorsToUi(errors=err,language=language))
  output$uiQueryEncrypted <- renderUI(out)

})
