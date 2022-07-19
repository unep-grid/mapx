
#
# Set view and source ui
#
observe({
  userRole <- getUserRole()

  isolate({
    isPublisher <- "publishers" %in% userRole$groups
    project <- reactData$project
    idUser <- .get(reactUser$data, c("id"))
    isRoot <- idUser %in% .get(config, c("root_mode", "members"))


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
          label = d("btn_add_view", language),
          inputId = "btnAddView",
          class = "btn btn-default",
          `data-lang_key` = "btn_add_view"
        )
      )

      uiSourceEdit <- tagList(
        tags$h4(
          `data-lang_key` = "title_tools_sources",
          d("title_tools_sources", language)
        ),
        actionButton(
          label = d("btn_source_validate_geom", language),
          inputId = "btnValidateSourceGeom",
          class = "btn btn-default",
          `data-lang_key` = "btn_source_validate_geom"
        ),
        actionButton(
          label = d("btn_source_overlap_utilities", language),
          inputId = "btnAnalysisOverlap",
          class = "btn btn-default",
          `data-lang_key` = "btn_source_overlap_utilities"
        ),
        actionButton(
          label = d("btn_edit_source_settings", language),
          inputId = "btnEditSourceSettings",
          class = "btn btn-default",
          `data-lang_key` = "btn_edit_source_settings"
        ),
        actionButton(
          label = d("btn_edit_source_metadata", language),
          inputId = "btnEditSourceMetadata",
          class = "btn btn-default",
          `data-lang_key` = "btn_edit_source_metadata"
        ),
        actionButton(
          label = d("btn_edit_source_attributes_table", language),
          inputId = "btnEditSourceTable",
          class = "btn btn-default",
          `data-lang_key` = "btn_edit_source_attributes_table"
        ),
        actionButton(
          label = d("btn_add_source", language),
          inputId = "btnUploadSourceApi",
          class = "btn btn-default",
          `data-lang_key` = "btn_add_source",
        )
      )

      if (isRoot) {
        uiSourceEdit <- tagList(
          uiSourceEdit,
          actionButton(
            label = d("btn_rebuild_geoserver", language),
            inputId = "btnRebuildGeoserver",
            class = "btn btn-default",
            `data-lang_key` = "btn_rebuild_geoserver",
          ),
          actionButton(
            label = d("btn_rebuild_geoserver_recalc_style", language),
            inputId = "btnRebuildGeoserverRecalcStyle",
            class = "btn btn-default",
            `data-lang_key` = "btn_rebuild_geoserver_recalc_style",
          )
        )
      }
    }

    output$uiBtnViewAdd <- renderUI(uiViewAdd)
    output$uiBtnSourceEdit <- renderUI(uiSourceEdit)
  })
})
