

# View vt story: render schema
#
observeEvent(input$storyEdit_init,{

  view <- reactData$viewDataEdited

  if(!isTRUE(.get(view,c("_edit")))) return()

  language <- reactData$language  
  story <- .get(view,c("data","story"))
  hasStory <- !noDataCheck(story)
  views <- reactViewsListIdAll()
  idViewsStory <- unique(unlist(lapply(story$steps,`[[`,'views')))
  viewsStory <- mxDbGetViewsTitle(idViewsStory, prefix = '[ story ]' )

  schema <- mxSchemaViewStory(
    view=view,
    views=c(viewsStory,views),
    language=language
    )

  viewTimeStamp <- as.numeric(
    as.POSIXct(view$date_modified,format="%Y-%m-%d%tT%T",tz="UTC")
    )

  jedSchema(
    id="storyEdit",
    schema = schema,
    startVal = story,
    options = list(
      disableSelectize = FALSE,
      draftAutoSaveId = view$id,
      draftAutoSaveDbTimestamp= viewTimeStamp
      )
    )
})

#
# Vew story preview 
#
observeEvent(input$btnViewPreviewStory,{
  mxDebugMsg("Preview story map");
  mxToggleButton(
    id="btnViewSaveStory",
    disable = TRUE
    )
  mxToggleButton(
    id="btnViewPreviewStory",
    disable = TRUE
    )
  jedTriggerGetValues("storyEdit","preview")
})

observeEvent(input$btnViewCloseStory,{
  mxDebugMsg("Close story map");

  view <- reactData$viewDataEdited

  if(isTRUE(reactData$storyPreviewed)){ 
    mglReadStory(
      view = view,
      edit = FALSE,
      update = FALSE,
      close = TRUE
      )
    reactData$storyPreviewed <- FALSE
  }
  if(isTRUE(reactData$storySaved)){
    mglUpdateView(view)
    reactData$storySaved <- FALSE
  }

  mxModal(
    id = "modalViewEdit",
    close = TRUE
    )

})

#
# View story save
#
observeEvent(input$btnViewSaveStory,{
  mxDebugMsg("Save story map");
  mxToggleButton(
    id="btnViewSaveStory",
    disable = TRUE
    )
  mxToggleButton(
    id="btnViewPreviewStory",
    disable = TRUE
    )
  jedTriggerGetValues("storyEdit","save")
})


observeEvent(input$storyEdit_values,{

  values <- input$storyEdit_values;
  if(noDataCheck(values)) return();

  story <- values$data;
  idEvent <- values$idEvent;
  editor <- reactUser$data$id
  language <- reactData$language
  project <- reactData$project
  view <- reactData$viewDataEdited
  allViews <- reactViewsListIdAll()
  isEditable <- view[["_edit"]] && view[["type"]] == "sm"
  userData <- reactUser$data
  userRole <- getUserRole()

  if(isEditable){
    time <- Sys.time()

    view <- .set(view,c("data","story"), story)

    #
    # Add missing views refs
    #
    view <- mxUpdateStoryViews(
      story = story,
      view = view,
      allViews = allViews
      )

    switch(idEvent,
      "preview"= {
        mglReadStory(
          view = view,
          edit = TRUE,
          update = TRUE
          )
        reactData$storyPreviewed <- TRUE;
      },
      "save" = {
        view[["_edit"]] = NULL


        #
        # set default
        #
        view <- .set(view, c("date_modified"), time )
        view <- .set(view, c("target"), as.list(.get(view,c("target"))))
        view <- .set(view, c("readers"), as.list(.get(view,c("readers"))))
        view <- .set(view, c("editors"), as.list(.get(view,c("editors"))))
        view <- .set(view, c("data"), as.list(.get(view,"data")))
        view <- .set(view, c("editor"), editor)



        mxDbAddRow(
          data=view,
          table=.get(config,c("pg","tables","views"))
          )

        # edit flag
        view$`_edit` = TRUE 
        reactData$storySaved <- TRUE
        reactData$viewDataEdited <- view

        mxUpdateText(
          id = "modalViewEdit_txt",
          text = sprintf("Saved at %s",format(time,'%H:%M'))
          )

        mxFlashIcon("floppy-o")
        reactData$updateViewListFetchOnly <- runif(1)

      })

    mxToggleButton(
      id="btnViewSaveStory",
      disable = FALSE
      )
    mxToggleButton(
      id="btnViewPreviewStory",
      disable = FALSE
      )

  }

})
