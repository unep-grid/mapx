



observeEvent(input$btnIframeBuilder,{

   reactData$iframeString = "";

   colorScheme <- input$uiColorScheme;
   countriesCodes <- .get(config,c("countries","codes","id"))
   countriesCodes <- d(countriesCodes)
   collectionsTags <- mxDbGetDistinctCollectionsTags("mx_views")
  
   ui = tagList(
     checkboxInput("checkShareStyle",label="Set style (default = current) "),
     conditionalPanel(
       condition="input.checkShareStyle",
       textAreaInput(
         inputId="txtShareStyle",
         label=NULL,
         value=colorScheme,
       height="300px")
       ),
     checkboxInput("checkShareCountry",label="Set country (default = current) "),
     conditionalPanel(condition="input.checkShareCountry",
       selectInput("selectShareCountry",
         label = NULL,
         choices= countriesCodes,
         selected = reactData$country
         )
       ),
     checkboxInput("checkShareCollections",label="Set collections"),
     conditionalPanel(
       condition="input.checkShareCollections",
       selectInput(
         "selectShareCollections",
         label = NULL,
         choices = collectionsTags,
         multiple = TRUE,
         selected = query$collections
         )
       ),
     textAreaInput(
       "txtShareIframe",
       label="HTML to to paste in your website",
       value="",
       height="300px"
       )
     )

   mxModal(
     id = "modalShare",
     title ="Share mapx",
     content = ui
     )

})



observe({

  urlHost <- session$clientData[["url_hostname"]]  
  urlPort <- session$clientData[["url_port"]] 
  urlProtocol <- session$clientData[["url_protocol"]]
  urlPort <- ifelse(!noDataCheck(urlPort),sprintf(":%s",urlPort),"") 

  country <- ""
  style <- ""
  collections <- ""

  tryCatch({
    addStyle = !noDataCheck(input$checkShareStyle) && isTRUE(input$checkShareStyle)
    addCountry = !noDataCheck(input$checkShareCountry) && isTRUE(input$checkShareCountry)
    addCollections = !noDataCheck(input$checkShareCollections) && isTRUE(input$checkShareCollections)

    if(addStyle) style <- sprintf("%1$s",mxEncode(jsonlite::toJSON(jsonlite::fromJSON(input$txtShareStyle),auto_unbox=T)))
    if(addCountry) country <-  sprintf("%1$s",input$selectShareCountry)
    if(addCollections) collections <-  sprintf("%1$s",paste(input$selectShareCollections,collapse=","))
  },error=function(e){})


  url <- sprintf("%1$s//%2$s%3$s/?country=%4$s&collections=%5$s&style=%6$s",
    urlProtocol,
    urlHost,
    urlPort,
    country,
    collections,
    style
    )

  iframe <- sprintf("<iframe width='800' height='500' src='%1$s' frameborder='0' allowfullscreen></iframe>",url)

  updateTextAreaInput(
    session=shiny::getDefaultReactiveDomain(),
    inputId="txtShareIframe",
    value=iframe
    )

})














