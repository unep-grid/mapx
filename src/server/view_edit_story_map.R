
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

    if(is.numeric(dateClient)){
      # This is most certainly a posix from the client, generated with js. Tz is unknown...
      dateClientCt <- as.POSIXct(dateClient/1000,origin="1970-01-01",tz="UTC");
    }else{
      # format UTC string to  posixct
      dateClientCt <- as.POSIXct(dateClient,format="%Y-%m-%d%tT%T",tz="UTC")
    }

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
      dbVersion = useServerVersion,
      time = Sys.time()
      )
  }else{
    mxModal(
      id="modalViewEditLoadStorage",
      content=tagList(
        p("A draft has been found on your computer, would you use it ?"),
        #checkboxInput("checkUseClientStory","Yes"),
        mxFold(
          labelText="Inspect draft",
          tags$div(id="draftStoryInspect")
          )
        ),
      buttons=tagList(
        actionButton("btnSetStoryVersionClient","Yes, use draft"),
        actionButton("btnSetStoryVersionServer","No, edit old story")
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
# Use draft
#

observeEvent(input$btnSetStoryVersionClient,{

  mxModal(
    id = "modalViewEditLoadStorage",
    close = TRUE
    )

  view <- input$localStory$item

  reactData$viewStory <- list(
    view = view,
    dbVersion = FALSE,
    time = Sys.time()
    )

})


#
# Use server version
#
observeEvent(input$btnSetStoryVersionServer,{

  mxModal(
    id = "modalViewEditLoadStorage",
    close = TRUE
    )

  view <- reactData$viewDataEdited

  reactData$viewStory <- list(
    view = view,
    dbVersion = TRUE,
    time = Sys.time()
    )

})

#
# View story : render schema
#
observeEvent(reactData$viewStory,{

  userRole <- getUserRole()
  userData <- reactUser$data
  view <- reactData$viewStory$view
  isDbVersion <- reactData$viewStory$dbVersion
  language <- reactData$language  
  story <- .get(view,c("data","story"))

  if(!isTRUE(view[["_edit"]])) return()

  views <- reactViewsCompactAll()

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

  mxToggleButton(
    id="btnViewPreviewStory",
    disable = TRUE
    )

  story <- input$storyEdit_values$msg

  if(noDataCheck(story)) return();

  allViews <- reactViewsCompactAll()
     
  view <- reactData$viewDataEdited
  view <- .set(view,c("data","story"), story)
  view <- .set(view,c("date_modified"), Sys.time())

  view <- updateStoryViews(
    story = story,
    view = view,
    allViews = allViews
    )

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = "Unsaved draft"
    )

  mglReadStory(
    view = view,
    save = TRUE,
    edit = TRUE
    )


})


#
# Cancel and save draft
#
observeEvent(input$btnViewStoryCancel,{

  story <- input$storyEdit_values$msg

  if(noDataCheck(story)) return();

  allViews <- reactViewsCompactAll()

  view <- reactData$viewDataEdited

  hasChanged <- mxViewChanged(.get(view,c("data","story")),story)

  if( hasChanged ){
    #
    # Something changed ! Save as draft
    #
    mxDebugMsg("Cancel story but something changed, save it in client db");

    view <- .set(view,c("data","story"), story)
    view <- .set(view,c("date_modified"), Sys.time())

    view <- updateStoryViews(
      story = story,
      view = view,
      allViews = allViews
      )

    mxUpdateText(
      id = "modalViewEdit_txt",
      text = "Draft saved client side"
      )

    mglReadStory(
      view = view,
      save = TRUE,
      edit = FALSE,
      close = TRUE
      )

  }

  #
  # Close the modal
  #
  mxModal(
    id = "modalViewEdit",
    close = TRUE
    )

})


mxViewChanged <- function(a,b){
  a <- sort(unlist(a,use.names=F))
  b <- sort(unlist(b,use.names=F))
  d <- setdiff(a,b)
  c <- isTRUE(length(d) >0)

  if(c){
    mxDebugMsg(d)
  }

  return(c)
}


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
  language <- reactData$language
  editor <- reactUser$data$id
  userData <- reactUser$data
  userRole <- getUserRole()
  allViews <- reactViewsCompactAll()

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
    view <- .set(view, c("data"), as.list(.get(view,"data")))
    view <- .set(view, c("editor"), editor)

    #
    # Update / add step views to dependencies "data>views"
    #
    view <- updateStoryViews(
      story = story,
      view = view,
      allViews = allViews
      )

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

    #
    # Close the preview
    #
    mglReadStory(
      view = view,
      close = TRUE,
      save = FALSE
      )

    # edit flag
    view$`_edit` = TRUE 

    # add this as new source
    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = view,
      render = FALSE,
      country = country
      )
    reactData$updateViewListFetchOnly <- runif(1)

    #
    # Update view edited to check for later changes 
    # e.g. when cancel, check with edited story
    #
    reactData$viewDataEdited <- view

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








