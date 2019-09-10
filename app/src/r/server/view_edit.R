
#
# View action handler
#

observe({
  mxCatch("view_edit.R",{

    #
    # Extract action type
    #
    viewAction <- input[[sprintf("mglEvent_%1$s_view_action",.get(config,c("map","id")))]]

    if(!noDataCheck(viewAction)){

      isolate({

        isGuest <- isGuestUser()
        userData <- reactUser$data
        userRole <- getUserRole()
        language <- reactData$language
        project <- reactData$project
        token <- reactUser$token

        if(viewAction[["action"]] == "btn_upload_geojson" ){

          #
          # Section to remove
          #

        }else{

          #
          # Get view data and check if user can edit
          #
         
          viewId <- viewAction[["target"]]

          viewData <-  mxApiGetViews(
            idViews = viewId, 
            idProject = project,
            idUser = userData$id,
            language = language,
            token = token
            )

          if(length(viewData)>0){
            viewData <- viewData[[1]]
          }

          if(noDataCheck(viewData)) return()
          #
          # Keep a version of the view edited
          #
          reactData$viewDataEdited <- viewData
         
          #
          # Check if the request gave edit flag to the user
          #
          viewIsEditable <- isTRUE(.get(viewData,c("_edit")))
          
          #
          # Get type and title
          #
          viewType <- .get(viewData,c("type"))
          viewTitle <- .get(viewData,c("_title"))

          #
          # Who can view this
          #
          viewReadTarget <- c("public","members","publishers","admins") 
          viewEditTarget <- c("publishers","admins")
          viewReaders <- .get(viewData,c("readers")) 
          viewEditors <- .get(viewData,c("editors")) 
          viewEditors <- unique(c(viewEditors,.get(viewData,c("editor"))))
            
          #
          # View classes
          #
          classesTags <- .get(config,c("views","classes"))
          classesCurrent <- .get(viewData,c("data","classes"))

          #
          # View collection
          #
          collectionsTags <- mxDbGetDistinctCollectionsTags(project)
          collectionsCurrent <- .get(viewData,c("data","collections"))


          #
          # Initial button list for the modal
          #
          btnList <- list()

          #
          # Switch through actions
          #
          switch(viewAction$action,
            "btn_opt_share"= {
              reactData$showShareManager <- list(
                views = list(viewId),
                isStory = .get(viewData,c('type')) == "sm",
                project = project,
                collections = collectionsCurrent,
                trigger = runif(1)
                )
            },
            "btn_opt_download"= {
              idSource <- .get(viewData,c("data","source","layerInfo","name"))
              if(noDataCheck(idSource)){ return() }

              reactData$sourceDownloadRequest <- list(
                idSource = idSource,
                idView = viewId,
                update =  runif(1)
                )
            },
            "btn_opt_delete"={

              if(!viewIsEditable) return()

              uiOut<-tagList(
                tags$p(
                  tags$span(d("view_delete_confirm",language))
                  )
                )

              btnList <- list(
                actionButton(
                  inputId="btnViewDeleteConfirm",
                  label=d("btn_confirm",language)
                  )
                )

              mxModal(
                id="modalViewEdit",
                title=sprintf(d('view_delete_modal_title',language),viewTitle),
                content=uiOut,
                textCloseButton=d("btn_close",language),
                buttons=btnList
                )

            },
            "btn_opt_edit_config" = {

              if(!viewIsEditable) return()

              #
              # Set list of project by user 
              #
              projectsList <- mxDbGetProjectListByUser(
                id = userData$id,
                whereUserRoleIs = "publisher",
                language = language,
                asNamedList = TRUE,
                idsAdditionalProjects = .get(viewData,c("data","projects"))  
                )

              #
              # Get additional editors from members
              #
              members <- reactTableUsers()$members
              #projectData <- mxDbGetProjectData(project)
              #members <- unique(projectData$members)
              #members <- members[is.numeric(members)]
              #members <- mxDbGetEmailListFromId(members
              #, asNamedList=TRUE
              #, munged=TRUE
              #)

              #
              # Create named lists for editors and members
              #
              targetNamesEditors <- c(d("group_project",language,web=F),d("members",language,web=F))
              targetNamesReaders <- c(d("group_project",language,web=F))
              viewReadTarget <- list(Groups=d(viewReadTarget,language,namedVector=T))
              viewEditTarget <- list(Groups=d(viewEditTarget,language,namedVector=T),Users=members)
              names(viewReadTarget) <- targetNamesReaders
              names(viewEditTarget) <- targetNamesEditors

              #
              # Specific ui for each type (sm,vt,rt). Default empty ;        
              #
              uiType <- tags$div();

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
                # Country of the view ?
                # 
                #                selectizeInput(
                #inputId="selViewProjectUpdate",
                #label=d("view_project",language),
                #choices=projectsList,
                #selected=.get(viewData,c("project")),
                #multiple=FALSE,
                #options=list(
                #sortField="label"
                #)
                #),
                #
                # Projects of the view ?
                #
                selectizeInput(
                  inputId="selViewProjectsUpdate",
                  label=d("view_projects",language),
                  choices = projectsList,
                  selected = .get(viewData,c("data","projects")),
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
                  inputId="selViewReadersUpdate",
                  label=d("view_target_readers",language),
                  choices=viewReadTarget,
                  selected=viewReaders,
                  multiple=TRUE,
                  options=list(
                    sortField = "label",
                    plugins = list("remove_button")
                    )
                  ),
                selectizeInput(
                  inputId="selViewEditorsUpdate",
                  label=d("view_target_editors",language),
                  choices=viewEditTarget,
                  selected=viewEditors,
                  multiple=TRUE,
                  options=list(
                    sortField = "label",
                    plugins = list("remove_button")
                    )
                  ),
                #
                # Classes
                #
                selectizeInput(
                  inputId="selViewClassesUpdate",
                  label=d("view_classes",language),
                  choices=d(classesTags,language,namedVector=T),
                  selected=classesCurrent,
                  multiple=TRUE,
                  options=list(
                    sortField = "label",
                    plugins = list("remove_button")
                    )
                  ),
                #
                # Collections
                #
                selectizeInput(
                  inputId="selViewCollectionsUpdate",
                  label=d("view_collections",language),
                  choices=collectionsTags,
                  selected=collectionsCurrent,
                  multiple=TRUE,
                  options=list(
                    create = userRole$publisher,
                    sortField = "label",
                    plugins = list("remove_button")
                    )
                  )
                )

              #
              # vector tile specific
              #
              if(viewType=="vt"){

                srcAvailable <- reactListReadSources()
                srcSet <- .get(viewData,c("data","source","layerInfo","name"))
                srcSetMask <- .get(viewData,c("data","source","layerInfo","maskName"))
                srcAvailableMask <- srcAvailable[! srcAvailable %in% srcSet ]
                hasSource <- srcSet %in% srcAvailable
                reactData$sourceLayerFromView <- list(
                  trigger = Sys.time(),
                  srcSet = srcSet,
                  srcSetMask = srcSetMask
                  )

                if( !noDataCheck(srcSet) && !hasSource ){

                  names( srcSet ) <- mxGetTitleFromSourceID(
                    id = srcSet,
                    language = language
                    )

                  srcAvailable <- c(srcSet,srcAvailable)

                }

                uiType <- tagList(
                  #
                  # main layer
                  #
                  selectizeInput(
                    inputId = "selectSourceLayerMain",
                    label = d("source_select_layer",language),
                    choices = srcAvailable,
                    selected = NULL,
                    options=list(
                      sortField = "label"
                      )
                    ),
                  tagList(
                    selectizeInput(
                      inputId="selectSourceLayerMainGeom",
                      label=d("source_select_geometry",language),
                      choices=NULL,
                      selected=NULL
                      ),
                    selectizeInput(
                      inputId="selectSourceLayerMainVariable",
                      label=d("source_select_variable",language),
                      choices=NULL,
                      selected=NULL
                      ),
                    selectizeInput(
                      inputId="selectSourceLayerOtherVariables",
                      label=d("source_select_variable_alt",language),
                      choices=NULL,
                      selected=NULL,
                      multiple=TRUE,
                      options=list(
                        plugins = list("remove_button")
                        )
                      ),
                    actionButton(
                      inputId = "btnGetLayerSummary",
                      label = d("btn_get_layer_summary",language)
                      )
                    ),
                  #uiOutput("uiViewEditVtMain"),


                  #
                  # mask / overlap layer
                  #
                  checkboxInput(
                    inputId = "checkAddMaskLayer",
                    label =  d("view_add_overlap_layer",language),
                    value = !noDataCheck(srcSetMask)
                    ),
                  conditionalPanel(
                    condition = "input.checkAddMaskLayer",
                    tagList(
                      selectizeInput(
                        inputId = "selectSourceLayerMask",
                        label =d("source_select_layer_mask",language),
                        choices = srcAvailableMask,
                        selected = NULL,
                        options=list(
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
              if(viewType=="rt"){
                url <- .get(viewData,c("data","source","tiles"))
                legend <- .get(viewData,c("data","source","legend"))
                urlMetadata <- .get(viewData,c("data","source","urlMetadata"))
                urlDownload <- .get(viewData,c("data","source","urlDownload"))

                if(noDataCheck(url)) url = list()
                url <-  unlist(url[1])

                uiType <- tagList(
                  selectizeInput(
                    inputId = "selectRasterTileSize",
                    label = d("source_raster_tile_size",language),
                    selected = .get(viewData,c("data","source","tileSize")),
                    choices = c(512,256)
                    ),
                  checkboxInput(
                    inputId = "checkShowWmsGenerator",
                    label = "Display WMS tools"
                    ),
                  conditionalPanel(condition="input.checkShowWmsGenerator == true",
                    tags$div(
                      class = "well",
                      tags$h3("WMS URL helper"),
                      tags$hr(),
                      tags$div(id="wmsGenerator")
                      )
                    ),
                  textAreaInput(
                    inputId = "textRasterTileUrl",
                    label = d("source_raster_tile_url",language),
                    value = url 
                    ),
                  textAreaInput(
                    inputId = "textRasterTileLegend",
                    label = d("source_raster_tile_legend",language),
                    value = legend 
                    ),
                  textAreaInput(
                    inputId = "textRasterTileUrlMetadata",
                    label = d("source_raster_tile_url_metadata",language),
                    value = urlMetadata
                    ),
                  textAreaInput(
                    inputId = "textRasterTileUrlDownload",
                    label = d("source_raster_tile_url_download",language),
                    value = urlDownload
                    )
                  )
              }

              #
              # ui title/ desc and type specific ui
              #
              uiOut = tagList(
                uiDesc,
                uiType,
                tags$div(style="height:300px")
                )
              #
              # Buttons 
              #
              btnList <- tagList(
                actionButton(
                  inputId="btnViewSave",
                  label=d("btn_save",language),
                  disabled="disabled",
                  `data-keep` = TRUE
                  )
                )

              #
              # Final edit modal panel
              #
              mxModal(
                id = "modalViewEdit",
                title = sprintf("%1$s : %2$s",d("view_edit_current",language,web=F),viewTitle),
                content = uiOut,
                buttons = btnList,
                addBackground = FALSE,
                textCloseButton= d("btn_close",language)
                )

              if(viewType=="rt"){
                #
                # Build wms generator
                #
                mxWmsBuildQueryUi(list(
                    services = .get(config,c("wms")),
                    selectorParent = '#wmsGenerator',
                    selectorTileInput = '#textRasterTileUrl',
                    selectorLegendInput = '#textRasterTileLegend',
                    selectorMetaInput = '#textRasterTileUrlMetadata'
                    ))
              }

            },
            "btn_opt_edit_custom_code" = {
 
              if(!viewIsEditable) return()
              if(viewType != "cc") return()

              btnList <- list(
                actionButton(
                  inputId="btnViewSaveCustomCode",
                  label=d("btn_save",language)
                  ),
                actionButton(
                  inputId="btnViewPreviewCustomCode",
                  label=d("btn_preview",language)
                  )
                )

              mxModal(
                id="modalViewEdit",
                title=sprintf(d('view_edit_custom_code_modal_title',language),viewTitle),
                addBackground=FALSE,
                content=tagList(
                  jedOutput(id="customCodeEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language)
                )

            },
            "btn_opt_edit_dashboard"={
 
              if(!viewIsEditable) return()
              if(viewType == "sm" || viewType == "gj" ) return()

              btnList <- list(
                actionButton(
                  inputId="btnViewSaveDashboard",
                  label=d("btn_save",language)
                  ),
                actionButton(
                  inputId="btnViewPreviewDashboard",
                  label=d("btn_preview",language)
                  )
                )

              mxModal(
                id="modalViewEdit",
                title=sprintf(d('view_edit_dashboard_modal_title',language),viewTitle),
                addBackground=FALSE,
                content=tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="dashboardEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language)
                )
            },
            "btn_opt_edit_story"={
 
              if(!viewIsEditable) return()
              if(viewType != "sm") return()

              ##
              ## First, get latest stored version of the story, if any.
              ##
              #mglGetLocalForageData(
                #idStore = "stories",
                #idInput = "localStory",
                #idKey = viewId
                #)

              btnList <- list(
                actionButton(
                  inputId="btnViewSaveStory",
                  label=d("btn_save",language),
                  `data-keep` = TRUE
                  ),
                 actionButton(
                  inputId="btnViewPreviewStory",
                  label=d("btn_preview",language),
                  `data-keep` = TRUE
                  )
                 #actionButton(
                  #inputId="btnViewStoryCancel",
                  #label=d("btn_close",language),
                  #`data-keep` = TRUE
                  #)
                )
 
              tips <- mxFold(
                 content = HTML(d('schema_story_tips',language)),
                 labelText = d('schema_story_tips_title',language),
                 labelDictKey = 'schema_story_tips_title',
                 open = FALSE
                )
              mxModal(
                id = "modalViewEdit",
                title = sprintf(d("view_edit_story_modal_title",language),viewTitle),
                addBackground = FALSE,
                content = tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="storyEdit"),
                  tips
                  ),
                buttons = btnList,
                textCloseButton=d("btn_close",language)
                #removeCloseButton = T
                )
            },
            "btn_opt_edit_style"={

              if(!viewIsEditable) return()
              if(viewType != "vt") return()

              btnList <- list(
                actionButton(
                  inputId="btnViewSaveStyle",
                  label=d("btn_save",language)
                  ),
                actionButton(
                  inputId="btnViewPreviewStyle",
                  label=d("btn_preview",language)
                  )
                )

              mxModal(
                id="modalViewEdit",
                title = sprintf(d("view_edit_style_modal_title",language),viewTitle),
                addBackground=FALSE,
                content=tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="styleEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language)
                )

            })
        }
      })
    }
})
})

observeEvent(input$viewTitleSchema_init,{
  view = reactData$viewDataEdited
  language = reactData$language
  languages = .get(config,c("languages","codes"))
  titles = .get(view,c("data","title"))
  schema =  mxSchemaMultiLingualInput(
    keyTitle = "view_title",
    format = "text",
    default = titles,
    language = language,
    languagesRequired = c("en"),
    languagesHidden = languages[!languages %in% language]
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

observeEvent(input$viewAbstractSchema_init,{
  view = reactData$viewDataEdited
  language = reactData$language
  languages = .get(config,c("languages","codes"))
  abstracts = .get(view,c("data","abstract"))
  schema =  mxSchemaMultiLingualInput(
    keyTitle = "view_abstract",
    format = "textarea",
    default = abstracts,
    language = language,
    languagesRequired = c("en"),
    languagesHidden = languages[!languages %in% language]
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


#
# View removal
#
observeEvent(input$btnViewDeleteConfirm,{

  idView <- .get(reactData$viewDataEdited, c("id")) 

  if(noDataCheck(idView)) mxDebugMsg("View to delete not found")

  #
  # Update geoserver publication
  #
  mxPublishGeoServerViewAuto(idView, publish = FALSE)

  #
  # Remove all views rows
  #
  mxDbGetQuery(sprintf("
      DELETE FROM %1$s 
      WHERE id='%2$s'",
      .get(config,c("pg","tables","views")),
      idView
      ))

  #
  # Remove client view
  #
  mglRemoveView(
    idView = idView
    )


  #
  # Close modal window
  #
  mxModal(
    id="modalViewEdit",
    close=TRUE
    )
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

  hasView <- !noDataCheck(view)
  hasInvalidLayer <- TRUE


  if( hasView ){

    isVectorTile <- isTRUE(.get(view,c("type")) == "vt") 

    #
    # Vector layer error
    #
    if( isVectorTile ){
    layer <- input$selectSourceLayerMain
    errors <- c(
        noDataCheck(layer),
        !layer %in% reactListReadSources()
      )
    }


   
    #
    # Other input check
    #
    titleValues <- input$viewTitleSchema_values
    titleIssues <- input$viewTitleSchema_issues
    abstractValues <- input$viewAbstractSchema_values
    abstractIssues <- input$viewAbstractSchema_issues

    hasNoSchemaTitle <- noDataCheck( .get(titleValues, c("data","en")) )
    hasNoSchemaAbstract <- noDataCheck( .get(abstractValues, c("data","en")) )
    hasTitleIssues <- !noDataCheck( .get(titleIssues, c("data")) )
    hasAbstractIssues <- !noDataCheck( .get(abstractIssues, c("data")) )

    errors <- c(
      errors,
      hasTitleIssues,
      hasAbstractIssues,
      hasNoSchemaTitle,
      hasNoSchemaAbstract
      )

    disabled =  any(sapply(errors,isTRUE))

    mxToggleButton(
      id="btnViewSave",
      disable = disabled
      )

  }
})



#
# View vt, rt, sm : save
#
observeEvent(input$btnViewSave,{

  mxCatch("Save view",{
    mxToggleButton(
      id="btnViewSave",
      disable = TRUE
      )
    #
    # Retrieve view value
    #
    time <- Sys.time()
    view <- reactData$viewDataEdited 
    idView <- .get(view,c("id"))
    project <- reactData$project
    userData <- reactUser$data
    language <- reactData$language
    hideView <- FALSE # remove view from ui after save

    #
    # check for edit right, remove temporary edit mark
    #
    if(!isTRUE(view[["_edit"]])) return()
    view[["_edit"]] <- NULL

    #
    # Update target
    #
    readers <- input$selViewReadersUpdate
    editors <- input$selViewEditorsUpdate

    #
    # Update project
    #
    projectsUpdate = input$selViewProjectsUpdate
    if(noDataCheck(projectsUpdate)) projectsUpdate = list()
    projects = as.list(projectsUpdate)
    editor = reactUser$data$id

    view[[c("editor")]] <- editor
    view[[c("data","projects")]] <- projects
    #view[[c("project")]] <- project

    if(noDataCheck(editors)) editors <- c(as.character(editor))
    if(!isTRUE( as.character(editor) %in% editors )) editors <- c(editors,as.character(editor))

    #
    # Update classes
    #
    classes <- input$selViewClassesUpdate
    if(noDataCheck(classes)) classes <- config[[c("views","classes")]][[1]]
    view[[c("data","classes")]] <- as.list(classes)

    #
    # Update collections
    #
    collections <- input$selViewCollectionsUpdate
    view[[c("data","collections")]] <- as.list(collections)
    hideView <- !noDataCheck(query$collections) && !any( collections %in% query$collections )
    #
    # Title and description
    #
    view[[c("data","title")]] <- input$viewTitleSchema_values$data
    view[[c("data","abstract")]] <- input$viewAbstractSchema_values$data

    #
    # Update first level values
    #
    view[["data"]] <- as.list(view$data)
    view[["date_modified"]] <- time
    view[[c("readers")]] <- as.list(readers)
    view[[c("editors")]] <- as.list(editors)
    view[[c("target")]] <- NULL
    #
    # vector tiles
    #
    if( view[["type"]] == "vt" ){
      #
      # Get reactive data source summary
      #
      sourceData <- reactLayerSummary()$list
      sourceDataMask <- reactLayerMaskSummary()$list
      additionalAttributes <- input$selectSourceLayerOtherVariables
      isPublishable <- "public" %in% readers

      #
      # Update view data 
      #
      view <- mxUpdateDefViewVt(view, sourceData, sourceDataMask, additionalAttributes)

      #
      # Update geoserver publication
      #
      mxPublishGeoServerViewAuto(idView, publish = isPublishable)
      
    }
    #
    # raster tiles
    # 
    if( view[["type"]] == "rt" ){
      #
      # Update view  NOTE: write a function like in vt type
      #
      view[[c("data","source")]] <- list(
        type = "raster",
        tiles =  rep(input$textRasterTileUrl,2),
        legend = input$textRasterTileLegend,
        urlMetadata = input$textRasterTileUrlMetadata,
        urlDownload = input$textRasterTileUrlDownload,
        tileSize = as.integer(input$selectRasterTileSize)
        )

    }

    #
    # save a version in db
    #
    mxDbAddRow(
      data=view,
      table=.get(config,c("pg","tables","views"))
      )

    # edit flag
    view$`_edit` = TRUE 

    if(!hideView){
      # edit flag
      view$`_edit` = TRUE 

      mglAddView(
        viewData = view
        )
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
      text = sprintf("Saved at %s",format(time,'%H:%M'))
      )
    mxToggleButton(
      id="btnViewSave",
      disable = FALSE
      )
      })
})

#
# Select layer logic : geomType, and variable name
#
observe({
  src = reactData$sourceLayerFromView
  isolate({
    updateSelectizeInput(session,"selectSourceLayerMain",
      selected = src$srcSet
      )
    updateSelectizeInput(session,"selectSourceLayerMask",
      selected = src$srcSetMask
      )
  })
})
observe({

  layerMain <- input$selectSourceLayerMain
  if(noDataCheck(layerMain)){
    return()
  }
  timer <- mxTimeDiff("Layer properties timing ")
  #
  # In case of of reopening same view, this oberver is not
  # invalidated. Meaning properties not updated
  # Using init from viewTitleSchema_init make sure to invalidate 
  # this. 
  #
  update <- input$viewTitleSchema_init
  isolate({

    viewData <- reactData$viewDataEdited
    mxDebugMsg("Layer properties update")
    if(noDataCheck(viewData)) return()
    if(viewData$type != "vt") return()

    language <- reactData$language

    geomTypesDf <- mxDbGetLayerGeomTypes(layerMain)

    geomTypes <- mxSetNameGeomType(geomTypesDf,language)

    variables <- mxDbGetLayerColumnsNames(
      table = layerMain,
      notIn = c("geom","gid",'_mx_valid')
      )

    geomType <- .get(viewData,c("data","geometry","type"))
    variableName <- .get(viewData,c("data","attribute","name"))
    variableNames <- .get(viewData,c("data","attribute","names"))

    if(isTRUE(geomType %in% geomTypes)){
      geomTypeSelected <- geomType
    }else{
      geomTypeSelected <- geomTypes[[1]]
    }
    if(isTRUE(variableName %in% variables)){
      variableMainSelected <- variableName
    }else{
      variableMainSelected <- variables[[1]]
    }
    if(isTRUE(all(variableNames %in% variables))){
      variablesOtherSelected <- variableNames
    }else{
      variablesOtherSelected <- NULL
    }

    updateSelectizeInput(session,"selectSourceLayerMainGeom",
      choices = geomTypes,
      selected = geomTypeSelected
      )
    updateSelectizeInput(session,"selectSourceLayerMainVariable",
      choices = variables,
      selected = variableMainSelected
      )
    updateSelectizeInput(session,"selectSourceLayerOtherVariables",
      choices = variables,
      selected = variablesOtherSelected
      )
  })

  mxTimeDiff(timer)
})

#
# Main layer summary
#
observeEvent(input$btnGetLayerSummary,{
  mxModal(
    id =  "layerSummary",
    title = d("Layer Summary",reactData$language),
    content = tagList(
      tags$input(
        type="number",
        id="triggerBtnGetLayerSummary",
        class="form-control mx-hide",
        value=runif(1)
        ),
      tags$label("Summary"),
      uiOutput("uiLayerSummary")
      )
    )
})

output$uiLayerSummary <- renderUI({
  input$triggerBtnGetLayerSummary
  reactLayerSummary()$html
})




#
# Number of overlap indication
#
observe({

  layerMask <- input$selectSourceLayerMask
  layerMain <- input$selectSourceLayerMain 
  useMask <- isTRUE(input$checkAddMaskLayer)

  if(!useMask || noDataCheck(layerMain) || noDataCheck(layerMask) ) return()

  isolate({

    language <- reactData$language

    output$uiViewEditVtMask <- renderUI({
   
      numOverlapping = mxDbGetOverlapsCount(layerMain,layerMask)

      listToHtmlSimple(
        list(
          "view_num_overlap"=numOverlapping
          ),
        lang=language
        )
    })

  })
})


observe({

  out <- list()
  layerMask <- NULL

  layer <- input$selectSourceLayerMain
  hasLayer <- !noDataCheck(layer)
  useMask <- isTRUE(input$checkAddMaskLayer)

  isolate({

    if( hasLayer && useMask ){
      language <- reactData$language
      layerMask <- input$selectSourceLayerMask
      layers <- reactListReadSources()
      layers <- layers[!layers %in% layer]

      if( length(layers) > 0 ){

        geomTypesCheck <- sapply(layers,
          function(x){
            #
            # Get geomtype for this layer
            #
            geomType <- mxDbGetLayerGeomTypes(x)$geom_type

            #
            # Not a point
            #
            geomOk <- isTRUE( geomType != "point" )
            return(geomOk)
          })

        #
        # Filter layer by geom
        #
        out <- layers[ geomTypesCheck ]

      }

    }


    updateSelectInput(
      session,
      "selectSourceLayerMask",
      choices = out,
      selected = layerMask
      )

  })
})


