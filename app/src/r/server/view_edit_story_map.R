# View vt story: render schema
#
observeEvent(input$storyEdit_init, {
  view <- reactData$viewDataEdited

  if (!isTRUE(.get(view, c("_edit")))) {
    return()
  }


  language <- reactData$language
  story <- .get(view, c("data", "story"))
  hasStory <- isNotEmpty(story)

  schema <- mxSchemaViewStory(
    view = view,
    language = language
  )


  if (hasStory) {
    # NOTE: Schema update.
    # views used to be stored in full inside the story
    # to avoid missing view. This was abandoned and the view id
    # was kept instead. All story have been updated.
    # Now, the view id is stored in the array, outside an object.
    # To update progressively, we convert the view level here:
    # Convert view's level
    # [{view:<idview>}] -> [<idview>]
    #

    story$steps <- lapply(story$steps, function(step) {
      if (is.list(step$views)) {
        step$views <- lapply(step$views, function(view) {
          if (is.list(view) && isNotEmpty(view$view)) {
            return(view$view)
          } else {
            return(view)
          }
        })
      }
      return(step)
    })
  }






  viewTimeStamp <- as.numeric(
    as.POSIXct(view$date_modified, format = "%Y-%m-%d%tT%T", tz = "UTC")
  )

  jedSchema(
    id = "storyEdit",
    schema = schema,
    startVal = story,
    options = list(
      disableSelectize = FALSE,
      draftAutoSaveId = view$id,
      draftAutoSaveDbTimestamp = viewTimeStamp
    )
  )

})

#
# Vew story preview
#
observeEvent(input$btnViewPreviewStory, {
  mxDebugMsg("Preview story map")
  mxToggleButton(
    id = "btnViewSaveStory",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewStory",
    disable = TRUE
  )
  jedTriggerGetValues("storyEdit", "preview")
})

observeEvent(input$btnViewCloseStory, {
  mxDebugMsg("Close story map")

  view <- reactData$viewDataEdited

  if (isTRUE(reactData$storyPreviewed)) {
    reactData$storyPreviewed <- FALSE
    mglReadStory(
      close = TRUE
    )
  }
  if (isTRUE(reactData$storySaved)) {
    reactData$storySaved <- FALSE
    mglUpdateView(view)
  }

  mxModal(
    id = "modalViewEdit",
    close = TRUE
  )
})

#
# View story save
#
observeEvent(input$btnViewSaveStory, {
  mxDebugMsg("Save story map")
  mxToggleButton(
    id = "btnViewSaveStory",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewStory",
    disable = TRUE
  )
  jedTriggerGetValues("storyEdit", "save")
})


observeEvent(input$storyEdit_values, {
  values <- input$storyEdit_values
  if (isEmpty(values)) {
    return()
  }

  time <- Sys.time()
  story <- values$data
  idEvent <- values$idEvent
  editor <- reactUser$data$id
  language <- reactData$language
  project <- reactData$project
  view <- reactData$viewDataEdited
  isEditable <- view[["_edit"]] && view[["type"]] == "sm"
  userData <- reactUser$data
  userRole <- getUserRole()

  if (!isEditable) {
    return()
  }

  #
  # Update story
  #
  view <- .set(view, c("data", "story"), story)

  switch(idEvent,
    "preview" = {
      mglReadStory(
        view = view,
        edit = TRUE,
        update = TRUE
      )
      reactData$storyPreviewed <- TRUE
    },
    "save" = {
      #
      # Prepare view for database storage using centralized function
      #
      view <- mxPrepareViewForDb(view, editor, time, list("data.story" = story))
      
      mxDbAddRow(
        data = view,
        table = .get(config, c("pg", "tables", "views"))
      )

      # edit flag
      view$`_edit` <- TRUE
      reactData$storySaved <- TRUE
      reactData$viewDataEdited <- view

      mxUpdateText(
        id = "modalViewEdit_txt",
        text = sprintf("Saved at %s", format(time, "%H:%M"))
      )

      mxFlashIcon("floppy-o")
      reactData$updateViewListFetchOnly <- runif(1)
    }
  )

  mxToggleButton(
    id = "btnViewSaveStory",
    disable = FALSE
  )
  mxToggleButton(
    id = "btnViewPreviewStory",
    disable = FALSE
  )
})
