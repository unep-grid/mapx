
#
# Set view and source ui 
#
observe({

  userRole <- getUserRole()

  isolate({

    isMember <- "publishers" %in% userRole$groups
    project <- reactData$project

    if( !isMember ){
      uiSourceEdit = div()
      uiViewAdd =  div()

    }else{

      language <- reactData$language
      uiViewAdd <- tagList(
        tags$h4(`data-lang_key`="title_tools_views",d("title_tools_views",language)),
        actionButton(
          label =  d("btn_add_view",language),
          inputId = "btnAddView",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_view"
          ))


      uiSourceEdit <- tagList(
        tags$h4(`data-lang_key`="title_tools_sources",d("title_tools_sources",language)),
        actionButton(
          label = d("btn_source_validate_geom",language),
          inputId = "btnValidateSourceGeom",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_source_validate_geom"
          ),
        actionButton(
          label = d("btn_source_overlap_utilities",language),
          inputId = "btnAnalysisOverlap",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_source_overlap_utilities"
          ),
        actionButton(
          label = d("btn_edit_source",language),
          inputId = "btnEditSources",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_edit_source"
          ),
        actionButton(
          label = d("btn_edit_source_metadata",language),
          inputId = "btnEditSourcesMetadata",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_edit_source_metadata"
          ),
        actionButton(
          label= d("btn_add_source",language),
          inputId = "btnUploadSourceApi",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_source",
          )
        )
    }

    output$uiBtnViewAdd <- renderUI(uiViewAdd)
    output$uiBtnSourceEdit <- renderUI(uiSourceEdit)

  })
})




