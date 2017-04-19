



#
# View action handler
#
observe({
  mxCatch("view_edit.R",{
    #
    # Extract action type
    #
    viewAction <- input[[sprintf("mglEvent_%1$s_view_action",config[["map"]][["id"]])]]

    if(!noDataCheck(viewAction)){

      isolate({

        language <- reactData$language

        if(viewAction[["action"]] == "btn_opt_upload_geojson" ){

        }else{

          #
          # Get view data and check if user can edit
          #
          views <- reactViews()
          viewId <- viewAction[["target"]]

          viewData <- views[ sapply( views, function(x){
            x[["id"]] == viewId
}) ][[1]]


          if(noDataCheck(viewData)) return()
          
          viewIsEditable <- isTRUE(.get(viewData,c("_edit")))
          
          #
          # Get title and descrition in current language
          #

          viewType <- viewData[["type"]]

          viewTitle <- .get(viewData, c("data","title",language))
          viewAbstract <- .get(viewData, c("data","abstract",language))

          #
          # User publish right
          #
          targetGroups <- reactUser$role[[c("publish")]]
          targetCurrent <- viewData[["target"]]

          #
          # View classes
          #
          classesTags <- config[[c("views","classes")]]
          classesCurrent <- viewData[[c("data","classes")]]

          #
          # Create a list with other languages titles and description
          #
          viewTitleAll <- lapply(
            config[[c("languages","list")]], function(x){
              .get(viewData,c("data","title",x))
            })

          viewAbstractAll <- lapply(
            config[["languages"]][["list"]], function(x){
              .get(viewData, c("data","abstract",x))
            })

          #
          # Keep a version of the view edited
          #
          reactData$viewDataEdited <- viewData

          #
          # Initial button list
          #
          btnList <- list()

          #
          # Switch through actions
          #
          switch(viewAction$action,
            "btn_opt_download"={

              uiOut<-tagList(
                tags$h4(
                  tags$span(d("view_download_layer",language))
                  ),
                p("download layer",.get(viewData,c("data","source","layerInfo","name")))
                )

              output$panelModal <- renderUI(mxPanel(
                  id="uiViewMetaData",
                  headIcon="download",
                  subtitle=tags$b(viewTitle),
                  html=uiOut,
                  addCloseButton=TRUE,
                  closeButtonText=d("btn_close",language)
                  )
                )


            },
            "btn_opt_meta"={

              viewLayerName  <- .get(viewData, c("data","source","layerInfo","name"))
              layerMeta <- mxDbGetLayerMeta(viewLayerName)
              layerMeta$db <- list(id = viewLayerName)
              
              uiOut<-tagList(
                HTML(
                  listToHtmlClass(
                    listInput = layerMeta,
                    titleMain = d("source_meta_data",language)
                    )
                  )
                )

              output$panelModal <- renderUI(mxPanel(
                  id="uiViewMetaData",
                  headIcon="info-circle",
                  subtitle=tags$b(viewTitle),
                  html=uiOut,
                  addCloseButton=TRUE,
                  closeButtonText=d("btn_close",language)
                  )
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

              output$panelModal <- renderUI(mxPanel(
                  id="uiConfirmViewDelete",
                  headIcon="trash-o",
                  subtitle=tags$b(viewTitle),
                  html=uiOut,
                  addCloseButton=TRUE,
                  closeButtonText=d("btn_close",language),
                  listActionButton=btnList
                  ))


            },
            "btn_opt_edit_config"={

              if(!viewIsEditable) return()

              #}else{
              uiDesc <- tagList(
                #
                # Who can see this ?
                #
                selectInput(
                  inputId="selViewTargetUpdate",
                  label=d("view_target",language),
                  choices=d(targetGroups,language),
                  selected=targetCurrent,
                  multiple=TRUE
                  ),
                #
                # Classes
                #
                selectInput(
                  inputId="selViewClassesUpdate",
                  label=d("view_classes",language),
                  choices=d(classesTags,language),
                  selected=classesCurrent,
                  multiple=TRUE
                  ),
                #
                # Title view, always visible
                #
                textInput(
                  inputId="txtViewTitleUpdate",
                  label=d("view_title",language),
                  value=viewTitle
                  ),
                mxFold(
                  HTML(listToHtmlClass(
                      listInput = viewTitleAll,
                      titleMain = d("view_title",language))
                    ),
                  id =  "checkDisplayOtherTitles",
                  labelText = d("view_show_title_languages",language)
                  ),
                #
                # Main view abstract, always visible
                # 
                textAreaInput(
                  inputId="txtViewAbstractUpdate",
                  label=d("view_abstract",language),
                  value=viewAbstract
                  ),
                mxFold(
                  HTML(listToHtmlClass(
                      listInput = viewAbstractAll,
                      titleMain = d("view_abstract",language)
                      )
                    ),
                  id =  "checkDisplayOtherAbstract",
                  labelText = d("view_show_abstract_languages",language)
                  )
                )

              #
              # Stors map
              #
              if(viewType=="sm"){
                uiType =  tagList(
                  jedOutput(id="storyEdit")
                  )
              }


              #
              # vector tile specific
              #
              if(viewType=="vt"){
                uiType <- tagList(
                  #
                  # main layer
                  #
                  selectInput(
                    inputId = "selectSourceLayerMain",
                    label = d("source_select_layer",language),
                    choices = reactSourceLayer(),
                    selected = .get(viewData,c("data","source","layerInfo","name"))
                    ),
                  uiOutput("uiViewEditVtMain"),
                  #
                  # mask / overlap layer
                  #
                  mxFold(
                    tagList(
                      selectInput(
                        inputId = "selectSourceLayerMask",
                        label =d("source_select_layer_mask",language),
                        choices = reactSourceLayer(),
                        #choices = NULL,
                        selected = .get(viewData,c("data","source","layerInfo","maskName"))
                        #selected = NULL
                        ),         
                      uiOutput("uiViewEditVtMask")
                      ),
                    id =  "checkAddMaskLayer",
                    labelText = d("view_add_overlap_layer",language),
                    open = !noDataCheck(.get(viewData,c("data","source","layerInfo","maskName")))
                    )
                  )
              }
              #
              # raster tile specific
              #
              if(viewType=="rt"){
                url = .get(viewData,c("data","source","tiles"))
                if(noDataCheck(url)) url = list()

                uiType <- tagList(
                  textAreaInput(
                    inputId = "txtRasterTileUrl",
                    label = d("source_raster_tile_url",language),
                    value = ifelse(length(url)>0,url[[1]],"")
                    ),
                  selectInput(
                    inputId = "selectRasterTileSize",
                    label = d("source_raster_tile_size",language),
                    selected = .get(viewData,c("data","source","tileSize")),
                    choices = c(512,256)
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
              btnList <- list(
                actionButton(
                  inputId="btnViewUpdate",
                  label=d("btn_update",language)
                  )
                )
              #}

              #
              # Final edit modal panel
              #
              output$panelModal <- renderUI(mxPanel(
                  id="uiConfirmViewEdit",
                  headIcon="pencil",
                  subtitle=tags$b(id=sprintf("title_view_edit_panel"),viewTitle),
                  html=uiOut,
                  listActionButton=btnList,
                  addCloseButton=TRUE,
                  background=FALSE,
                  closeButtonText=d("btn_close",language)
                  ))

            },
            "btn_opt_edit_style"={

              if(!viewIsEditable) return()
              if(viewType != "vt") return()

              btnList <- list(
                actionButton(
                  inputId="btnViewUpdateStyle",
                  label=d("btn_update",language)
                  ),
                actionButton(
                  inputId="btnViewResetStyle",
                  label=d("btn_reset",language)
                  )
                )

              output$panelModal <- renderUI(
                mxPanel(
                  id="uiConfirmViewDelete",
                  headIcon="paint-brush",
                  subtitle=tags$b(id=sprintf("title_view_style_panel"),viewTitle),
                  background=FALSE,
                  html=tagList(
                    uiOutput("txtValidSchema"),
                    jedOutput(id="styleEdit")
                    ),
                  listActionButton=btnList,
                  addCloseButton=TRUE,
                  closeButtonText=d("btn_close",language)
                  ))

            })
        }
      })
    }
})
})


#
# View story : render schema
#
observeEvent(input$storyEdit_init,{

  view <- reactData$viewDataEdited

  if(!isTRUE(view[["_edit"]])) return()

  views <- reactViews()
  story <- view[[c("data","story")]]

  language <- reactData$language 

    schema <- mxSchemaViewStory(
      view=view,
      views=views,
      language=language
      )

    jedSchema(
      id="storyEdit",
      schema = schema,
      startVal = story
      )

})

#
# View vt style : render schema
#
observeEvent(input$styleEdit_init,{

  view <- reactData$viewDataEdited

  if(!isTRUE(.get(view,c("_edit")))) return()

  style <- .get(view,c("data","style"))
  language <- reactData$language 
  hasLayer <- !noDataCheck(.get(view,c("data","source","layerInfo","name")))
  hasSources <- !noDataCheck(reactSourceLayer())
  hasStyle <- !noDataCheck(style)

  if(!hasStyle) style = NULL
  if(!hasLayer || ! hasSources){

  errors <- logical(0)
  warnings <- logical(0)

    if(!hasLayer) warnings["error_no_layer"] <- TRUE
    if(!hasSources) errors["error_no_source"] <- TRUE
    
    output$txtValidSchema <- renderUI({
      mxErrorsToUi(
      errors=errors,
      warning=warnings,
      language=language
      )

    })

    if(length(errors)>0 || length(warnings) >0){
      mxToggleButton(
        id="btnViewUpdateStyle",
        disable=TRUE
        )
      mxToggleButton(
        id="btnViewResetStyle",
        disable=TRUE
        )
    }

  }else{


    schema <- mxSchemaViewStyle(
      view=view,
      language=language
      )


    jedSchema(
      id="styleEdit",
      schema = schema,
      startVal = style
      )
  }
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

})

#
# View vt, rt, sm : save
#
observeEvent(input$btnViewUpdate,{

  #
  # Retrieve view value
  #
  view <- reactData$viewDataEdited 
  country <- reactData$country
  userData <- reactUser$data
  idView <- view[["id"]]

  #
  # check for edit right
  #
  if(!isTRUE(view[["_edit"]])) return()
  view[["_edit"]] <- NULL

  #
  # language related stuff
  #
  #updateAllLanguages <- input$checkUpdateAllLanguages
  #languageList <- config[[c("languages","list")]]
  language <- reactData$language

  # Update title and text
  #if(!updateAllLanguages) languageList = language

  #
  # Update target
  #
  target <- input$selViewTargetUpdate
  if(noDataCheck(target)) target = "self"
  view[[c("target")]] <- target

  #
  # Update classes
  #
  classes <- input$selViewClassesUpdate
  if(noDataCheck(classes)) classes <- config[[c("views","classes")]][[1]]
  view[[c("data","classes")]] <- as.list(classes)

  #
  # Title an description
  #
  view[[c("data","title",language)]] <- input$txtViewTitleUpdate
  view[[c("data","abstract",language)]] <- input$txtViewAbstractUpdate

  #
  # Update first level values
  #
  view[["target"]] <- as.list(view$target)
  view[["data"]] <- as.list(view$data)
  view[["date_modified"]] <- Sys.time()

  #
  # vector tiles
  #
  if( view[["type"]] == "vt" ){
    #
    # Get reactive data source summary
    #
    sourceData <- reactLayerSummary()$list
    sourceDataMask <- reactLayerMaskSummary()$list
    
    #
    # Update view data 
    #
    
    view <- mxUpdateDefViewVt(view, sourceData, sourceDataMask)
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
      tiles =  rep(input$txtRasterTileUrl,2),
      tileSize = as.integer(input$selectRasterTileSize)
      )

  }

  #
  # story map
  # 
  if( view[["type"]] == "sm" ){
    #
    # Update view data
    #
    story =  input$storyEdit_values$msg
    errors = input$storyEdit_errors$msg

    view[[c("data","story")]] <- input$storyEdit_values$msg
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

   # add this as new (empty) source
  mglSetSourcesFromViews(
    id = .get(config,c("map","id")),
    viewsList = view,
    render = FALSE,
    country = country
    )
  reactData$updateViewListFetchOnly <- runif(1)
})

#
# Vew style change
#
observeEvent(input$styleEdit_values,{

  style <- input$styleEdit_values$msg

  if(noDataCheck(style)) return();

  view <- reactData$viewDataEdited
  view <- .set(view,c("data","style","rules"), style$rules)
  view <- .set(view, c("data","style","dataDrivenMethod"),style$dataDrivenMethod)

  mglAddView(
    viewData = view
    )

})

#
# View style save
#
observeEvent(input$btnViewUpdateStyle,{

  view <- reactData$viewDataEdited
  country <- reactData$country

  if( view[["_edit"]] && view[["type"]] == "vt" ){
    view[["_edit"]] = NULL

    style <- input$styleEdit_values$msg

    if(!noDataCheck(style)){

      view <- .set(view, c("date_modified"), Sys.time() )
      view <- .set(view, c("target"), as.list(.get(view,c("target"))))
      view <- .set(view, c("data", "style", "dataDrivenMethod"), .get(style,c("dataDrivenMethod")))
      view <- .set(view, c("data", "style", "rules"), .get(style,c("rules")))
      view <- .set(view,c("data"), as.list(.get(view,"data")))

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

      # add this as new (empty) source
      mglSetSourcesFromViews(
        id = .get(config,c("map","id")),
        viewsList = view,
        render = FALSE,
        country = country
        )
      reactData$updateViewListFetchOnly <- runif(1)
    }
  }
})

#
# Select layer logic : geomType, and variable name
#
observe({
  layerMain <- input$selectSourceLayerMain
  viewData <- reactData$viewDataEdited

  if(noDataCheck(layerMain)) return()
  if(noDataCheck(viewData)) return()
  if(viewData$type != "vt") return()
   

  isolate({
  language <- reactData$language

  
  geomTypesDf <- mxDbGetLayerGeomTypes(layerMain)

  geomTypes <- mxSetNameGeomType(geomTypesDf,language)

  variables <- mxDbGetLayerColumnsNames(
    table = layerMain,
    notIn = c("geom","gid")
    )

  geomType <- .get(viewData,c("data","geometry","type"))
  variableName <- .get(viewData,c("data","attribute","name"))

  output$uiViewEditVtMain <- renderUI({
    tagList(
    selectInput(
      inputId="selectSourceLayerMainGeom",
      label=d("source_select_geometry",language),
      choices=geomTypes,
      selected=geomType
      ),
    selectInput(
      inputId="selectSourceLayerMainVariable",
      label=d("source_select_variable"),
      choices=variables,
      selected=variableName
      ),
    uiOutput("uiViewEditVtMainSummary") 
    )
  })
  })
})

#
# Main layer summary
#
observeEvent(input$selectSourceLayerMainVariable,{

  layerMain <- input$selectSourceLayerMain
  variable <- input$selectSourceLayerMainVariable 

  output$uiViewEditVtMainSummary <- renderUI({
    reactLayerSummary()$html
  })

})

#
# Number of overlap indication
#
observeEvent(input$selectSourceLayerMask,{

  layerMask <- input$selectSourceLayerMask
  layerMain <- input$selectSourceLayerMain
  
  if(noDataCheck(layerMain) || noDataCheck(layerMask)) return()
  
  language <- reactData$language
  
  #viewData <- reactData$viewDataEdited

  output$uiViewEditVtMask <- renderUI({
    numOverlapping = list(mxDbGetOverlapsCount(layerMain,layerMask))
    names(numOverlapping) <- d("view_num_overlap",language) 
    HTML(listToHtmlClass(
        listInput = numOverlapping,
        titleMain = d("view_num_overlap","en")
        )
      )
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

  userCanRead <- reactUser$role[[c("read")]]
  userId <- reactUser$data[["id"]]
  country <- reactData$country
  language <- reactData$language
  updateSourceLayer <- reactData$updateSourceLayerList

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



##
## Select mask layer logic : layer selection 
##
## NOTE: why reactivity on layer main ? the mask can't be the same as the main.
## NOTE: removed this observer because it was not working with madal panel :
## If the modal panel was closed and then reopenned, this observer were not triggered, which 
## resulted in empty input. 
#observe({

  #layerMain <- input$selectSourceLayerMain

  #if(noDataCheck(layerMain)) return()

  #isolate({

    #viewData <- reactData$viewDataEdited

    #layerList <-  reactSourceLayer()

    #layerList <- layerList[!layerList %in% layerMain]

    #layerMask <- viewData[[c("data","definition","layer","nameMask")]]

    #language <- reactData$language

    #nLayers = length(layerList)

    #updateSelectInput(session,
      #inputId = "selectSourceLayerMask",
      #choices = layerList,
      #selected = layerMask
      #)
  #})
#})

