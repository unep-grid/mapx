
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
      tags$h3(d("optional_view_title",lang=language,dict=dict)),
      tags$p(d("optional_view_text",lang=language,dict=dict)),
      selectizeInput("selectOptionalViewAttribute",
        label = d("select_optional_view_attribute",lang=language,dict=dict),
        choices = tolower(attributes),
        options=list(
          dropdownParent="body"
          )
        ),
      actionButton(
        inputId = "btnOptionalLayerSummary",
        label = d("btn_get_layer_summary",language)
        )
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

#
# Main layer summary
#
observeEvent(input$btnOptionalLayerSummary,{
  mxModal(
    id =  "layerSummary",
    title = d("Layer Summary",reactData$language),
    content = tagList(
      tags$input(
        type="number",
        id="triggerBtnGetOptionalLayerSummary",
        class="form-control mx-hide",
        value=runif(1)
        ),
      tags$label("Summary"),
      uiOutput("uiOptionalLayerSummary")
      )
    )
})

output$uiOptionalLayerSummary <- renderUI({
  input$triggerBtnGetOptionalLayerSummary
  reactOptionalLayerSummary()$html
})


#
# reactLayerSummary
#

reactOptionalLayerSummary <- reactive({
 
  layerName <- reactData$triggerNewViewForSourceId 
  variableName <- input$selectOptionalViewAttribute
  language <- reactData$language 

  hasVariable <- !noDataCheck(variableName)
  hasLayer <- !noDataCheck(layerName)

  out <- list()
  out$html <- tags$div()
  out$list <- list()

  if(hasVariable && hasLayer){
      #
      # Get layer summary
      #
      out <- mxDbGetLayerSummary(
        layer = layerName,
        variable = variableName,
        geomType = NULL,
        language = language
        )
  }

  return(out)
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
        content=tags$p(d("msg_success_import",dict=dict,lang=language)),
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
      msgSave <- d("msg_process_wait", lang=language, dict=dict)

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
      # Generate the fina lmodal panel
      #
      mxModal(
        id="modalSourceCreate",
        content=tags$p(d("msg_success_import",dict=dict,lang=language)),
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


