#
# View vt style : render schema
#
observeEvent(input$styleEdit_init,{

  view <- reactData$viewDataEdited


  if(!isTRUE(.get(view,c("_edit")))) return()

  style <- .get(view,c("data","style"))
  language <- reactData$language 
  hasLayer <- !noDataCheck(.get(view,c("data","source","layerInfo","name")))
  hasSources <- !noDataCheck(reactListReadSources())
  hasStyle <- !noDataCheck(style)

  mxCatch(title="style edit init",{

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
        view = view,
        language = language
      )

      viewTimeStamp <- as.numeric(
        as.POSIXct(view$date_modified,format="%Y-%m-%d%tT%T",tz="UTC")
      )

      jedSchema(
        id="styleEdit",
        schema = schema,
        startVal = style,
        options = list(
          disableSelectize = TRUE,
          draftAutoSaveId = view$id,
          draftAutoSaveDbTimestamp = viewTimeStamp
        )
      )
    }
})
})

#
# Vew style preview 
#
observeEvent(input$btnViewPreviewStyle,{
  mxToggleButton(
    id="btnViewSaveStyle",
    disable = TRUE
    )
  mxToggleButton(
    id="btnViewPreviewStyle",
    disable = TRUE
    )
  jedTriggerGetValues("styleEdit","preview")
})
#
# View style save
#
observeEvent(input$btnViewSaveStyle,{
  mxToggleButton(
    id="btnViewSaveStyle",
    disable = TRUE
    )
  mxToggleButton(
    id="btnViewPreviewStyle",
    disable = TRUE
    )
  jedTriggerGetValues("styleEdit","save")
})


observeEvent(input$styleEdit_values,{

  values <- input$styleEdit_values;
  if(noDataCheck(values)) return();

  style <- values$data;
  idEvent <- values$idEvent;
  editor <- reactUser$data$id
  project <- reactData$project
  view <- reactData$viewDataEdited
  isEditable <- view[["_edit"]] && view[["type"]] == "vt"

  if(isEditable){

    time <- Sys.time()

    view <- .set(view, c("data", "style", "custom"), .get(style,c("custom")))
    view <- .set(view, c("data", "style", "rules"), .get(style,c("rules")))
    view <- .set(view, c("data", "style", "zoomConfig"), .get(style,c("zoomConfig")))
    view <- .set(view, c("data", "style", "showSymbolLabel"), .get(style,c("showSymbolLabel")))
    view <- .set(view, c("data","style", "nulls"), .get(style,c("nulls")))
    view <- .set(view, c("data","style", "hideNulls"), .get(style,c("hideNulls")))
    view <- .set(view, c("data","style", "includeUpperBoundInInterval"), .get(style,c("includeUpperBoundInInterval")))
    view <- .set(view, c("data", "style", "titleLegend"), .get(style,c("titleLegend")))
    view <- .set(view, c("data", "style", "reverseLayer"), .get(style,c("reverseLayer")))

    switch(idEvent,
      "preview"= {
        mglUpdateView(view)
      },
      "save" = {
        view[["_edit"]] = NULL
        view <- .set(view, c("date_modified"), time )
        view <- .set(view, c("editor"), editor)
        view <- .set(view, c("target"), as.list(.get(view,c("target"))))
        view <- .set(view, c("readers"), as.list(.get(view,c("readers"))))
        view <- .set(view, c("editors"), as.list(.get(view,c("editors"))))
        view <- .set(view, c("data"), as.list(.get(view,"data")))

        mxDbAddRow(
          data=view,
          table=.get(config,c("pg","tables","views"))
          )

        # edit flag
        view$`_edit` = TRUE 

        mglUpdateView(view)

        mxUpdateText(
          id = "modalViewEdit_txt",
          text = sprintf("Saved at %s",format(time,'%H:%M'))
          )

        mxFlashIcon("floppy-o")
        reactData$updateViewListFetchOnly <- runif(1)


      })

  }
  mxToggleButton(
    id="btnViewSaveStyle",
    disable = FALSE
    )
  mxToggleButton(
    id="btnViewPreviewStyle",
    disable = FALSE
    )


})
 

