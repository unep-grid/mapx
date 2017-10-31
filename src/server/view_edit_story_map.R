
#
# Evaluate client and db story
# NOTE: shiny seems to convert date to UTC with jsonlite.. Be careful here.
#
observeEvent(input$localStory,{
  useServerVersion = TRUE
  viewServer = reactData$viewDataEdited
  viewClient = input$localStory$item
  sysTimeZone = Sys.timezone()

  if(noDataCheck(viewClient)){
    useServerVersion = TRUE
  }else{
    dateClient <- viewClient$date_modified
    dateServer <- viewServer$date_modified
    # format UTC string to  posixct
    dateClientCt <- as.POSIXct(dateClient,format="%Y-%m-%d%tT%T",tz="UTC")
    # convert UTC to sysTimeZone string
    dateClientCt <- format(dateClientCt,tz=sysTimeZone,usetz=TRUE)
    # convert string back to posixct
    dateClientCt <-  as.POSIXct(dateClientCt,tz=sysTimeZone)
    # get db version time 
    dateServerCt <- as.POSIXct(dateServer,format="%Y-%m-%d%tT%T",tz=sysTimeZone)
    # check which is the more recent
    useServerVersion <- dateServerCt > dateClientCt
  }

  #
  # Update reactData 
  #
  if( useServerVersion ){
    reactData$viewStory <- list(
      view = viewServer,
      dbVersion = useServerVersion
      )
  }else{
    mxModal(
      id="modalViewEditLoadStorage",
      content=tagList(
        p("A draft has been found on your computer, would you use it ?"),
        checkboxInput("checkUseClientStory","Yes"),
        mxFold(
          labelText="Inspect draft",
          tags$div(id="draftStoryInspect")
          )
        ),
      buttons=tagList(
        actionButton("btnSetStoryVersion","Confirm")
        ),
      removeCloseButton = T
      )
    #
    # Send json to html
    #
    mxJsonToHtml(
      id="draftStoryInspect",
      data=viewClient$data$story
      )
  }
})


#
# View story check which version use
#
observeEvent(input$btnSetStoryVersion,{

  mxModal(
    id = "modalViewEditLoadStorage",
    close = TRUE
    )

  viewServer <- reactData$viewDataEdited
  viewClient <- input$localStory$item
  useClientStory <- isTRUE(input$checkUseClientStory)

  if(useClientStory){
    view = viewClient
  }else{
    view = viewServer
  }

  reactData$viewStory <- list(
    view = view,
    dbVersion = !useClientStory
    )


 })


#
# View story : render schema
#
observeEvent(reactData$viewStory,{

  view <- reactData$viewStory$view
  isDbVersion <- reactData$viewStory$dbVersion
  language <- reactData$language  
  story <- .get(view,c("data","story"))

  if(!isTRUE(view[["_edit"]])) return()

  views = mxDbGetViews(
    views = NULL,
    project = reactData$country,
    read = reactUser$role$read,
    edit = reactUser$role$edit,
    userId = reactUser$data$id,
    from = 0,
    to = 1000
    )

  reactData$viewsAllAvailable = views

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

  if(!isDbVersion){
    mxUpdateText(
      id = "modalViewEdit_txt",
      text = "Unsaved draft"
      )
  }

 })

#
# Update story changes
#
observeEvent(input$btnViewPreviewStory,{

  story <- input$storyEdit_values$msg

  if(noDataCheck(story)) return();

  view <- reactData$viewDataEdited
  view <- .set(view,c("data","story"), story)
  view <- .set(view,c("date_modified"), Sys.time())

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = "Unsaved draft"
    )

  mglReadStory(view=view)

})


#
# View story save
#
observeEvent(input$btnViewSaveStory,{

  mxToggleButton(
    id="btnViewSaveStory",
    disable = TRUE
    )

  time <- Sys.time()
  view <- reactData$viewDataEdited
  country <- reactData$country
  editor <- reactUser$data$id

  if( view[["_edit"]] && view[["type"]] == "sm" ){
    view[["_edit"]] = NULL

    #
    # Update view data
    #
    story <-  input$storyEdit_values$msg

    #
    # set default
    #
    view <- .set(view, c("date_modified"), Sys.time() )
    view <- .set(view, c("target"), as.list(.get(view,c("target"))))
    view <- .set(view, c("data", "story"), story)
    view <- .set(view,c("data"), as.list(.get(view,"data")))
    view <- .set(view,c("editor"), editor)

    #
    # Retrieve and store data for all views used in story.
    #
    views = list()
    try(silent=T,{

      # All views id extracted from the story
      viewsStory = lapply(story$steps,function(s){
        lapply(s$views,function(v){v})
        })
      # Final view list
      viewsId = unique(unlist(viewsStory))
      viewsId = as.list(viewsId)

      # If there is at least on views used, get views object.
      if(!noDataCheck(viewsId)){
        views = mxDbGetViews(
          views = viewsId,
          project = reactData$country,
          read = reactUser$role$read,
          edit = reactUser$role$edit,
          userId = reactUser$data$id,
          from = 0,
          to = 1000
          )
      }
    })

    #
    # Save local views from story, if any
    #
    view <- .set(view,c("data","views"),views)

    #
    # Add row to db
    #
    mxDbAddRow(
      data=view,
      table=.get(config,c("pg","tables","views"))
      )

    mxUpdateText(
      id = "modalViewEdit_txt",
      text = sprintf("Saved at %s",time)
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

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = sprintf("Saved at %s",time)
    )

  mxToggleButton(
    id="btnViewSaveStory",
    disable = FALSE
    )

})


