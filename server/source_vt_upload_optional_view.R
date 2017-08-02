
#
# Optional new view panel
#
observeEvent(reactData$triggerNewViewForSourceId,{

  mxCatch(
    title="Optional view source trigger",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
     },
    {
    view  <- input$uploadGeojson

    idSource <- reactData$triggerNewViewForSourceId
    attributes <- mxDbGetLayerColumnsNames(idSource,notIn=c("geom","gid"))
    language <- reactData$language
    dict <- .get(config,c("dictionaries","schemaMetadata")) 


    ui <- tagList(
      tags$h3(d("optionalViewTitle",lang=language,dict=dict)),
      tags$p(d("optionalViewText",lang=language,dict=dict)),
      selectInput("selectOptionalViewAttribute",
        label = d("selectOptionalViewAttribute",lang=language,dict=dict),
        choices = tolower(attributes)
        ),
      uiOutput("summaryOptionalViewAttribute")
      )

    btnList <- list(
      actionButton("btnOptionalViewCreate",label=d("btn_create",lang=language)),
      actionButton("btnOptionalViewCancel",label=d("btn_finish",lang=language)) 
      )


    mxModal(
      id="modalSourceCreate",
      content=ui,
      buttons=btnList,
      addBackground=TRUE,
      removeCloseButton=TRUE
      )
    })
})


observeEvent(input$selectOptionalViewAttribute,{
  mxCatch(
    title="Select optional view attribute",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
    },
    {

      sourceId <- reactData$triggerNewViewForSourceId 
      attribute <- input$selectOptionalViewAttribute
      language <- reactData$language 
      dict <- .get(config,c("dictionaries","schemaMetadata")) 

      summary <-  mxDbGetLayerSummary(
        layer=sourceId,
        variable=attribute,
        geomType=NULL,
        language=language
        )

      output$summaryOptionalViewAttribute <- renderUI(summary$html)
    })
})



#
#
#
observeEvent(input$btnOptionalViewCancel,{

  mxCatch(title="Ignore optional view",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
    },
    {

      language <- reactData$language
      dict <- .get(config,c("dictionaries","schemaMetadata")) 

      #
      # Generate the modal panel
      #
      mxModal(
        id="modalSourceCreate",
        content=tags$p(d("msgSuccessImport",dict=dict,lang=language)),
        addBackground=TRUE,
        textCloseButton=d("btn_close",language)
        )
    })
})

#
# Optional view create
#
observeEvent(input$btnOptionalViewCreate,{

  mxCatch(
    title="Optional new view create",
    onError = function(){
      mxProgress(id="dataUploaded", percent=100, enable=F)
      mxModal(id="modalSourceCreate",close=T)
      mxDbGetQuery(sprintf("delete from mx_views where id='%s'",idView)) ;
      mxDbGetQuery(sprintf("delete from mx_sources where id='%s'",idSource)) ;
      mxDbGetQuery(sprintf("drop table if exists %s",idSource)) ;
    },
    {

      idSource <- reactData$triggerNewViewForSourceId
      selectedAttribute <- input$selectOptionalViewAttribute
      dict <- .get(config,c("dictionaries","schemaMetadata")) 
      view  <- input$uploadGeojson
      language <- reactData$language
      country <- reactData$country
      user <- reactUser$data$id
      meta <- mxDbGetLayerMeta(idSource)
      msgSave <- d("msgProcessWait", lang=language, dict=dict)

      # 
      # New view id
      #
      idView <- randomString(
        prefix="MX-",
        splitIn=3,
        addLETTERS=T,
        addLetters=F,
        splitSep="-",
        sep = "-"
        )

      mxProgress(id="importSource", text=paste(msgSave,": create a new empty view "), percent=90)

      #
      # New view squeleton
      #
      newView <- list(
        id = idView,
        country = country,
        editor = user,
        target = list("self"),
        date_modified = Sys.time(),
        data = list(
          title = .get(meta,c("text","title")),
          abstract = .get(meta,c("text","abstract")
            )
          ),
        type = "vt"
        )

      #
      # Get layer summary and feed the view data
      #
      sourceSummary <- mxDbGetLayerSummary(
        layer = idSource,
        variable = selectedAttribute
        )

      newView <- mxUpdateDefViewVt(
        view = newView, 
        sourceData = sourceSummary$list
        )

      #
      # Add the view to the db
      #
      mxDbAddRow(
        data=newView,
        table=.get(config,c("pg","tables","views"))
        )

      #
      # Allow edit at least now
      #
      newView$`_edit` = TRUE 

      #
      # Add a single view
      #
      mglSetSourcesFromViews(
        id = .get(config,c("map","id")),
        viewsList = newView,
        render = FALSE,
        country = country
        )

      #
      # Remove original geojson
      #
      mglRemoveView(
        idView = .get(view,"id") 
        )

      #
      # Generate the fina lmodal panel
      #
      mxModal(
        id="modalSourceCreate",
        content=tags$p(d("msgSuccessImport",dict=dict,lang=language)),
        addBackground=TRUE,
        textCloseButton=d("btn_close",language)
        )
      mxProgress(id="importSource", enable=FALSE)

      #
      # Trigger fetch view
      #
      reactData$updateViewListFetchOnly <- runif(1)
    })
})


