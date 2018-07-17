
observeEvent(input$customCodeEdit_init,{

  mxToggleButton(
    id="btnViewSaveCustomCode",
    disable = TRUE
    )
    view = reactData$viewDataEdited
    language = reactData$language
    methods = .get(view,c("data","methods"))

    t <- function(i=NULL){
      d(id=i,lang=language,dict=config$dict,web=F,asChar=T)
    }

  cc <- list(
    title = t("view_dashboard_script"),
    options = list(
      language = "javascript",
      editor = "ace"
      ),
    type = "string",
    format = "textarea",
    default =.get(config,c("templates","text","custom_view"))
    )

  jedSchema(
    id = "customCodeEdit",
    schema = cc,
    startVal = methods
    )

  mxToggleButton(
    id="btnViewSaveCustomCode",
    disable = FALSE
    )

})

#
# Custom code preview
#
observeEvent(input$btnViewPreviewCustomCode,{
  
  methods <- input$customCodeEdit_values$msg
  project <- reactData$project

  if(noDataCheck(methods)) return();

  view <- reactData$viewDataEdited
  view <- .set(view,c("data","methods"), methods)

  mglRemoveView(
    idView=view$id
    )

  # add this as new (empty) source
  mglSetSourcesFromViews(
    id = .get(config,c("map","id")),
    viewsList = view,
    render = FALSE,
    project = project
    )

})


#
# View custom style save
#
observeEvent(input$btnViewSaveCustomCode,{

  mxToggleButton(
    id="btnViewSaveCustomCode",
    disable = TRUE
    )

  view <- reactData$viewDataEdited
  editor <- reactUser$data$id
  project <- reactData$project
  time <- Sys.time()

  if( view[["_edit"]] && view[["type"]] == "cc" ){
    view[["_edit"]] = NULL

    methods <- input$customCodeEdit_values$msg

    view <- .set(view, c("date_modified"), time )
    view <- .set(view, c("target"), as.list(.get(view,c("target"))))
    view <- .set(view, c("editors"), as.list(.get(view,c("editors"))))
    view <- .set(view, c("readers"), as.list(.get(view,c("readers"))))
    view <- .set(view, c("data", "methods"), methods)
    view <- .set(view,c("data"), as.list(.get(view,"data")))
    view <- .set(view,c("editor"),editor)
    
    mxDbAddRow(
      data=view,
      table=.get(config,c("pg","tables","views"))
      )

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
      project = project
      )
    reactData$updateViewListFetchOnly <- runif(1)
  }

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = sprintf("Saved at %s",time)
    )

  mxToggleButton(
    id="btnViewSaveCustomCode",
    disable = FALSE
    )
})
