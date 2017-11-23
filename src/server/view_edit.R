
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

        userData <- reactUser$data
        userRole <- getUserRole()
        language <- reactData$language
        country <- reactData$country

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
            project = country,
            read = userRole$read,
            edit = userRole$edit,
            userId = userData$id,
            language = language,
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
          viewTitle <- .get(viewData, c("data","title",language))
          if(noDataCheck(viewTitle)){
            viewTitle <- .get(viewData, c("data","title","en"))
          }

          #viewAbstract <- .get(viewData, c("data","abstract",language))

          #
          # Who can view this
          #
          targetGroups <- .get(userRole,c("publish"))
          targetCurrent <- .get(viewData,c("target"))

          #
          # View classes
          #
          classesTags <- .get(config,c("views","classes"))
          classesCurrent <- .get(viewData,c("data","classes"))

          #
          # View collection
          #
          collectionsTags <- mxDbGetDistinctCollectionsTags("mx_views")
          collectionsCurrent <- .get(viewData,c("data","collections"))


          #
          # Initial button list for the modal
          #
          btnList <- list()

          #
          # Switch through actions
          #
          switch(viewAction$action,
            "btn_opt_download"={

              formats <- .get(config,c("data","format"))              
              formatsNames <- sapply(formats,function(x){if(x$type=="vector"){return(x$name)}})
              fileName <- subPunct(viewTitle) + ".shp"

              uiOut <- tagList(
                selectizeInput("selectDownloadFormat",
                  label = d("download_select_format_vector",language),
                  choices = formatsNames,
                  multiple=FALSE,
                  options=list(
                    dropdownParent="body"
                    )
                  ),
                 textInput("txtDownloadFileName",
                   label = d("download_file_name",language),
                   value = fileName
                   )
                )

              btnList <- list(
                actionButton(
                  inputId = "btnSourceDownload",
                  label = d("btn_confirm",language),
                  disabled = TRUE
                  )
                )

              mxModal(
                id = "modalViewEdit",
                title = tags$b(viewTitle),
                content = uiOut,
                textCloseButton = d("btn_close",language),
                buttons = btnList
                )


            },
            "btn_opt_meta"={

              viewLayerName  <- .get(viewData, c("data","source","layerInfo","name"))
              layerMeta <- mxDbGetLayerMeta(viewLayerName)

              ## add key to the list : the actual layer name
              layerMeta$db <- list(id = viewLayerName)
              
              uiOut<-tagList(
                  listToHtmlSimple(
                    list("source_meta_data"=layerMeta),
                    lang=language
                    )
                )

              mxModal(
                  id="modalViewEdit",
                  title=tags$b(viewTitle),
                  content=uiOut,
                  textCloseButton=d("btn_close",language)
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
                selectizeInput(
                  inputId="selViewCountryUpdate",
                  label=d("view_country",language),
                  choices=d(config$countries$codes$id,language),
                  selected=.get(viewData,c("country")),
                  multiple=FALSE,
                  options=list(
                    sortField="label",
                    dropdownParent="body"
                    )
                  ),
                #
                # Countries of the view ?
                #
                selectizeInput(
                  inputId="selViewCountriesUpdate",
                  label=d("view_countries",language),
                  choices=d(c(config$countries$codes$id,"GLB"),language),
                  selected=.get(viewData,c("data","countries")),
                  multiple=TRUE,
                  options=list(
                    sortField="label",
                    dropdownParent="body"
                    )
                  ),         
                #
                # Who can see this ?
                #
                selectizeInput(
                  inputId="selViewTargetUpdate",
                  label=d("view_target",language),
                  choices=d(targetGroups,language),
                  selected=targetCurrent,
                  multiple=TRUE,
                  options=list(
                    dropdownParent="body"
                    )
                  ),
                #
                # Classes
                #
                selectizeInput(
                  inputId="selViewClassesUpdate",
                  label=d("view_classes",language),
                  choices=d(classesTags,language),
                  selected=classesCurrent,
                  multiple=TRUE,
                  options=list(
                    dropdownParent="body"
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
                    dropdownParent="body",
                    create = TRUE
                    )
                  )
                )

              #
              # vector tile specific
              #
              if(viewType=="vt"){

                uiType <- tagList(
                  #
                  # main layer
                  #
                  selectizeInput(
                    inputId = "selectSourceLayerMain",
                    label = d("source_select_layer",language),
                    choices = reactSourceLayer(),
                    selected = .get(viewData,c("data","source","layerInfo","name")),
                    options=list(
                      dropdownParent="body"
                      )
                    ),

                  uiOutput("uiViewEditVtMain"),

                  #
                  # mask / overlap layer
                  #
                  checkboxInput(
                    inputId = "checkAddMaskLayer",
                    label =  d("view_add_overlap_layer",language),
                    value = !noDataCheck(.get(viewData,c("data","source","layerInfo","maskName")))
                    ),
                  conditionalPanel(
                    condition = "input.checkAddMaskLayer",
                     tagList(
                      selectizeInput(
                        inputId = "selectSourceLayerMask",
                        label =d("source_select_layer_mask",language),
                        choices = list(),
                        selected = .get(viewData,c("data","source","layerInfo","maskName")),
                        options=list(
                          dropdownParent="body"
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
                    choices = c(512,256),
                    options=list(
                      dropdownParent="body"
                      )
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
                            dropdownParent="body",
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
                                dropdownParent="body",
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
                uiType
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
                  )
                )

              mxModal(
                id="modalViewEdit",
                title=sprintf("Edit dashboard %s",viewTitle),
                addBackground=FALSE,
                content=tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="dashboardEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language),
                minHeight = "80%"
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
                  )
                )

              mxModal(
                id="modalViewEdit",
                title=sprintf("Edit story map %s",viewTitle),
                addBackground=FALSE,
                content=tagList(
                  uiOutput("txtValidSchema"),
                  jedOutput(id="storyEdit")
                  ),
                buttons=btnList,
                textCloseButton=d("btn_close",language),
                minHeight = "80%"
                )
            },
            "btn_opt_edit_style"={

              if(!viewIsEditable) return()
              if(viewType != "vt") return()

              btnList <- list(
                actionButton(
                  inputId="btnViewSaveStyle",
                  label=d("btn_save",language)
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



#
# Validation of download format
# 
observe({

  format <- input$selectDownloadFormat
  btnEnable <- FALSE

  isolate({

    if(!noDataCheck(format)){
      #
      # get values
      #
      ext <- ""
      language <- reactData$language
      viewData <- reactData$viewDataEdited
      viewTitle <- .get(viewData,c("data","title",language))
      idSource <- .get(viewData,c("data","source","layerInfo","name"))
      formats <- .get(config,c("data","format"))

      if(noDataCheck(viewTitle)){
        viewTitle <- .get(viewData,c("data","title","en"))
      }

      #
      # Update name
      #
      fileName <- input$txtDownloadFileName
      fileNameNoExt <- removeExtension(fileName)
      hasFileName <- !noDataCheck(fileNameNoExt)
      fileName <- ifelse(hasFileName,fileNameNoExt,subPunct(viewTitle))

      for(f in formats){
        if( f$name == format ){
          ext <- f$fileExt[[1]]
        }
      }

      fileName <- paste0(fileName,ext)

      updateTextInput(session,
        inputId="txtDownloadFileName",
        value=fileName
        )

      #
      # TESTS
      #
      fileNameNoExt <- removeExtension(fileName)
      hasFileName <- !noDataCheck(fileNameNoExt)
      hasViewData <- viewData$id %in% sapply(reactViewsCompact(),`[[`,"id")
      hasIdSource <- idSource %in% reactSourceLayer()
      hasFormat <- !noDataCheck(format)

      btnEnable <- all(hasFileName,hasViewData,hasIdSource,hasFormat)

    }

    #
    # Change the button state
    #
    mxToggleButton(
      id="btnSourceDownload",
      disable = !btnEnable
      )

  })


})

observeEvent(input$btnSourceDownload,{

  #
  # Get values
  # 
  viewData <- reactData$viewDataEdited
  format <- input$selectDownloadFormat
  emailUser <- reactUser$data$email
  emailAdmin <- .get(config,c("mail","admin"))
  idSource <- .get(viewData,c("data","source","layerInfo","name"))
  fileName <- input$txtDownloadFileName

  #
  # File name formating
  #
  fileNameNoExt <- removeExtension(fileName)
  hasFileName <- !noDataCheck(fileNameNoExt)
  fileName <- ifelse(hasFileName,fileNameNoExt,idSource)
  fileNameZip <- idSource + ".zip"
  formats <- .get(config,c("data","format"))
  ext <- ""

  for(f in formats){
    if( f$name == format ){
      ext <- f$fileExt[[1]]
    }
  }

  fileName <- paste0(fileName, ext)

  #
  # Session info to build url
  #
  cd <- session$clientData
  port <- ifelse(noDataCheck(cd$url_port),"", ":" + cd$url_port)
  url <- cd$url_protocol + "//" + cd$url_hostname + port + cd$url_pathname + "downloads/" + fileNameZip
  subject <-  "MAP-X DOWNLOAD " + fileName

  #
  # Mail handler
  #
  mailCmd <- function(message=NULL,filePathMessage=NULL,email){
    mxSendMail(
      from = .get(config,c("mail","bot")),
      to = email,
      body = message,
      type = "text",
      subject = subject,
      filePath = filePathMessage,
      wait = FALSE,
      getCommandOnly = TRUE
      )
  }

  #
  # Update select
  #

  mxModal(
    id="modalViewEdit",
    title="Command sent, email ahead",
    content=tagList(
      tags$p("An email will be sent to " + emailUser + " has soon as the data is available"),
      tags$p("Once done, the data will be available here :"),
      tags$p(
        style="max-width:100%; overflow-x:scroll;",
        tags$a(
          href=url,
          url
          )
        )
      )
    )


  #
  # Command to export source
  #
  mxDbExport(
    idTable = idSource,
    fileName = fileName,
    fileNameZip = fileNameZip,
    fromSrid = "4326",
    toSrid = "4326",
    formatOut = format,
    onStart = function(){

      mailCmd(
        message = "Extraction started; the file will be available here " + url,
        email = emailUser
        )
    },
    onEnd = function(){
      mailCmd(
        message =  "Extraction done; file available here " + url,
        email = emailUser
        )
    },
    onErrorClient = function(){
      mailCmd(
        message = "Extraction failed, sorry. An email has been sent to our team.",
        email = emailUser
        )
    },
    onErrorAdmin = function(filePathError){
      mailCmd(
        filePathMessage = filePathError,
        email = emailAdmin
        )
    }
    )

})

observeEvent(input$viewTitleSchema_init,{
  view = reactData$viewDataEdited
  language = reactData$language
  titles = .get(view,c("data","title"))
  schema =  mxSchemaMultiLingualInput(
    keyTitle = "view_title",
    format = "text",
    default = titles,
    language = language
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
  abstracts = .get(view,c("data","abstract"))
  schema =  mxSchemaMultiLingualInput(
    keyTitle = "view_abstract",
    format = "textarea",
    default = abstracts,
    language = language
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

  hasNoLayer <-  ! input$selectSourceLayerMain %in% reactSourceLayer()
  hasTitleIssues <- !noDataCheck( input$viewTitleSchema_issues$msg )
  hasAbstractIssues <- !noDataCheck( input$viewAbstractSchema_issues$msg )

  errors <- c(
     hasNoLayer,
     hasTitleIssues,
     hasAbstractIssues
    )

   mxToggleButton(
    id="btnViewSave",
    disable = any(errors)
    )

})



#
# View vt, rt, sm : save
#
observeEvent(input$btnViewSave,{

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
  country <- reactData$country
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
  target <- input$selViewTargetUpdate
  if(noDataCheck(target)) target = "self"
  view[[c("target")]] <- target


  #
  # Update country
  #
  countryUpdate = input$selViewCountryUpdate
  countriesUpdate = input$selViewCountriesUpdate
  if(noDataCheck(countryUpdate)) countryUpdate = country
  if(noDataCheck(countriesUpdate)) countriesUpdate = list()
  country = countryUpdate
  countries = as.list(countriesUpdate)
  editor = reactUser$data$id


  view[[c("editor")]] <- editor
  view[[c("data","countries")]] <- countries
  view[[c("country")]] <- country

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
  view[["target"]] <- as.list(view$target)
  view[["data"]] <- as.list(view$data)
  view[["date_modified"]] <- time

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
    view <- mxUpdateDefViewVt(view, sourceData, sourceDataMask,additionalAttributes)

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

  #
  # Trigger update
  #
  mglRemoveView(
    idView=view$id
    )

  # edit flag
  view$`_edit` = TRUE 


  if(!hideView){
    # add this as new (empty) source
    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = view,
      render = FALSE,
      country = country
      )
  }
  #
  # Trigger next reactViews call
  #
  reactData$updateViewListFetchOnly <- runif(1)

  #
  # Display info text
  #

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = sprintf("Saved at %s",time)
    )

  mxToggleButton(
    id="btnViewSave",
    disable = FALSE
    )
})

#
# Select layer logic : geomType, and variable name
#
observe({

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
      selected=geomType,
      options=list(
        dropdownParent="body"
        )
      ),
    selectizeInput(
      inputId="selectSourceLayerMainVariable",
      label=d("source_select_variable",language),
      choices=variables,
      selected=variableName,
      options=list(
        dropdownParent="body"
        )
      ),
  selectizeInput(
      inputId="selectSourceLayerOtherVariables",
      label=d("source_select_variable_alt",language),
      choices=variables,
      selected=variableNames,
      multiple=TRUE,
      options=list(
        dropdownParent="body"
        )
      ),
   actionButton(
     inputId = "btnGetLayerSummary",
     label = d("btn_get_layer_summary",language)
     )
    )
  })
  })
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

#
# List of variable
#
reactSourceVariables <- reactive({

  layerName <- input$selectSourceLayerMain
  hasLayer <- !noDataCheck(layerName)
  language <- reactData$language

  out <- "noVariable"
  names(out) <- d(out,language)

  if(hasLayer){
    isLayerOk <- isTRUE(layerName %in% reactSourceLayer())

    if(isLayerOk){
      outLocal <- mxDbGetLayerColumnsNames(layerName,notIn=c("geom","gid"))

      if(!noDataCheck(outLocal)) out <- outLocal
    }
  }
  return(out)
})

#
# List of layers
#
reactSourceLayer <- reactive({

  userRole <- getUserRole()
  userId <- .get(reactUser,c("data","id"))
  country <- reactData$country
  language <- reactData$language
  updateSourceLayer <- reactData$updateSourceLayerList

  ## non reactif
  userCanRead <- .get(userRole,c("read"))

   layers <-  mxDbGetLayerTable(
    project = country,
    userId = userId,
    target = userCanRead,
    language = language
    )

  if(noDataCheck(layers)){
    layers <- list("noLayer")
  }else{ 
    layers <- mxGetLayerNamedList( layers, language )
  }

  return(layers)

})


observe({

  useMask <- isTRUE(input$checkAddMaskLayer)
  layer <- input$selectSourceLayerMain
  out <- list()

  isolate({

    if(!noDataCheck(layer)){
      layers <- reactSourceLayer()
      layers <- layers[!layers %in% layer]

      if(length(layers)>0){

        geomTypesCheck <- sapply(layers,function(x){
          geomType <- mxDbGetLayerGeomTypes(x)$geom_type
          geomOk <- isTRUE( geomType != "point" )
          return(geomOk)
    })

        out <- layers[ geomTypesCheck ]

      }
    }

     updateSelectInput(
      session,
      "selectSourceLayerMask",
      choices = out
      )

  })
})


#
# reactLayerMaskSummary
#
reactLayerMaskSummary <- reactive({

  out <- list()
  out$list <- list()

  useMask <- input$checkAddMaskLayer
  layerMaskName <- input$selectSourceLayerMask
  isLayerOk <- isTRUE(layerMaskName %in% reactSourceLayer())

  if(useMask && isLayerOk){
    out$list$layerMaskName <- layerMaskName
    out$list$useMask <- useMask
  }

  return(out)

})

#
# reactLayerSummary
#

reactLayerSummary <- reactive({

  layerName <- input$selectSourceLayerMain
  geomType <- input$selectSourceLayerMainGeom
  variableName <- input$selectSourceLayerMainVariable
  language <- reactData$language

  hasVariable <- !noDataCheck(variableName)
  hasLayer <- !noDataCheck(layerName)

  out <- list()

  out$html <- tags$div()
  out$list <- list()

  if(hasVariable && hasLayer){

    geomTypes <- mxDbGetLayerGeomTypes(layerName)
    isVariableOk <- isTRUE(variableName %in% reactSourceVariables())
    isLayerOk <- isTRUE(layerName %in% reactSourceLayer())
    isGeomOk <- isTRUE(geomType %in% geomTypes$geom_type)

    if(isLayerOk && isGeomOk && isVariableOk){
      #
      # Get layer summary
      #
      out <- mxDbGetLayerSummary(
        layer = layerName,
        variable = variableName,
        geomType = geomType,
        language = language
        )
    }
  }

  return(out)
})



