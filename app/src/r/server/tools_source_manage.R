
#
# Geoserver manage
#



observeEvent(input$btnEditSources,{

  mxCatch(title="btn edit source",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language

    if( !isPublisher ){

      return()

    }else{

      layers <- reactListEditSources()  
      disabled <- NULL
      if(noDataCheck(layers)){
        layers <- list("noLayer")
        disabled <- TRUE
      }

      uiOut <- tagList(
        selectizeInput(
          inputId = "selectSourceLayerEdit",
          label = d("source_select_layer",language),
          choices = layers,
          multiple = FALSE,
          options = list(
            sortField="label"
            )
          )
        )

      btn <- list(
        actionButton(
          "btnEditSourceManage",
          d("btn_edit_selected",language),
          disabled = disabled
          )
        )

      mxModal(
        id = "editSourceManage",
        title = d("source_edit",language),
        content = uiOut,
        buttons = btn,
        textCloseButton = d("btn_close",language)
        )

    }
})
})


#
# Disable btn edit if not allowed
#
observeEvent(input$selectSourceLayerEdit,{

  language <- reactData$language
  layer <- input$selectSourceLayerEdit
  layers <- reactListEditSources()
  isAllowed <- layer %in% layers

  mxToggleButton(
    id="btnEditSourceManage",
    disable = !isAllowed 
    )

})


observeEvent(input$btnEditSourceManage,{
  reactData$triggerSourceManage <- list(
     idSource = input$selectSourceLayerEdit
  )
})

observeEvent(reactData$triggerSourceManage,{

  mxCatch(title="Edit source manage",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    layer <- reactData$triggerSourceManage$idSource
    layers <- reactListEditSources()
    isAllowed <- layer %in% layers
    project <- reactData$project

    if( !isPublisher || !isAllowed ){

      return()

    }else{

      idSource <- layer
      target <-  mxDbGetQuery("SELECT readers, editors FROM mx_sources WHERE id ='"+idSource+"'")
      services <- mxDbGetLayerServices(idSource)
      readers <- mxFromJSON(target$readers)
      editors <- mxFromJSON(target$editors)
      #
      # Who can view this
      #
      sourceReadTarget <- c("publishers","admins")
      sourceEditTarget <- c("publishers","admins")
      sourceEditServices <- c("mx_download","gs_ws_a","gs_ws_b") # set in dict_main,settings-global. Used in geoserver.R.
      names(sourceEditServices) <- d(sourceEditServices,lang=language)

      # mx_download -> MapX : button download in each view
      # ogc_read -> Geoserver : workspace_a, wms
      # ogc_download -> geoserver : workspace_b, wms, wmts, wcs/wfs

      #
      # Format view list by email 
      #
      data <- reactTableViewsUsingSource()
      data <- data[,c("title","email")]
      hasRow <- isTRUE(nrow(data) > 0)

      if( hasRow ){
        names(data) <- c(
          d("view_title",w=F,lang=language),
          d("login_email",w=F,lang=language)
          )       

        tblViews <- tagList(
          tags$label(d("tbl_views_depending_source",language)),
          mxTableToHtml(data)
          )

      }else{
        tblViews <- tagList()
      }


      uiOut <- tagList(
        selectizeInput(
          inputId="selectSourceReadersUpdate",
          label=d("source_target_readers",language),
          choices=sourceReadTarget,
          selected=readers,
          multiple=TRUE,
          options=list(
            sortField = "label",
            plugins = list("remove_button")
            )
          ),
        selectizeInput(
          inputId="selectSourceEditorsUpdate",
          label=d("source_target_editors",language),
          choices=sourceEditTarget,
          selected=editors,
          multiple=TRUE,
          options=list(
            sortField = "label",
            plugins = list("remove_button")
            )
          ),
        selectizeInput(
          inputId="selectSourceServicesUpdate",
          label=d("source_services",language),
          choices=sourceEditServices,
          selected=as.list(services),
          multiple=TRUE,
          options=list(
            sortField = "label",
            plugins = list("remove_button")
            )
          ),
        tblViews,    
        uiOutput("uiValidateSourceEdit")
        )


      btnDelete <- actionButton(
        inputId = "btnDeleteSource",
        class = "mx-modal-btn-float-right",
        label = d("btn_delete",language)
        )

      btnList <- tagList(
        actionButton(
          inputId = "btnUpdateSource",
          label = d("btn_update",language)
          )
        )

      #
      # Todo : check why btnDelete 'disabled' attribute
      # could not be set using actionButton(.... disabled=FALSE);
      #
      if(!hasRow){
        btnList <- tagList(btnList,btnDelete)
      }

      mxModal(
        id="editSourceManage",
        title="Edit sources",
        content=uiOut,
        buttons=btnList,
        textCloseButton=d("btn_close",language)
        )

    }

    })
})


#
# Validation
#
observe({

  idSource <- reactData$sourceDownloadRequest$idSource
  language <- reactData$language
  readers <- input$selectSourceReadersUpdate
  editors <- input$selectSourceEditorsUpdate
  errors <- logical(0)
  warning <- logical(0)
  userData <- reactUser$data
  idUser <-  .get(userData,c("id"))
  data <- reactTableViewsUsingSource()
  isolate({

    hasData <- !noDataCheck(data)
    hasNoLayer <- noDataCheck(idSource)
    hasNoReaders <- !isTRUE("publishers" %in% readers)
    hasViewsFromOthers <- !isTRUE(all(data$editor %in% idUser))

    blockUpdate <- (hasNoLayer||(hasData && hasNoReaders && hasViewsFromOthers))
    blockDelete <- (hasNoLayer||(hasData))

    errors['error_no_layer'] <- hasNoLayer
    if(!hasNoLayer){
      errors['error_views_need_publishers'] <- blockUpdate
      errors['error_views_need_data'] <- hasData
    }
    errors <- errors[errors]
    hasError <- length(errors) > 0

    reactData$sourceEditBlockUpdate <- blockUpdate
    reactData$sourceEditBlockDelete <- blockDelete

    output$uiValidateSourceEdit <- renderUI(
      mxErrorsToUi(
        errors = errors,
        warning = warning,
        language = language
        )
      )

    mxToggleButton(
      id="btnUpdateSource",
      disable = blockUpdate  
      )

    mxToggleButton(
      id="btnDeleteSource",
      disable = blockDelete
      )

  })
})


#
# Delete confirmation
#
observeEvent(input$btnDeleteSource,{

  language <- reactData$language

  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  if(blockDelete) return()

  #
  # Button to confirm the source removal
  #
  btnList <- list(
    actionButton(
      inputId="btnDeleteSourceConfirm",
      label=d("btn_confirm",language)
      )
    )
  #
  # Generate the modal panel
  #
  mxModal(
    id="editSourceManageDeleteConfirm",
    title=d("source_confirm_remove",language),
    content=tags$span(d("source_confirm_remove",language)),
    buttons=btnList,
    textCloseButton=d("btn_close",language),
    addBackground=T
    )
})



#
# Source delete final
#
observeEvent(input$btnDeleteSourceConfirm,{

  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  if(blockDelete) return()

  idSource <- reactData$sourceDownloadRequest$idSource
  project <- reactData$project
  language <- reactData$language
  idUser <- reactUser$data$id
  userRoles <- getUserRole()

  mxModal(
    id="editSourceManageDeleteConfirm",
    close=TRUE
    )

  mxModal(
    id="editSourceManage",
    close=TRUE
    )

  mxDbDropLayer(idSource)

  reactData$updateEditSourceLayerList <- runif(1)  

  layers <- reactListEditSources()

  mxModal(
    id="uiConfirmSourceRemoveDone",
    title=d("source_removed"),
    content=tags$span(d("source_removed",lang=language)),
    textCloseButton=d("btn_close",language)
    )

})


#
# Update source 
#
observeEvent(input$btnUpdateSource,{

  idSource <- reactData$sourceDownloadRequest$idSource
  project <- reactData$project
  language <- reactData$language
  idUser <- reactUser$data$id

  mxCatch(title="btn update manage source",{
    userRoles <- getUserRole()

    blockUpdate <- isTRUE(reactData$sourceEditBlockUpdate)

    if(blockUpdate) return()
    idGroupsServicesOld <- mxDbGetLayerServices(idSource)
    idGroupsServices <- input$selectSourceServicesUpdate

    readers <- input$selectSourceReadersUpdate
    editors <- input$selectSourceEditorsUpdate
    #
    # Control roles
    #
    mxDbUpdate(
      table = .get(config,c("pg","tables","sources")),
      idCol = "id",
      id = idSource,
      column = "date_modified",
      value = Sys.time()
      )

    mxDbUpdate(
      table = .get(config,c("pg","tables","sources")),
      idCol = "id",
      id = idSource,
      column = "services",
      value = as.list(idGroupsServices)
      )

    mxDbUpdate(
      table = .get(config,c("pg","tables","sources")),
      idCol = "id",
      id = idSource,
      column = "readers",
      value = as.list(readers)
      )

    mxDbUpdate(
      table = .get(config,c("pg","tables","sources")),
      idCol = "id",
      id = idSource,
      column = "editor",
      value = idUser
      )

    mxDbUpdate(
      table = .get(config,c("pg","tables","sources")),
      idCol = "id",
      id = idSource,
      column = "editors",
      value = as.list(editors)
      )

    mxUpdateGeoserverSourcePublishing(
      idProject = project,
      idSource = idSource,
      idGroups = as.list(idGroupsServices),
      idGroupsOld = as.list(idGroupsServicesOld)
      )

    #
    # Generate the modal panel
    #
    mxFlashIcon("floppy-o")
    mxUpdateText("editSourceManage_txt","Saved at " + format(Sys.time(),"%H:%M"))

    #
    # Invalidate source list
    #

    reactData$updateEditSourceLayerList <- runif(1)
    })
})


