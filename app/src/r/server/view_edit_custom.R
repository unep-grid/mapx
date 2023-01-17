
observeEvent(input$customCodeEdit_init, {
  mxToggleButton(
    id = "btnViewSaveCustomCode",
    disable = TRUE
  )
  view <- reactData$viewDataEdited
  language <- reactData$language
  customCode <- .get(view, c("data", "methods"))

  t <- function(i = NULL) {
    d(id = i, lang = language, dict = config$dict, web = F, asChar = T)
  }

  cc <- list(
    title = t("view_dashboard_script"),
    options = list(
      language = "javascript",
      editor = "ace"
    ),
    type = "string",
    format = "textarea",
    default = .get(config, c("templates", "text", "custom_view"))
  )

  viewTimeStamp <- as.numeric(
    as.POSIXct(view$date_modified, format = "%Y-%m-%d%tT%T", tz = "UTC")
  )

  jedSchema(
    id = "customCodeEdit",
    schema = cc,
    startVal = customCode,
    options = list(
      draftAutoSaveId = view$id,
      draftAutoSaveDbTimestamp = viewTimeStamp
    )
  )

  mxToggleButton(
    id = "btnViewSaveCustomCode",
    disable = FALSE
  )
})

#
# Vew custom code preview
#
observeEvent(input$btnViewPreviewCustomCode, {
  mxToggleButton(
    id = "btnViewSaveCustomCode",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewCustomCode",
    disable = TRUE
  )
  jedTriggerGetValues("customCodeEdit", "preview")
})
#
# View custom code save
#
observeEvent(input$btnViewSaveCustomCode, {
  mxToggleButton(
    id = "btnViewSaveCustomCode",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewCustomCode",
    disable = TRUE
  )
  jedTriggerGetValues("customCodeEdit", "save")
})


observeEvent(input$customCodeEdit_values, {
  values <- input$customCodeEdit_values
  if (noDataCheck(values)) {
    return()
  }

  customCode <- values$data
  idEvent <- values$idEvent
  editor <- reactUser$data$id
  project <- reactData$project
  view <- reactData$viewDataEdited
  isDev <- mxIsUserDev(editor)
  isEditable <- isDev &&
    view[["_edit"]] &&
    view[["type"]] == "cc"

  if (isEditable) {
    time <- Sys.time()
    view <- .set(view, c("data", "methods"), customCode)

    switch(idEvent,
      "preview" = {
        mglUpdateView(view)
      },
      "save" = {
        view[["_edit"]] <- NULL
        view <- .set(view, c("date_modified"), time)
        view <- .set(view, c("target"), as.list(.get(view, c("target"))))
        view <- .set(view, c("editors"), as.list(.get(view, c("editors"))))
        view <- .set(view, c("readers"), as.list(.get(view, c("readers"))))
        view <- .set(view, c("data", "methods"), customCode)
        view <- .set(view, c("data"), as.list(.get(view, "data")))
        view <- .set(view, c("editor"), editor)

        mxDbAddRow(
          data = view,
          table = .get(config, c("pg", "tables", "views"))
        )
        # edit flag
        view$`_edit` <- TRUE

        mglUpdateView(view)

        reactData$updateViewListFetchOnly <- runif(1)

        mxFlashIcon("floppy-o")
      }
    )
  }

  mxToggleButton(
    id = "btnViewSaveCustomCode",
    disable = FALSE
  )
  mxToggleButton(
    id = "btnViewPreviewCustomCode",
    disable = FALSE
  )
})
