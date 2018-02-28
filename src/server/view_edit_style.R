#
# View vt style : render schema
#
observeEvent(input$styleEdit_init,{

  view <- reactData$viewDataEdited

  if(!isTRUE(.get(view,c("_edit")))) return()

  style <- .get(view,c("data","style"))
  language <- reactData$language 
  hasLayer <- !noDataCheck(.get(view,c("data","source","layerInfo","name")))
  hasSources <- !noDataCheck(reactSourceLayer())
  hasStyle <- !noDataCheck(style)

  if(!hasStyle) style = NULL
  if(!hasLayer || ! hasSources){

  errors <- logical(0)
  warnings <- logical(0)

    if(!hasLayer) warnings["error_no_layer"] <- TRUE
    if(!hasSources) errors["error_no_source"] <- TRUE
    
    output$txtValidSchema <- renderUI({
      mxErrorsToUi(
      errors=errors,
      warning=warnings,
      language=language
      )

    })

    if(length(errors)>0 || length(warnings) >0){
      mxToggleButton(
        id="btnViewSaveStyle",
        disable=TRUE
        )
      mxToggleButton(
        id="btnViewResetStyle",
        disable=TRUE
        )
    }

  }else{

    schema <- mxSchemaViewStyle(
      view=view,
      language=language
      )

    jedSchema(
      id="styleEdit",
      schema = schema,
      startVal = style
      )
  }
})

#
# View style change
#
observeEvent(input$btnViewPreviewStyle,{

  style <- input$styleEdit_values$msg

  if(noDataCheck(style)) return();

  view <- reactData$viewDataEdited

  view <- .set(view,c("data","style","rules"), style$rules)
  view <- .set(view,c("data","style","nulls"), style$nulls)
  view <- .set(view, c("data","style","custom"), style$custom)
  view <- .set(view, c("data","style","titleLegend"), style$titleLegend)
  view <- .set(view, c("data","style","reverseLayer"), style$reverseLayer)

  mglAddView(
    viewData = view
    )

})

#
# View style save
#
observeEvent(input$btnViewSaveStyle,{

  mxToggleButton(
    id="btnViewSaveStyle",
    disable = TRUE
    )

  view <- reactData$viewDataEdited
  country <- reactData$country
  time <- Sys.time()
  editor <- reactUser$data$id

  if( view[["_edit"]] && view[["type"]] == "vt" ){
    view[["_edit"]] = NULL

    style <- input$styleEdit_values$msg

    if(!noDataCheck(style)){

      view <- .set(view, c("date_modified"), time )
      view <- .set(view, c("target"), as.list(.get(view,c("target"))))
      view <- .set(view, c("data", "style", "custom"), .get(style,c("custom")))
      view <- .set(view, c("data", "style", "rules"), .get(style,c("rules")))
      view <- .set(view, c("data","style","nulls"), .get(style,c("nulls")))
      view <- .set(view, c("data", "style", "titleLegend"), .get(style,c("titleLegend")))
      view <- .set(view, c("data", "style", "reverseLayer"), .get(style,c("reverseLayer")))
      view <- .set(view, c("data"), as.list(.get(view,"data")))
      view <- .set(view, c("editor"), editor)

      mxDbAddRow(
        data=view,
        table=.get(config,c("pg","tables","views"))
        )

      #
      # Trigger update
      #
      mglRemoveView(
        idView=view$id
        )

      # edit flag
      view$`_edit` = TRUE 

      # add this as new (empty) source
      mglSetSourcesFromViews(
        id = .get(config,c("map","id")),
        viewsList = view,
        render = FALSE,
        country = country
        )
      reactData$updateViewListFetchOnly <- runif(1)
    }
  }

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = sprintf("Saved at %s",time)
    )

  mxToggleButton(
    id="btnViewSaveStyle",
    disable = FALSE
    )
})


