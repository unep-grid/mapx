
observeEvent(input$btnEditSources,{

  mxCatch("Edit source panel",{
    userRole <- getUserRole()
    isPublisher <- "publishers" %in% userRole$groups
    language <- reactData$language
    project <- reactData$project
    userData <- reactUser
    idUser <- .get(userData,c("data","id"))

    if( !isPublisher ){

      return()

    }else{


      layers <- reactTableEditSources()

      if(noDataCheck(layers)){
        layers <- list("noLayer")
      }else{
        layers <- mxGetLayerNamedList( layers )
      }


      #
      # Who can view this
      #
      sourceReadTarget <- c("publishers","admins") 
      sourceEditTarget <- c("publishers","admins")

      uiOut <- tagList(
        selectizeInput(
          inputId = "selectSourceLayerEdit",
          label = d("source_select_layer",language),
          choices = layers,
          multiple = FALSE,
          options = list(
            sortField="label"
            )
          ),
        conditionalPanel(
          condition="input.selectSourceLayerEdit",
          tagList(
            #
            # Who can see this ?
            #
            selectizeInput(
              inputId="selectSourceReadersUpdate",
              label=d("source_target_readers",language),
              choices=sourceReadTarget,
              selected=NULL,
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
              selected=NULL,
              multiple=TRUE,
              options=list(
                sortField = "label",
                plugins = list("remove_button")
                )
              ),
            uiOutput("tblViewsUsingSource")
            )
          ),
        uiOutput("uiValidateSourceEdit")
        )

      btnList <- list(
        actionButton(
          inputId="btnDeleteSource",
          label=d("btn_delete",language)
          ),
        actionButton(
          inputId="btnUpdateSource",
          label=d("btn_update",language)
          )
        )

      mxModal(
        id="uiEditSource",
        title="Edit sources",
        content=uiOut,
        buttons=btnList,
        textCloseButton=d("btn_close",language)
        )

    }
})
})


#
# Update readers and editors
#
observeEvent(input$selectSourceLayerEdit,{
  idSource <- input$selectSourceLayerEdit 
  if(!noDataCheck(idSource)){
    target <-  mxDbGetQuery("select readers, editors from mx_sources where id ='"+idSource+"'")
    readers <- mxFromJSON(target$readers)
    editors <- mxFromJSON(target$editors)
    updateSelectizeInput(session,"selectSourceEditorsUpdate",selected=editors)
    updateSelectizeInput(session,"selectSourceReadersUpdate",selected=readers)
  }
})




#
# Render a table of viers depending on selected source
#

output$tblViewsUsingSource <- renderUI({

  idSource <- input$selectSourceLayerEdit 
  data <- reactTableViewsUsingSource()
  layers <- reactListEditSources()
  language <- reactData$language
  hasRow <- isTRUE(nrow(data) > 0)
  hasSource <- isTRUE(idSource %in% layers)
  out <- tagList()


  if( !hasRow || !hasSource ){
    return(out)
  }

  data <- data[,c("title","email")]

  names(data) <- c(
    d("view_title",w=F,lang=language),
    d("login_email",w=F,lang=language)
    )

  out <- tagList(
    tags$label("Table of sources depending on selected source"),
    mxTableToHtml(data)
    )

  return(out);
})



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
    id="uiConfirmSourceRemove",
    title=d("source_confirm_remove",language),
    content=tags$span(d("source_confirm_remove",language)),
    buttons=btnList,
    textCloseButton=d("btn_close",language),
    addBackground=T
    )
})


observeEvent(input$btnDeleteSourceConfirm,{

  blockDelete <- isTRUE(reactData$sourceEditBlockDelete)

  if(blockDelete) return()


  idSource <- input$selectSourceLayerEdit 
  project <- reactData$project
  language <- reactData$language
  idUser <- reactUser$data$id
  userRoles <- getUserRole()

  mxModal(
    id="uiConfirmSourceRemove",
    close=TRUE
    )

  mxDbDropLayer(idSource)

  reactData$updateEditSourceLayerList <- runif(1)  

  layers <- reactListEditSources()

  layers <- layers[!layers %in% idSource]


  updateSelectizeInput(session, 
    inputId="selectSourceLayerEdit",
    choice = layers,
    selected = input$selectSourceLayerEdit
    )


  mxModal(
    id="uiConfirmSourceRemoveDone",
    title=d("source_removed"),
    content=tags$span(d("source_removed",lang=language)),
    textCloseButton=d("btn_close",language)
    )

})


observe({
  layer <- input$selectSourceLayerEdit 
  language <- reactData$language
  readers <- input$selectSourceReadersUpdate
  editors <- input$selectSourceEditorsUpdate
  errors <- logical(0)
  warning <- logical(0)
  userData <- reactUser$data
  idUser <-  .get(userData,c("id"))
  isolate({

    data <- reactTableViewsUsingSource()
    hasData <- !noDataCheck(data)
    hasNoLayer <- noDataCheck(layer)
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

observeEvent(input$btnUpdateSource,{

  idSource <- input$selectSourceLayerEdit 
  project <- reactData$project
  language <- reactData$language
  idUser <- reactUser$data$id
  userRoles <- getUserRole()

  blockUpdate <- isTRUE(reactData$sourceEditBlockUpdate)

  if(blockUpdate) return()


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
  #
  # Generate the modal panel
  #

  mxModal(
    id="uiConfirmSourceInit",
    title="Success update",
    content=tags$p(d("success_update",lang=language)),
    textCloseButton=d("btn_close",language)
    )

  #
  # Invalidate source list
  #

  reactData$updateEditSourceLayerList <- runif(1)
})



