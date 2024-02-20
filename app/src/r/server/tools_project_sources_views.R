#
# Set view and source ui
#
observe({
  userRole <- getUserRole()

  isolate({
    isPublisher <- "publishers" %in% userRole$groups
    project <- reactData$project
    idUser <- .get(reactUser$data, c("id"))
    isRoot <- mxIsUserRoot(idUser)

    if (!isPublisher) {
      uiSourceEdit <- div()
      uiViewAdd <- div()
    } else {
      language <- reactData$language
      uiViewAdd <- tagList(
        tags$h4(
          `data-lang_key` = "title_tools_views",
          d("title_tools_views", language)
        ),
        actionButton(
          label = mxLabel("btn_add_view", language, "plus"),
          inputId = "btnAddView",
          class = "btn btn-default"
        )
      )

      uiSourceEdit <- tagList(
        tags$h4(
          `data-lang_key` = "title_tools_sources",
          d("title_tools_sources", language)
        ),
        actionButton(
          label = mxLabel("btn_source_overlap_utilities", language, "crop"),
          inputId = "btnAnalysisOverlap",
          class = "btn btn-default"
        ),
        actionButton(
          label = mxLabel("btn_edit_source_settings", language, "cog"),
          inputId = "btnEditSourceSettings",
          class = "btn btn-default"
        ),
        actionButton(
          label = mxLabel("btn_edit_source_metadata", language, "book"),
          inputId = "btnEditSourceMetadata",
          class = "btn btn-default"
        ),
        actionButton(
          label = mxLabel(
            "btn_edit_source_attributes_table",
            language,
            "table"
            ),
          inputId = "btnEditSourceTable",
          class = "btn btn-default"
        ),
        actionButton(
          label = mxLabel("btn_add_source", language, "upload"),
          inputId = "btnUploadSourceApi",
          class = "btn btn-default"
        )
      )

      if (isRoot) {
        uiSourceEdit <- tagList(
          uiSourceEdit,
          actionButton(
            label = mxLabel("btn_rebuild_geoserver", language, "refresh"),
            inputId = "btnRebuildGeoserver",
            class = "btn btn-default",
          ),
          actionButton(
            label = mxLabel("btn_rebuild_geoserver_recalc_style", language, "paint-brush"),
            inputId = "btnRebuildGeoserverRecalcStyle",
            class = "btn btn-default",
          ),
          actionButton(
            label = mxLabel("btn_join_editor_new", language, "plus"),
            inputId = "btnJoinEditorNew",
            class = "btn btn-default",
          ),
          actionButton(
            label = mxLabel("btn_join_editor", language, "cog"),
            inputId = "btnJoinEditor",
            class = "btn btn-default",
          )
        )
      }
    }

    output$uiBtnViewAdd <- renderUI(uiViewAdd)
    output$uiBtnSourceEdit <- renderUI(uiSourceEdit)
  })
})
