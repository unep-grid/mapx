#
# View action handler
#

observe({
  mxCatch("view_edit.R", {
    #
    # Extract action type
    #
    viewAction <- input$mx_client_view_action

    if (isEmpty(viewAction)) {
      return()
    }

    isolate({

      isGuest <- isGuestUser()
      userData <- reactUser$data
      idUser <- userData$id
      userRole <- getUserRole()
      language <- reactData$language
      project <- reactData$project
      token <- reactUser$token
      isDev <- mxIsUserDev(idUser)

      if (viewAction[["action"]] == "btn_upload_geojson") {
        #
        # Section to remove
        #
      } else {
        #
        # Get view data and check if user can edit
        #

        viewId <- viewAction[["target"]]
        if (isEmpty(viewId)) {
          return()
        }

        viewData <- mxApiGetViews(
          idViews = viewId,
          idProject = project,
          idUser = userData$id,
          language = language,
          token = token
        )

        if (isEmpty(viewData)) {
          return()
        }

        if (length(viewData) > 1) {
          #
          # mxApiGetViews did not found the view and return everything.
          #
          return()
        } else {
          viewData <- viewData[[1]]
        }

        if (isEmpty(viewData)) {
          return()
        }
        #
        # Keep a version of the view edited
        #
        reactData$viewDataEdited <- viewData

        #
        # Check if the request gave edit flag to the user
        #
        viewIsEditable <- isTRUE(.get(viewData, c("_edit")))

        #
        # Get type and title
        #
        viewType <- .get(viewData, c("type"))
        viewTitle <- .get(viewData, c("_title"))

        #
        # Who can view this
        #
        viewReadTarget <- c("self", "public", "members", "publishers", "admins")
        viewEditTarget <- c("self", "publishers", "admins")
        viewReaders <- c("self", .get(viewData, c("readers")))
        viewEditors <- c("self", .get(viewData, c("editors")))
        viewEditors <- unique(c(viewEditors, .get(viewData, c("editor"))))
        viewReaders <- viewReaders[!viewReaders == idUser]
        viewEditors <- viewEditors[!viewEditors == idUser]
        #
        # View collection
        #
        collectionsTags <- reactCollections()
        collectionsCurrent <- .get(viewData, c("data", "collections"))


        #
        # Initial button list for the modal
        #
        btnList <- tagList()

        #
        # Switch through actions
        #
        switch(viewAction$action,
          "btn_opt_share_to_project" = {
            reactData$showShareManagerProject <- runif(1)
          },
          "btn_opt_share" = {
            reactData$showShareManager <- list(
              views = list(viewId),
              isStory = .get(viewData, c("type")) == "sm",
              project = project,
              collections = collectionsCurrent,
              trigger = runif(1)
            )
          },
          "btn_opt_download" = {
            idSource <- .get(viewData, c("data", "source", "layerInfo", "name"))
            if (isEmpty(idSource)) {
              return()
            }

            reactData$sourceDownloadRequest <- list(
              idSource = idSource,
              idView = viewId,
              update = runif(1)
            )
          },
          "btn_opt_delete" = {
            if (!viewIsEditable) {
              return()
            }

            uiOut <- tagList(
              tags$p(
                tags$span(d("view_delete_confirm", language))
              )
            )

            btnList <- list(
              actionButton(
                inputId = "btnViewDeleteConfirm",
                label = d("btn_confirm", language)
              )
            )

            mxModal(
              id = "modalViewEdit",
              title = sprintf(d("view_delete_modal_title", language), viewTitle),
              content = uiOut,
              textCloseButton = d("btn_close", language),
              buttons = btnList,
              addBackground = TRUE,
              addBtnMove = TRUE
            )
          },
          "btn_opt_edit_config" = {
            if (!viewIsEditable) {
              return()
            }

            #
            # Set list of project by user
            #
            projectsList <- mxDbGetProjectListByUser(
              id = userData$id,
              whereUserRoleIs = "publisher",
              language = language,
              token = reactUser$token,
              asNamedList = TRUE,
              idsAdditionalProjects = .get(viewData, c("data", "projects"))
            )

            #
            # Get additional editors from members
            #
            members <- reactTableUsers()$members

            #
            # Create named lists for editors and members
            #
            targetNamesEditors <- c(
              d("group_project", language, web = F),
              d("members", language, web = F)
            )
            targetNamesReaders <- c(
              d("group_project", language, web = F)
            )
            viewReadTarget <- list(
              Groups = d(viewReadTarget, language, namedVector = T)
            )
            viewEditTarget <- list(
              Groups = d(viewEditTarget, language, namedVector = T),
              Users = members
            )
            names(viewReadTarget) <- targetNamesReaders
            names(viewEditTarget) <- targetNamesEditors

            #
            # Specific ui for each type (sm,vt,rt). Default empty ;
            #
            uiType <- tagList()

            #
            # Common ui
            #
            uiDesc <- tagList(
              #
              # Title and abstract (schema based)
              #
              jedOutput("viewTitleSchema"),
              jedOutput("viewAbstractSchema"),

              #
              # Projects of the view ?
              #
              selectizeInput(
                inputId = "selViewProjectsUpdate",
                label = d("view_projects", language),
                choices = projectsList,
                selected = .get(viewData, c("data", "projects")),
                multiple = TRUE,
                options = list(
                  sortField = "label",
                  plugins = list("remove_button")
                )
              ),
              #
              # Who can see this ?
              #
              selectizeInput(
                inputId = "selViewReadersUpdate",
                label = d("view_target_readers", language),
                choices = viewReadTarget,
                selected = viewReaders,
                multiple = TRUE,
                options = list(
                  sortField = "label",
                  plugins = list("remove_button")
                )
              ),
              selectizeInput(
                inputId = "selViewEditorsUpdate",
                label = d("view_target_editors", language),
                choices = viewEditTarget,
                selected = viewEditors,
                multiple = TRUE,
                options = list(
                  sortField = "label",
                  plugins = list("remove_button")
                )
              ),
              #
              # Collections
              #
              if (FALSE) {
                selectizeInput(
                  inputId = "selViewCollectionsUpdate",
                  label = d("view_collections", language),
                  choices = collectionsTags,
                  selected = collectionsCurrent,
                  multiple = TRUE,
                  options = list(
                    create = userRole$publisher,
                    sortField = "label",
                    plugins = list("remove_button")
                  )
                )
              }
            )

            #
            # vector tile specific
            #
            if (viewType == "vt") {
              srcAvailable <- reactListReadSourcesVector()
              srcSet <- .get(viewData, c("data", "source", "layerInfo", "name"))
              srcSetMask <- .get(viewData, c("data", "source", "layerInfo", "maskName"))


              srcAvailableMask <- srcAvailable[!srcAvailable %in% srcSet]
              hasSource <- srcSet %in% srcAvailable

              if (isNotEmpty(srcSet) && !hasSource) {
                names(srcSet) <- mxGetTitleFromSourceID(
                  id = srcSet,
                  language = language
                )

                srcAvailable <- c(srcSet, srcAvailable)
              }

              uiType <- tagList(
                #
                # main layer
                #
                tagList(
                  selectizeInput(
                    inputId = "selectSourceLayerMain",
                    label = d("source_select_layer", language),
                    choices = srcAvailable,
                    selected = srcSet,
                    options = list(
                      sortField = "label"
                    )
                  ),
                  selectizeInput(
                    inputId = "selectSourceLayerMainGeom",
                    label = d("source_select_geometry", language),
                    choices = NULL,
                    selected = NULL
                  ),
                  selectizeInput(
                    inputId = "selectSourceLayerMainVariable",
                    label = d("source_select_variable", language),
                    choices = NULL,
                    selected = NULL
                  ),
                  selectizeInput(
                    inputId = "selectSourceLayerOtherVariables",
                    label = d("source_select_variable_alt", language),
                    choices = NULL,
                    selected = NULL,
                    multiple = TRUE,
                    options = list(
                      plugins = list("remove_button")
                    )
                  ),
                  actionButton(
                    inputId = "btnGetLayerSummary",
                    label = d("btn_get_layer_summary", language)
                  )
                ),
                #
                # mask / overlap layer
                #
                checkboxInput(
                  inputId = "checkAddMaskLayer",
                  label = ddesc("view_add_overlap_layer", language),
                  value = isNotEmpty(srcSetMask)
                ),
                conditionalPanel(
                  condition = "input.checkAddMaskLayer",
                  tagList(
                    selectizeInput(
                      inputId = "selectSourceLayerMask",
                      label = d("source_select_layer_mask", language),
                      choices = srcAvailableMask,
                      selected = srcSetMask,
                      options = list(
                        sortField = "label"
                      )
                    ),
                    uiOutput("uiViewEditVtMask")
                  )
                )
              )
            }
            #
            # raster tile specific
            #
            if (viewType == "rt") {
              url <- .get(viewData, c("data", "source", "tiles"))
              legend <- .get(viewData, c("data", "source", "legend"))
              urlMetadata <- .get(viewData, c("data", "source", "urlMetadata"))
              urlDownload <- .get(viewData, c("data", "source", "urlDownload"))

              if (isEmpty(url)) url <- list()
              url <- unlist(url[1])

              uiType <- tagList(
                selectizeInput(
                  inputId = "selectRasterTileSize",
                  label = mxDictTranslateTagDesc("source_raster_tile_size", language),
                  selected = .get(viewData, c("data", "source", "tileSize")),
                  choices = c(256, 512)
                ),
                checkboxInput(
                  inputId = "checkRasterTileUseMirror",
                  label = mxDictTranslateTagDesc("tool_mirror_enable", language),
                  value = .get(viewData, c("data", "source", "useMirror"))
                ),
                checkboxInput(
                  inputId = "checkShowWmsGenerator",
                  label = mxDictTranslateTagDesc("wms_display_tool", language)
                ),
                conditionalPanel(
                  condition = "input.checkShowWmsGenerator == true",
                  tags$div(
                    class = "well",
                    tags$h3(mxDictTranslateTag("wms_display_tool_title", language)),
                    tags$hr(),
                    tags$div(id = "wmsGenerator")
                  )
                ),
                textAreaInput(
                  inputId = "textRasterTileUrl",
                  label = d("source_raster_tile_url", language),
                  value = url
                ),
                textAreaInput(
                  inputId = "textRasterTileLegend",
                  label = d("source_raster_tile_legend", language),
                  value = legend
                ),
                jedOutput("viewRasterLegendTitles")
              )
            }

            #
            # Add source metedata for view
            #
            if (viewType %in% c("rt", "cc")) {
              uiType <- tagList(
                uiType,
                jedOutput("viewSourceMetadata")
              )
              # Used to trigger fetching value from editor
              # and then, validate 'in depth', independently from
              # schema.
              btnList <- tagList(
                actionButton(
                  inputId = "btnValidateViewMetadata",
                  label = d("btn_validate_metadata", language)
                )
              )
            }


            #
            # ui title/ desc and type specific ui
            #
            uiOut <- tagList(
              uiDesc,
              uiType,
              tags$div(style = "height:300px")
            )
            #
            # Buttons
            #
            btnList <- tagList(
              btnList,
              actionButton(
                inputId = "btnViewSave",
                label = d("btn_save", language),
                disabled = "disabled",
                `data-keep` = TRUE
              )
            )

            #
            # Final edit modal panel
            #
            mxModal(
              id = "modalViewEdit",
              title = sprintf("%1$s : %2$s", d("view_edit_current", language, web = F), viewTitle),
              content = uiOut,
              buttons = btnList,
              addBackground = FALSE,
              textCloseButton = d("btn_close", language),
              addBtnMove = TRUE
            )

            if (viewType == "rt") {
              #
              # Build wms generator
              #
              mxWmsBuildQueryUi(list(
                timestamp = .get(viewData, c("date_modified")),
                useCache = FALSE,
                services = .get(config, c("wms")),
                selectorParent = "#wmsGenerator",
                selectorTileInput = "#textRasterTileUrl",
                selectorLegendInput = "#textRasterTileLegend",
                selectorUseMirror = "#checkRasterTileUseMirror",
                selectorTileSizeInput = "#selectRasterTileSize"
                # selectorMetaInput = '#textRasterTileUrlMetadata'
              ))
            }
          },
          "btn_opt_edit_custom_code" = {
            if (!viewIsEditable) {
              return()
            }
            if (viewType != "cc") {
              return()
            }
            if (!isDev) {
              return()
            }


            btnList <- list(
              actionButton(
                inputId = "btnViewSaveCustomCode",
                label = d("btn_save", language)
              ),
              actionButton(
                inputId = "btnViewPreviewCustomCode",
                label = d("btn_preview", language)
              )
            )

            mxModal(
              id = "modalViewEdit",
              title = sprintf(d("view_edit_custom_code_modal_title", language), viewTitle),
              addBackground = FALSE,
              addBtnMove = TRUE,
              content = tagList(
                jedOutput(id = "customCodeEdit")
              ),
              buttons = btnList,
              textCloseButton = d("btn_close", language)
            )
          },
          "btn_opt_edit_dashboard" = {
            if (!viewIsEditable) {
              return()
            }
            if (viewType == "sm" || viewType == "gj") {
              return()
            }

            btnList <- list(
              actionButton(
                inputId = "btnViewSaveDashboard",
                label = d("btn_save", language)
              ),
              actionButton(
                inputId = "btnViewPreviewDashboard",
                label = d("btn_preview", language)
              ),
              actionButton(
                inputId = "btnViewRemoveDashboard",
                label = d("btn_delete", language)
              )
            )

            mxModal(
              id = "modalViewEdit",
              title = sprintf(d("view_edit_dashboard_modal_title", language), viewTitle),
              addBackground = FALSE,
              addBtnMove = TRUE,
              content = tagList(
                uiOutput("txtValidSchema"),
                jedOutput(id = "dashboardEdit")
              ),
              buttons = btnList,
              textCloseButton = d("btn_close", language)
            )
          },
          "btn_opt_edit_story" = {
            if (!viewIsEditable) {
              return()
            }
            if (viewType != "sm") {
              return()
            }

            btnList <- list(
              actionButton(
                inputId = "btnViewCloseStory",
                label = d("btn_close", language),
                `data-keep` = TRUE
              ),
              actionButton(
                inputId = "btnViewSaveStory",
                label = d("btn_save", language),
                `data-keep` = TRUE
              ),
              actionButton(
                inputId = "btnViewPreviewStory",
                label = d("btn_preview", language),
                `data-keep` = TRUE
              )
            )

            tips <- mxFold(
              content = HTML(d("schema_story_tips", language)),
              labelText = d("schema_story_tips_title", language),
              labelDictKey = "schema_story_tips_title",
              open = FALSE
            )

            mxModal(
              id = "modalViewEdit",
              title = sprintf(d("view_edit_story_modal_title", language), viewTitle),
              addBackground = FALSE,
              addBtnMove = TRUE,
              content = tagList(
                uiOutput("txtValidSchema"),
                jedOutput(id = "storyEdit"),
                tips
              ),
              buttons = btnList,
              textCloseButton = d("btn_close", language),
              removeCloseButton = TRUE
            )

          },
          "btn_opt_edit_style" = {
            if (!viewIsEditable) {
              return()
            }
            if (viewType != "vt") {
              return()
            }

            btnList <- list(
              actionButton(
                inputId = "btnViewCloseStyle",
                label = d("btn_close", language)
              ),
              actionButton(
                inputId = "btnViewSaveStyle",
                label = d("btn_save", language)
              ),
              actionButton(
                inputId = "btnViewPreviewStyle",
                label = d("btn_preview", language)
              )
            )

            mxModal(
              id = "modalViewEdit",
              title = sprintf(d("view_edit_style_modal_title", language), viewTitle),
              addBackground = FALSE,
              addBtnMove = TRUE,
              content = tagList(
                uiOutput("txtValidSchema"),
                jedOutput(id = "styleEdit")
              ),
              buttons = btnList,
              removeCloseButton = TRUE
            )
          }
        )
      }
    })
  })
})

observeEvent(input$viewTitleSchema_init, {
  view <- reactData$viewDataEdited
  v <- .get(config, c("validation", "input", "nchar"))
  language <- reactData$language
  languages <- .get(config, c("languages", "codes"))
  titles <- .get(view, c("data", "title"))
  schema <- mxSchemaMultiLingualInput(
    keyTitle = "view_title",
    format = "text",
    default = titles,
    language = language,
    languagesRequired = c("en"),
    languagesHidden = languages[!languages %in% language],
    maxLength = v$viewTitle$max,
    minLength = v$viewTitle$min
  )
  jedSchema(
    id = "viewTitleSchema",
    schema = schema,
    startVal = titles,
    options = list(
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE
    )
  )
})

observeEvent(input$viewAbstractSchema_init, {
  view <- reactData$viewDataEdited
  v <- .get(config, c("validation", "input", "nchar"))
  language <- reactData$language
  languages <- .get(config, c("languages", "codes"))
  abstracts <- .get(view, c("data", "abstract"))
  schema <- mxSchemaMultiLingualInput(
    keyTitle = "view_abstract",
    format = "textarea",
    default = abstracts,
    language = language,
    languagesRequired = c("en"),
    languagesHidden = languages[!languages %in% language],
    maxLength = v$viewAbstract$max,
    minLength = v$viewAbstract$min
  )
  jedSchema(
    id = "viewAbstractSchema",
    schema = schema,
    startVal = abstracts,
    options = list(
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE
    )
  )
})

observeEvent(input$viewRasterLegendTitles_init, {
  view <- reactData$viewDataEdited
  language <- reactData$language
  languages <- .get(config, c("languages", "codes"))
  legendTitles <- .get(view, c("data", "source", "legendTitles"))

  #
  # Same as in schema_view_style.R
  #
  schemaTitleLegend <- mxSchemaMultiLingualInput(
    languagesRequired = c("en"),
    language = language,
    keyTitle = "schema_style_title_legend",
    default = list(en = "Legend"),
    type = "string"
  )

  jedSchema(
    id = "viewRasterLegendTitles",
    schema = schemaTitleLegend,
    startVal = legendTitles,
    options = list(
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE
    )
  )
})



#
# Validate metadata
#
observeEvent(input$btnValidateViewMetadata, {
  # will be validated by mxValidateMetadataModal through client, using
  # validateMetadataModal
  jedTriggerGetValues("viewSourceMetadata", "validate")
})

#
# View source metadata, rt, cc, where the source is not
# stored in mx_sources.
#
observeEvent(input$viewSourceMetadata_init, {
  view <- reactData$viewDataEdited
  language <- reactData$language
  viewSourceMetadata <- .get(view, c("data", "source", "meta"))

  schemaMeta <- mxSchemaSourceMeta(
    language = language,
    noAttributes = TRUE,
    idView = view$id 
  )

  #
  # Auto fill view meta for view < mapx 1.8
  # if the view has ho metadata
  #
  if (isEmpty(viewSourceMetadata)) {
    hasUrlDownload <- isNotEmpty(.get(view, c("data", "source", "urlDownload")))
    if (hasUrlDownload) {
      source <- list(
        urls = list(
          list(
            is_download_link = TRUE,
            url = .get(view, c("data", "source", "urlDownload"), "")
          )
        )
      )
    } else {
      source <- list()
    }
    viewSourceMetadata <- list(
      text = list(
        title = list("en" = .get(view, c("data", "title", "en"))),
        abstract = list("en" = .get(view, c("data", "abstract", "en")))
      ),
      origin = list(
        homepage = list(
          url = .get(view, c("data", "source", "urlMetadata"), "")
        ),
        source = source
      )
    )
  }

  jedSchema(
    id = "viewSourceMetadata",
    schema = schemaMeta,
    startVal = viewSourceMetadata,
    options = list(
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE
    )
  )
})

#
# View removal
#
observeEvent(input$btnViewDeleteConfirm, {
  idView <- .get(reactData$viewDataEdited, c("id"))
  email <- reactUser$data$email

  if (isEmpty(idView)) mxDebugMsg("View to delete not found")

  #
  # Remove all views rows
  #
  mxDbGetQuery(sprintf(
    "
      DELETE FROM %1$s
      WHERE id='%2$s'",
    .get(config, c("pg", "tables", "views")),
    idView
  ))

  #
  # Remove client view
  #
  mglRemoveView(idView)

  reactData$updateViewList <- runif(1)
  #
  # Close modal window
  #
  mxModal(
    id = "modalViewEdit",
    close = TRUE
  )
})


#
# Trigger in depth valdiation of source meta stored in view (rt,cc)
#
observeEvent(input$btnValidateViewMetadata, {
  values <- input$viewSourceMetadata_values
  if (isEmpty(values)) {
    return()
  }
  meta <- .get(values, c("data"))
  mxValidateMetadataModal(meta)
})


#
# Button save disabling
#
observe({
  #
  # Title and description
  #
  errors <- list()
  view <- reactData$viewDataEdited

  hasView <- isNotEmpty(view)
  hasInvalidLayer <- TRUE


  if (hasView) {
    isVectorTile <- isTRUE(.get(view, c("type")) == "vt")

    #
    # Vector layer error
    #
    if (isVectorTile) {
      layer <- input$selectSourceLayerMain
      variable <- input$selectSourceLayerMainVariable
      geomType <- input$selectSourceLayerMainGeom
      errors <- c(
        isEmpty(layer),
        isEmpty(variable),
        isEmpty(geomType),
        !layer %in% reactListReadSourcesVector()
      )
    }

    #
    # Other input check
    #
    titleValues <- input$viewTitleSchema_values
    titleIssues <- input$viewTitleSchema_issues
    abstractValues <- input$viewAbstractSchema_values
    abstractIssues <- input$viewAbstractSchema_issues

    hasNoSchemaTitle <- isEmpty(.get(titleValues, c("data", "en")))
    hasNoSchemaAbstract <- isEmpty(.get(abstractValues, c("data", "en")))
    hasTitleIssues <- isNotEmpty(.get(titleIssues, c("data")))
    hasAbstractIssues <- isNotEmpty(.get(abstractIssues, c("data")))

    if (view[["type"]] == "rt") {
      #
      # Issue with raster legend
      #
      legendTitlesIssues <- input$viewRasterLegendTitles_issues
      hasLegendTitlesIssues <- isNotEmpty(.get(legendTitlesIssues, c("data")))
    } else {
      hasLegendTitlesIssues <- FALSE
    }
    if (view[["type"]] %in% c("cc", "rt")) {
      #
      # Issue with view metadata
      #
      viewSourceMetadataIssues <- input$viewSourceMetadata_issues
      hasViewMetadataIssues <- isNotEmpty(.get(viewSourceMetadataIssues, c("data")))
    } else {
      hasViewMetadataIssues <- FALSE
    }


    errors <- c(
      errors,
      hasTitleIssues,
      hasAbstractIssues,
      hasNoSchemaTitle,
      hasNoSchemaAbstract,
      hasLegendTitlesIssues,
      hasViewMetadataIssues
    )

    disabled <- any(sapply(errors, isTRUE))

    mxToggleButton(
      id = "btnViewSave",
      disable = disabled
    )
  }
})



#
# View vt, rt, sm : save
#
observeEvent(input$btnViewSave, {
  mxCatch("view_edit : save", {
    mxToggleButton(
      id = "btnViewSave",
      disable = TRUE
    )

    on.exit({
      mxToggleButton(
        id = "btnViewSave",
        disable = FALSE
      )
    })
    #
    # Retrieve view value
    #
    view <- reactData$viewDataEdited
    idView <- .get(view, c("id"))
    project <- reactData$project
    userData <- reactUser$data
    language <- reactData$language
    hideView <- FALSE # remove view from ui after save

    #
    # Email user for async
    #
    email <- reactUser$data$email

    #
    # check for edit right, remove temporary edit mark
    #
    if (!isTRUE(view[["_edit"]])) {
      return()
    }
    view[["_edit"]] <- NULL

    #
    # Update target
    #
    readers <- input$selViewReadersUpdate
    editors <- input$selViewEditorsUpdate

    #
    # Update project
    #
    projectsUpdate <- input$selViewProjectsUpdate
    if (isEmpty(projectsUpdate)) projectsUpdate <- list()
    projects <- as.list(projectsUpdate)
    editor <- reactUser$data$id

    view[[c("editor")]] <- editor
    view[[c("data", "projects")]] <- projects

    if (isEmpty(editors)) {
      editors <- c(as.character(editor))
    }
    if (!isTRUE(as.character(editor) %in% editors)) {
      editors <- c(editors, as.character(editor))
    }
    #
    # Update collections
    #
    collections <- input$selViewCollectionsUpdate
    view[[c("data", "collections")]] <- as.list(collections)
    hideView <- isNotEmpty(query$collections) && !any(collections %in% query$collections)

    #
    # Title and description
    #
    view[[c("data", "title")]] <- input$viewTitleSchema_values$data
    view[[c("data", "abstract")]] <- input$viewAbstractSchema_values$data

    #
    # Update first level values
    #
    view[["data"]] <- as.list(view$data)
    view[[c("readers")]] <- as.list(readers)
    view[[c("editors")]] <- as.list(editors)
    view[[c("target")]] <- NULL

    #
    # vector tiles
    #
    if (view[["type"]] == "vt") {
      #
      # Get reactive data source summary
      # - uses selectSourceLayerMainVariable
      #
      sourceData <- reactLayerSummary()
      sourceDataMask <- reactLayerMaskSummary()
      additionalAttributes <- input$selectSourceLayerOtherVariables
      layerMain <- input$selectSourceLayerMain
      attribute <- input$selectSourceLayerMainVariable

      #
      # Last check
      #
      attributesValid <- mxDbExistsColumns(layerMain, c(
        additionalAttributes, attribute
      ))
      if (!attributesValid) {
        reactData$updateSourceLayerList <- runif(1)

        mxModal(
          id = "modalViewEdit",
          close = TRUE
        )
        mxModal(
          id = "modalViewEditError",
          title = dd("view_edit_attribute_error"),
          addBackground = TRUE,
          content = tagList(
            tags$span(
              dd("view_edit_attribute_error_desc"),
            )
          )
        )
        return()
      }


      #
      # Update view data
      #
      view <- mxUpdateDefViewVt(
        view,
        sourceData,
        sourceDataMask,
        additionalAttributes
      )
    }
    #
    # raster tiles
    #
    if (view[["type"]] == "rt") {
      #
      # Update view  NOTE: write a function like in vt type
      #
      view[[c("data", "source")]] <- list(
        type = "raster",
        tiles = rep(input$textRasterTileUrl, 2),
        legend = input$textRasterTileLegend,
        tileSize = as.integer(input$selectRasterTileSize),
        useMirror = input$checkRasterTileUseMirror
      )

      view[[c("data", "source", "legendTitles")]] <- input$viewRasterLegendTitles_values$data
    }

    #
    # View metadata : rt and cc
    #
    if (view[["type"]] %in% c("rt", "cc")) {
      viewSourceMetadata <- .get(input, c("viewSourceMetadata_values", "data"))
      view <- .set(view, c("data", "source", "meta"), viewSourceMetadata)
      # A copy is required for current session
      view$`_meta` <- viewSourceMetadata
    }


    #
    # Warning if date_modified missmatch
    #
    viewStored <- mxDbGetView(.get(view, "id"))[[1]]
    lastEditor <- .get(viewStored, "editor")
    lastEditorEmail <- mxDbGetEmailFromId(lastEditor)

    dateStoredStr <- .get(viewStored, "date_modified")
    dateCurrentStr <- .get(view, "date_modified")
    dateFormat <- .get(config, c("dates_format", "db"))
    dateStored <- as.POSIXct(
      dateStoredStr,
      format = dateFormat,
      tz = "UTC"
    )
    dateCurrent <- as.POSIXct(
      dateCurrentStr,
      format = dateFormat,
      tz = "UTC"
    )

    storedIsMoreRecent <- dateStored > dateCurrent

    if (storedIsMoreRecent) {
      mxModal(
        id = "modalViewEditTimestampIssue",
        title = dd("view_edit_warning_date_concurrency"),
        content =
          tags$span(
            dd("view_edit_warning_date_concurrency_desc"),
            lastEditorEmail
          ),
        addBackground = TRUE,
      )
    }

    #
    # Set timestamp
    #
    time <- Sys.time()
    view[["date_modified"]] <- time
    reactData$viewDataEdited$date_modified <- time

    #
    # save a version in db
    #
    mxDbAddRow(
      data = view,
      table = .get(config, c("pg", "tables", "views"))
    )

    # edit flag
    view$`_edit` <- TRUE

    if (!hideView) {
      mglUpdateView(view)
    }
    #
    # Trigger next reactViews call
    #
    reactData$updateViewListFetchOnly <- runif(1)


    #
    # Display info text
    #
    mxFlashIcon("floppy-o")
    mxUpdateText(
      id = "modalViewEdit_txt",
      text = sprintf("Saved at %s", format(time, "%H:%M"))
    )
  })
})


observe({
  mxCatch("view_edit : update available variables", {
    layerMain <- input$selectSourceLayerMain
    if (isEmpty(layerMain)) {
      return()
    }

    #
    # In case of of reopening same view, this oberver is not
    # invalidated. Meaning properties not updated
    # Using init from viewTitleSchema_init make sure to invalidate
    # this.
    #
    update <- input$viewTitleSchema_init
    isolate({
      viewData <- reactData$viewDataEdited

      if (isEmpty(viewData)) {
        return()
      }
      if (viewData$type != "vt") {
        return()
      }

      language <- reactData$language

      geomTypesDf <- mxApiGetSourceSummaryGeom(layerMain)

      geomTypes <- mxSetNameGeomType(geomTypesDf, language)

      variablesMain <- mxDbGetTableColumnsNames(
        table = layerMain,
        notIn = c("geom", "gid", "_mx_valid"),
        notType = c(
          "date",
          "time with time zone",
          "time without time zone",
          "timestamp with time zone",
          "timestamp without time zone"
        )
      )
      variables <- mxDbGetTableColumnsNames(
        table = layerMain,
        notIn = c("geom", "gid", "_mx_valid"),
      )

      geomType <- .get(viewData, c("data", "geometry", "type"))
      variableName <- .get(viewData, c("data", "attribute", "name"))
      variableNames <- .get(viewData, c("data", "attribute", "names"))

      if (isTRUE(geomType %in% geomTypes)) {
        geomTypeSelected <- geomType
      } else if (isNotEmpty(geomTypes)) {
        geomTypeSelected <- geomTypes[[1]]
      } else {
        geomTypeSelected <- NULL
      }

      if (isTRUE(variableName %in% variablesMain)) {
        variableMainSelected <- variableName
      } else {
        variableMainSelected <- variablesMain[[1]]
      }
      if (isTRUE(all(variableNames %in% variables))) {
        variablesOtherSelected <- variableNames
      } else {
        variablesOtherSelected <- NULL
      }

      updateSelectizeInput(session, "selectSourceLayerMainGeom",
        choices = geomTypes,
        selected = geomTypeSelected
      )
      updateSelectizeInput(session, "selectSourceLayerMainVariable",
        choices = variablesMain,
        selected = variableMainSelected
      )
      updateSelectizeInput(session, "selectSourceLayerOtherVariables",
        choices = variables,
        selected = variablesOtherSelected
      )
    })
  })
})

#
# Main layer summary
#
observeEvent(input$btnGetLayerSummary, {
  idAttr <- input$selectSourceLayerMainVariable
  idSource <- input$selectSourceLayerMain

  if (isEmpty(idAttr) || isEmpty(idSource)) {
    return()
  }

  mglGetSourceStatModal(list(
    idSource = idSource,
    idAttr = idAttr
  ))
})



#
# Number of overlap indication
#
observe({
  mxCatch("view_edit : update mask overlap count", {
    layerMask <- input$selectSourceLayerMask
    layerMain <- input$selectSourceLayerMain

    isolate({
      useMask <- isTRUE(input$checkAddMaskLayer)

      if (!useMask || isEmpty(layerMain) || isEmpty(layerMask)) {
        return()
      }

      language <- reactData$language

      output$uiViewEditVtMask <- renderUI({
        numOverlapping <- mxDbGetOverlapsCount(layerMain, layerMask)

        listToHtmlSimple(
          list(
            "view_num_overlap" = numOverlapping
          ),
          lang = language
        )
      })
    })
  })
})


observe({
  mxCatch("view_edit : update source input", {
    out <- list()
    layerMask <- NULL

    layer <- input$selectSourceLayerMain
    hasLayer <- isNotEmpty(layer)

    isolate({
      useMask <- isTRUE(input$checkAddMaskLayer)

      if (!hasLayer || !useMask) {
        return()
      }
      language <- reactData$language
      layerMask <- input$selectSourceLayerMask
      layers <- reactListReadSourcesVector()
      layers <- layers[!layers %in% layer]

      if (length(layers) == 0) {
        return()
      }

      updateSelectInput(
        session,
        "selectSourceLayerMask",
        choices = layers,
        selected = layerMask
      )
    })
  })
})
