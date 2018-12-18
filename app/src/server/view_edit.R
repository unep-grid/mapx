
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

        if(viewAction[["action"]] == "btn_upload_geojson" ){

          #
          # Section to remove
          #

        }else{

          #
          # Get view data and check if user can edit
          #
         
          viewId <- viewAction[["target"]]

          viewData <-  mxDbGetViews(
            views = viewId, 
            project = project,
            rolesInProject = userRole,
            idUser = userData$id,
            language = language,
            editMode = TRUE
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
            "btn_opt_meta"={

              #
              # Get layer name 
              #
              viewLayerName  <- .get(viewData, c("data","source","layerInfo","name"))
              layerMeta <- mxDbGetLayerMeta(viewLayerName)
              idSource <- toupper(viewLayerName)
              idView <- toupper(viewData$id)
              viewLayerMaskName  <- .get(viewData, c("data","source","layerInfo","maskName"))
              dateCreated <- mxDbGetQuery("SELECT date_modified from mx_views where id = '" + idView + "' ORDER BY date_modified ASC LIMIT 1 ")$date_modified
              dateModified <- viewData$date_modified
              numberUpdate <- mxDbGetQuery("SELECT count(pid) from mx_views where id = '" + idView +"'")$count
              idUsers <- mxDbGetQuery("SELECT distinct(editor) as id from (SELECT editor from mx_views WHERE id = '" + idView +"' ORDER BY date_modified DESC) as b")$id
              idUser <- viewData$editor
              emailUsers <- mxDbGetEmailListFromId(idUsers)
              emailUser <-mxDbGetEmailListFromId(idUser)
              srcTitle <- .get(layerMeta,c("text","title",language))
              if(noDataCheck(srcTitle)) srcTitle <- .get(layerMeta,c("text","title","en"))
              homepage <- tags$a(target="_blank",href=.get(layerMeta,c("origin","homepage","url")),srcTitle) 
            
              dateSourceRangeStart <- .get(layerMeta,c("temporal","range","start_at"))
              dateSourceRangeEnd <- .get(layerMeta,c("temporal","range","end_at"))

              dateModified <- format(as.Date(dateModified),"%a %d %B %Y")
              dateCreated <- format(as.Date(dateCreated),"%a %d %B %Y")

              integrityData <- .get(layerMeta,c("integrity"))
              integrityScore <- round(((sum(as.numeric(unlist(integrityData)))/(3*16))*100),1)

              project <- .get(viewData,c("project"))
              projects <- .get(viewData,c("data","projects"))
              target <- .get(viewData,c("target"))

              subsetMeta <- list(
                meta_last_editor_id=emailUser,
                #meta_all_editor_id=paste(emailUsers,collapse=", "),
                meta_number_changes=numberUpdate,
                meta_view_title=viewTitle,
                meta_view_id=idView,
                meta_date_modified=dateModified,
                meta_date_created=dateCreated,
                meta_target_roles=paste(target,collapse=","),
                meta_view_project=project,
                meta_view_projects=paste(projects,collapse=","),
                meta_source_title=mxDbGetLayerTitle(idSource,language),
                meta_source_id=tolower(idSource),
                meta_source_homepage=homepage,
                meta_source_integrity_score=integrityScore + "%",
                meta_source_time_range = list(
                   meta_source_time_range_min = dateSourceRangeStart,
                   meta_source_time_range_max =dateSourceRangeEnd
                  )
                )

              meta <- list(
                source_meta_data = layerMeta
                )
              
              dictSchema =  .get(config,c("dictionaries","schemaMetadata"))

              uiOut <- tagList(
                tags$h4(d("meta_display_view_title",lang=language,dict=dictSchema)),
                listToHtmlSimple(
                  listInput = subsetMeta,
                  lang = language,
                  useFold = FALSE,
                  unboxText = FALSE,
                  dict = dictSchema
                  ),
                tags$h4(d("meta_display_source_title",lang=language,dict=dictSchema)),
                listToHtmlSimple(
                  listInput = meta,
                  lang = language,
                  useFold = TRUE,
                  unboxText = TRUE,
                  dict = dictSchema,
                  valReplace = function(val,dict=dictSchema){
                    if( val %in% c("0","1","2","3")){
                      val = switch(val,
                        "0" = dd('dont_know',dict,language),
                        "1" = dd('no',dict,language),
                        "2" = dd('partial',dict,language),
                        "3" = dd('yes',dict,language)
                        )
                    }
                    return(val)
                  }
                  )
                )
             
              if(viewLayerName %in% reactListEditSources()){
                btnList <- list(
                  actionButton(
                    inputId="btnViewEditMetadata",
                    label=d("btn_edit_source_metadata",language)
                    )
                  )
              }else{
                btnList <- NULL 
              }
              
              mxModal(
                id="modalViewEdit",
                title=tags$b(viewTitle),
                content=uiOut,
                textCloseButton=d("btn_close",language),
                buttons = btnList
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
                title=tags$b(sprintf("Delete %s",viewTitle)),
                content=uiOut,
                textCloseButton=d("btn_close",language),
                buttons=btnList,
                minHeight="200px"
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
              projectData <- mxDbGetProjectData(project)
              members <- unique(projectData$members)
              members <- members[is.numeric(members)]
              members <- mxDbGetEmailListFromId(members
                , asNamedList=TRUE
                , munged=TRUE
                )

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
                    selected = srcSet,
                    options=list(
                      sortField = "label"
                      )
                    ),

                  uiOutput("uiViewEditVtMain"),

                
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
                        selected = srcSetMask,
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
                if(noDataCheck(url)) url = list()
                url <-  unlist(url[1])

                uiType <- tagList(
                  selectizeInput(
                    inputId = "selectRasterTileSize",
                    label = d("source_raster_tile_size",language),
                    selected = .get(viewData,c("data","source","tileSize")),
                    choices = c(512,256)
                    ),
                  mxFold(
                    labelText="WMS generator",
                    classContainer="fold-container well",
                    content = tagList(
                      tags$label("Select a predefined service"),
                      tags$select(
                        type = "select",
                        id = "selectWmsService",
                        class = "form-control"
                        ), 
                      tags$script(
                        `data-for`="selectWmsService",
                        jsonlite::toJSON(list(
                            options=config$wms,
                            valueField = 'value',
                            labelField = 'label'
                            ),auto_unbox=T)
                        ),
                      tagList(
                        tags$label("WMS service url"),
                        tags$div(
                          class="input-group",
                          tags$input(
                            type="text",
                            id = "textWmsService",
                            class= "form-control"
                            ),
                          tags$span(
                            class="input-group-btn",
                            tags$button(
                              id="btnFetchLayers",
                              type="button",
                              class="form-control btn btn-default action-button",
                              disabled=TRUE,
                              "Get layers"
                              )
                            )
                          )
                        ),
                      tagList(
                        tags$label("Layers"),
                        tags$div(
                          class="input-group",
                          tags$select(
                            type="select",
                            id = "selectWmsLayer",
                            class= "form-control"
                            ),
                          tags$script(
                            `data-for`="selectWmsLayer",
                            jsonlite::toJSON(list(
                                options=list(),
                                valueField = 'value',
                                labelField = 'label'
                                ),auto_unbox=T)
                            ),
                          tags$span(
                            class="input-group-btn",
                            tags$button(
                              id="btnUptateTileUrl",
                              type="button",
                              class="form-control btn btn-default action-button",
                              disabled=TRUE,
                              "Generate tiles url"
                              )
                            )
                          )
                        )
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
                textCloseButton= d("btn_close",language),
                minHeight = "80%"
                )

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
                title=sprintf("Edit custom code for %s",viewTitle),
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
              if(viewType != "vt") return()

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
                minWidth="785px",
                title=sprintf("Edit dashboard %s",viewTitle),
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

              #
              # First, get latest stored version of the story, if any.
              #
              mglGetLocalForageData(
                idStore = "stories",
                idInput = "localStory",
                idKey = viewId
                )

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
                  ),
                 actionButton(
                  inputId="btnViewStoryCancel",
                  label=d("btn_close",language),
                  `data-keep` = TRUE
                  )
                )

              mxModal(
                id = "modalViewEdit",
                title = sprintf("Edit story map %s",viewTitle),
                addBackground = FALSE,
                content = tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="storyEdit")
                  ),
                buttons = btnList,
                removeCloseButton = T
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
                title=sprintf("Edit style %s",viewTitle),
                addBackground=FALSE,
                content=tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="styleEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language),
                minHeight = "80%"
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
  languages = .get(config,c("languages","list"))
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
    id="viewTitleSchema",
    schema=schema,
    startVal=titles
    )
})

observeEvent(input$viewAbstractSchema_init,{
  view = reactData$viewDataEdited
  language = reactData$language
  languages = .get(config,c("languages","list"))
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
    id="viewAbstractSchema",
    schema=schema,
    startVal=abstracts
    )
})


#
# View removal
#
observeEvent(input$btnViewDeleteConfirm,{

  id <- .get(reactData$viewDataEdited, c("id")) 

  if(noDataCheck(id)) mxDebugMsg("View to delete not found")

  mxDbGetQuery(sprintf("
      DELETE FROM %1$s 
      WHERE id='%2$s'",
      .get(config,c("pg","tables","views")),
      id
      ))

  mglRemoveView(
    idView = id
    )

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
    hasNoSchemaTitle <- noDataCheck( input$viewTitleSchema_values )
    hasNoSchemaAbstract <- noDataCheck( input$viewAbstractSchema_values )
    hasTitleIssues <- !noDataCheck( input$viewTitleSchema_issues$msg )
    hasAbstractIssues <- !noDataCheck( input$viewAbstractSchema_issues$msg )

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
    #projectUpdate = input$selViewProjectUpdate
    projectsUpdate = input$selViewProjectsUpdate
    #if(noDataCheck(projectUpdate)) projectUpdate = project
    if(noDataCheck(projectsUpdate)) projectsUpdate = list()
    #project = projectUpdate
    projects = as.list(projectsUpdate)
    editor = reactUser$data$id

    view[[c("editor")]] <- editor
    view[[c("data","projects")]] <- projects
    #view[[c("project")]] <- project

    if(noDataCheck(editors)) editors <- c((editor+""))
    if(!isTRUE( (editor+"") %in% editors)) editors <- c(editors+"",editor)

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
    view[[c("data","title")]] <- input$viewTitleSchema_values$msg
    view[[c("data","abstract")]] <- input$viewAbstractSchema_values$msg

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

      #
      # Update view data 
      #
      view <- mxUpdateDefViewVt(view, sourceData, sourceDataMask, additionalAttributes)

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

  timer <- mxTimeDiff("Layer logic")
  layerMain <- input$selectSourceLayerMain
  viewData <- reactData$viewDataEdited


  isolate({

    if(noDataCheck(layerMain)) return()
    if(noDataCheck(viewData)) return()
    if(viewData$type != "vt") return()

    language <- reactData$language

    geomTypesDf <- mxDbGetLayerGeomTypes(layerMain)

    geomTypes <- mxSetNameGeomType(geomTypesDf,language)

    variables <- mxDbGetLayerColumnsNames(
      table = layerMain,
      notIn = c("geom","gid")
      )

    geomType <- .get(viewData,c("data","geometry","type"))
    variableName <- .get(viewData,c("data","attribute","name"))
    variableNames <- .get(viewData,c("data","attribute","names"))

    output$uiViewEditVtMain <- renderUI({
      tagList(
        selectizeInput(
          inputId="selectSourceLayerMainGeom",
          label=d("source_select_geometry",language),
          choices=geomTypes,
          selected=geomType
          ),
        selectizeInput(
          inputId="selectSourceLayerMainVariable",
          label=d("source_select_variable",language),
          choices=variables,
          selected=variableName
          ),
        selectizeInput(
          inputId="selectSourceLayerOtherVariables",
          label=d("source_select_variable_alt",language),
          choices=variables,
          selected=variableNames,
          multiple=TRUE,
          options=list(
            plugins = list("remove_button")
            )
          ),
        actionButton(
          inputId = "btnGetLayerSummary",
          label = d("btn_get_layer_summary",language)
          )
        )
    })
  })

  mxTimeDiff(timer)
})

#
# Main layer summary
#
observeEvent(input$btnGetLayerSummary,{
  mxModal(
    id =  "layerSummary",
    minHeight = "80%",
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


