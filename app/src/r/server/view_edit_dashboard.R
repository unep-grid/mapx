
observeEvent(input$dashboardEdit_init, {
  mxCatch("dashboard build", {
    mxToggleButton(
      id = "btnViewSaveDashboard",
      disable = TRUE
    )

    view <- reactData$viewDataEdited
    language <- reactData$language
    dashboard <- .get(view, c("data", "dashboard"))
    widgets <- .get(dashboard, c("widgets"))
    # titles = .get(view,c("data","title"))
    viewType <- .get(view, c("type"))


    t <- function(i = NULL) {
      d(id = i, lang = language, dict = config$dict, web = F, asChar = T)
    }

    #
    # Backward compatibility for size
    #
    toDim <- function(dim) {
      oldClasses <- list(
        "x50" = 50,
        "x1" = 150,
        "x2" = 300,
        "x3" = 450,
        "x4" = 600,
        "y50" = 50,
        "y1" = 150,
        "y2" = 300,
        "y3" = 450,
        "y4" = 600
      )

      out <- oldClasses[[dim]]

      out <- ifelse(noDataCheck(out), dim, out)
      out <- ifelse(noDataCheck(out), "100", out)

      return(out)
    }


    if (length(widgets) > 0) {
      for (i in 1:length(widgets)) {
        widgets[[i]]$height <- toDim(widgets[[i]]$height)
        widgets[[i]]$width <- toDim(widgets[[i]]$width)
      }
      dashboard$widgets <- widgets
    }

    #
    # Data source according to type
    #
    if (viewType == "vt") {
      srcDataOption <- list("viewFreqTable", "layerChange", "layerClick", "layerOver", "none")
      srcDataLabels <- list(
        t("view_dashboard_src_view"),
        t("view_dashboard_src_layerChange"),
        t("view_dashboard_src_layerClick"),
        t("view_dashboard_src_mousemove"),
        t("view_dashboard_src_none")
      )
    }
    if (viewType == "rt") {
      srcDataOption <- list("layerClick", "none")
      srcDataLabels <- list(
        t("view_dashboard_src_layerClick"),
        t("view_dashboard_src_none")
      )
    }
    if (viewType == "cc") {
      srcDataOption <- list("none")
      srcDataLabels <- list(
        t("view_dashboard_src_none")
      )
    }
    #
    # Set widget size choices
    #

    widgetSizes <- seq(50, 600, 50)
    widgetSizesValues <- as.list(paste(widgetSizes))
    widgetSizesLabels <- as.list(paste(widgetSizes, "px"))

    sc <- list(
      title = t("view_dashboard"),
      type = "object",
      properties =
        list(
          #          title = mxSchemaMultiLingualInput(
          # keyTitle = "view_dashboard_title",
          # format = "text",
          # default = titles,
          # language = language
          # ),
          `modules` = list(
            title = t("view_dashboard_txt_module"),
            description = t("view_dashboard_txt_module_desc"),
            type = "array",
            uniqueItems = TRUE,
            items = list(
              type = "string",
              enum = list("highcharts", "d3", "d3-geo", "topojson", "selectize", "nouislider")
            )
          ),
          layout = list(
            title = t("view_dashboard_txt_layout"),
            description = t("view_dashboard_txt_layout_desc"),
            type = "string",
            enum = c("fit", "vertical", "horizontal", "full"),
            default = "fit",
            format = "radio",
            options = list(
              enum_titles = list(
                t("view_dashboard_txt_layout_fit"),
                t("view_dashboard_txt_layout_vertical"),
                t("view_dashboard_txt_layout_horizontal"),
                t("view_dashboard_txt_layout_full")
              )
            )
          ),
          panel_init_close = list(
            title = t("view_dashboard_panel_init_closed"),
            description = t("view_dashboard_panel_init_closed_desc"),
            type = "boolean",
            format = "checkbox"
          ),
          disabled = list(
            title = t("view_dashboard_disable"),
            description = t("view_dashboard_disable_desc"),
            type = "boolean",
            format = "checkbox"
          ),
          widgets = list(
            type = "array",
            format = "confirmDelete",
            title = t("view_dashboard_widgets"),
            uniqueItems = FALSE,
            items = list(
              type = "object",
              title = t("view_dashboard_widget"),
              options = list(
                collapsed = TRUE
              ),
              properties = list(
                disabled = list(
                  title = t("view_dashboard_widget_disable"),
                  description = t("view_dashboard_widget_disable_desc"),
                  type = "boolean",
                  format = "checkbox"
                ),
                `source` = list(
                  title = t("view_dashboard_txt_which_data"),
                  type = "string",
                  enum = srcDataOption,
                  options = list(
                    enum_titles = srcDataLabels
                  )
                ),
                `sourceIgnoreEmpty` = list(
                  title = t("view_dashboard_txt_ignore_empty_data"),
                  type = "boolean",
                  format = "checkbox",
                  default = TRUE
                ),
                `width` = list(
                  title = t("view_dashboard_txt_width"),
                  type = "string",
                  enum = widgetSizesValues,
                  default = widgetSizesValues[[4]],
                  options = list(
                    enum_titles = widgetSizesLabels
                  )
                ),
                `height` = list(
                  title = t("view_dashboard_txt_height"),
                  type = "string",
                  enum = widgetSizesValues,
                  default = widgetSizesValues[[2]],
                  options = list(
                    enum_titles = widgetSizesLabels
                  )
                ),
                `addColorBackground` = list(
                  title = t("view_dashboard_txt_add_background_color"),
                  type = "boolean",
                  format = "checkbox",
                  default = FALSE
                ),
                `colorBackground` = list(
                  title = t("view_dashboard_txt_color_background"),
                  type = "string",
                  format = "color",
                  default = "#000000"
                ),
                `attribution` = list(
                  title = t("view_dashboard_html_attribution"),
                  type = "string",
                  default = ""
                ),
                `script` = list(
                  title = t("view_dashboard_script"),
                  options = list(
                    language = "javascript",
                    editor = "ace"
                  ),
                  type = "string",
                  format = "textarea",
                  default = .get(config, c("templates", "text", "widget_function"))
                )
              )
            )
          )
        )
    )

    viewTimeStamp <- as.numeric(
      as.POSIXct(view$date_modified, format = "%Y-%m-%d%tT%T", tz = "UTC")
    )

    jedSchema(
      id = "dashboardEdit",
      schema = sc,
      startVal = dashboard,
      options = list(
        draftAutoSaveId = view$id,
        draftAutoSaveDbTimestamp = viewTimeStamp
      )
    )

    mxToggleButton(
      id = "btnViewSaveDashboard",
      disable = FALSE
    )
  })
})


#
# Dashboard remove
#
observeEvent(input$btnViewRemoveDashboard, {
  language <- reactData$language


  uiOut <- tagList(
    tags$p(
      tags$span(d("view_remove_dashboard_confirm", language))
    )
  )

  btnList <- list(
    actionButton(
      inputId = "btnViewRemoveDashboardConfirm",
      label = d("btn_confirm", language)
    )
  )

  mxModal(
    id = "modalViewEdit",
    title = d("view_remove_dashboard_confirm_title", language),
    content = uiOut,
    textCloseButton = d("btn_close", language),
    buttons = btnList
  )
})
#
# View dashboard remove
#
observeEvent(input$btnViewRemoveDashboardConfirm, {
  idView <- .get(reactData$viewDataEdited, c("id"))

  if (noDataCheck(idView)) mxDebugMsg("View to delete not found")

  jedTriggerGetValues("dashboardEdit", "remove")

  #
  # Close modal window
  #
  mxModal(
    id = "modalViewEdit",
    close = TRUE
  )
})

#
# Vew dashboard change
#
observeEvent(input$btnViewPreviewDashboard, {
  mxToggleButton(
    id = "btnViewSaveDashboard",
    disable = FALSE
  )
  mxToggleButton(
    id = "btnViewPreviewDashboard",
    disable = TRUE
  )
  jedTriggerGetValues("dashboardEdit", "preview")
})

#
# View style save
#
observeEvent(input$btnViewSaveDashboard, {
  mxToggleButton(
    id = "btnViewSaveDashboard",
    disable = TRUE
  )
  mxToggleButton(
    id = "btnViewPreviewDashboard",
    disable = TRUE
  )
  jedTriggerGetValues("dashboardEdit", "save")
})

observeEvent(input$dashboardEdit_values, {
  values <- input$dashboardEdit_values
  if (noDataCheck(values)) {
    return()
  }

  dashboard <- values$data
  idEvent <- values$idEvent
  editor <- reactUser$data$id
  language <- reactData$language
  project <- reactData$project
  view <- reactData$viewDataEdited
  view <- .set(view, c("data", "dashboard"), dashboard)
  time <- Sys.time()

  switch(idEvent,
    "preview" = {
      mglUpdateView(view)
    },
    "save" = {
      isDev <- mxIsUserDev(editor)
      isEditable <- isDev &&
        view[["_edit"]] &&
        view[["type"]] %in% c("vt", "rt", "cc")

      if (isEditable) {
        view[["_edit"]] <- NULL

        view <- .set(view, c("date_modified"), time)
        view <- .set(view, c("target"), as.list(.get(view, c("target"))))
        view <- .set(view, c("readers"), as.list(.get(view, c("readers"))))
        view <- .set(view, c("editors"), as.list(.get(view, c("editors"))))
        view <- .set(view, c("data", "dashboard"), dashboard)
        view <- .set(view, c("data"), as.list(.get(view, "data")))
        view <- .set(view, c("editor"), editor)

        mxDbAddRow(
          data = view,
          table = .get(config, c("pg", "tables", "views"))
        )

        # edit flag
        view$`_edit` <- TRUE

        mglUpdateView(view)

        jedRemoveDraft("dashboardEdit", view$id)

        reactData$updateViewListFetchOnly <- runif(1)
      }

      mxFlashIcon("floppy-o")

      mxUpdateText(
        id = "modalViewEdit_txt",
        text = sprintf(d("saved_at", language), format(time, "%H:%M"))
      )
    },
    "remove" = {
      if (view[["_edit"]] && view[["type"]] %in% c("vt", "rt", "cc")) {
        view[["_edit"]] <- NULL

        view <- .set(view, c("date_modified"), time)
        view <- .set(view, c("target"), as.list(.get(view, c("target"))))
        view <- .set(view, c("readers"), as.list(.get(view, c("readers"))))
        view <- .set(view, c("editors"), as.list(.get(view, c("editors"))))
        view <- .set(view, c("data", "dashboard"), NULL)
        view <- .set(view, c("data"), as.list(.get(view, "data")))
        view <- .set(view, c("editor"), editor)

        mxDbAddRow(
          data = view,
          table = .get(config, c("pg", "tables", "views"))
        )

        # edit flag
        view$`_edit` <- TRUE

        mglUpdateView(view)

        jedRemoveDraft("dashboardEdit", view$id)

        reactData$updateViewListFetchOnly <- runif(1)
      }

      mxFlashIcon("floppy-o")
    }
  )

  mxToggleButton(
    id = "btnViewPreviewDashboard",
    disable = FALSE
  )
  mxToggleButton(
    id = "btnViewSaveDashboard",
    disable = FALSE
  )
})
