


observeEvent(input$btnIframeBuilder,{
  reactData$showShareManager <- list(update=runif(1))
})


observeEvent(reactData$showShareManager,{

  data <- reactData$showShareManager 

  hasDataList <- typeof(data) == "list"
  hasViews <- hasDataList  && !noDataCheck(data$views)
  isStory <- hasDataList && isTRUE(data$isStory)

  reactData$iframeString = "";
  project <- reactData$project
  
  language <- reactData$language
  colorScheme <- input$uiColorScheme;
  userData <- reactUser$data
  idUser <- userData$id
  projects <- mxDbGetProjectListByUser(idUser,asNamedList=T)
  projectsPublisher <- mxDbGetProjectListByUser(idUser,asNamedList=T,whereUserRoleIs="publisher")
  projectsPublisher <- projectsPublisher[!projectsPublisher %in% project]
  enableShareViewProject <- !noDataCheck(projectsPublisher) && hasViews

  uiShareUrl <- tagList(
    checkboxInput("checkShareStyle",label="Set style (default = current) "),
    conditionalPanel(
      condition="input.checkShareStyle",
      textInput(
        inputId="txtShareStyle",
        label=NULL,
        value=colorScheme
        )
      ),
    checkboxInput("checkShareMapPosition",label="Set map position"),
    conditionalPanel(
      condition="input.checkShareMapPosition",
      jedOutput("shareMapPosition")
      ),
    checkboxInput("checkShareProject",label="Set project (default = current) ",value=TRUE),
    conditionalPanel(condition="input.checkShareProject",
      selectInput("selectShareProject",
        label = NULL,
        choices= projects,
        selected = project
        )
      ),
    checkboxInput("checkShareCollections",label="Set collections"),
    conditionalPanel(
      condition="input.checkShareCollections",
      selectizeInput(
        "selectShareCollections",
        label = NULL,
        choices = list(),
        multiple = TRUE,
        selected = query$collections,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
          )
        )
      ),
    checkboxInput("checkShareViews",label="Subset views to share",value=FALSE),
    conditionalPanel(
      condition="input.checkShareViews",
      p(class="text-muted","Views to display in the list when the project is loaded. If empty, all project's views will be visible."),
      selectizeInput(
        "selectShareViews",
        label = NULL,
        choices = list(),
        multiple = TRUE,
        selected = query,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
          )
        )
      ),
    checkboxInput("checkShareViewsOpen",label="Set views to open",value=hasViews),
    conditionalPanel(
      condition="input.checkShareViewsOpen",
      p(class="text-muted","Views that will be opened as soon as the project is loaded. The layers – if any – will be visible on the map. The button 'Filter activated views' will be enabled."),
      selectizeInput(
        "selectShareViewsOpen",
        label = NULL,
        choices = list(),
        multiple = TRUE,
        selected = NULL,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
          )
        )
      ),
    checkboxInput("checkShareIframe",label="Include link in an iframe"),
    tagList(
    if(isStory){
      checkboxInput("checkShareStoryAutoStart",label="Play the story immediately after MapX is loaded")
    }),
    tags$label("Link"),
    div(
      class="input-group",
      style ="margin-bottom:10px",
      textInput(
        "txtShareBuilt",
        label = NULL,
        value = ""
        ),
      tags$input(
        type="text",
        class="mx-hide-here",
        id = "txtShareLink",
        label = NULL,
        value = ""
        ),
      tags$span(
        class="input-group-btn",   
        tags$button(
          id = "btnCopyShareLink",
          class = "form-control btn-square btn-black",
          tags$i(class="fa fa-clipboard"),
          onclick="mx.helpers.copyText('txtShareBuilt')"
          )
        ),
      tags$span(
        class="input-group-btn",   
        tags$button(
          id = "btnTwitterShareLink",
          class = "form-control btn-square btn-black ",
          onclick="mx.helpers.shareTwitter('txtShareLink')",
          tags$i(class="fa fa-twitter")
          )
        )
      )
    )

  uiShareAddToProject <- tagList(
    tags$h3("Publish in another project"),
    wellPanel(
      selectizeInput(
        "selectProjectsToShareView",
        label = "Projects",
        choices = projectsPublisher,
        selected = NULL,
        multiple = TRUE,
        options = list(
          sortField = "label",
          plugins = list("remove_button")
          )
        ),
      actionButton(
        "btnShareViewInProject",
        label = "Add the view to selected project(s)",
        disable = T
        )
      )
    )

  uiShareUrl <- tagList(
    tags$h3("Share Link"),
    wellPanel(
      uiShareUrl
      )
    )

  if(enableShareViewProject){
    ui <- tagList(
      uiShareAddToProject,
      uiShareUrl
      )
  }else{
    ui <- uiShareUrl
  }
  mxModal(
    id = "modalShare",
    title ="Sharing manager",
    content = ui,
    addBackground = FALSE
    )

  reactData$updateShareProject<-runif(1)
})




#
# block button share view if no project, or not allowed
#
observeEvent(input$selectProjectsToShareView,{
  projects <- input$selectProjectsToShareView 
  userData <- reactUser$data
  idUser <- userData$id
  projectsPublisher <- mxDbGetProjectListByUser(idUser,asNamedList=T,whereUserRoleIs="publisher")
  disableBtn <- TRUE
  hasSetProject <- !noDataCheck(projects)
  allAllowedProjects <- isTRUE(all(projects %in% projectsPublisher))

  if(allAllowedProjects && hasSetProject){
    disableBtn <- FALSE
  }

  mxToggleButton(id="btnShareViewInProject",disable=isTRUE(disableBtn))
})

#
# Add view to project as external view
#
observeEvent(input$btnShareViewInProject,{

  project <- reactData$project
  projects <- input$selectProjectsToShareView
  userData <- reactUser$data
  idUser <- userData$id
  projectsPublisher <- mxDbGetProjectListByUser(idUser,asNamedList=T,whereUserRoleIs="publisher")
  projectsPublisher <- projectsPublisher[!projectsPublisher %in% project]
  data <- reactData$showShareManager
  hasViews <- typeof(data) == "list" && !noDataCheck(data$views)
  view <- data$views
  if(!noDataCheck(projects)){
    for(p in projects){
      if(p %in% projectsPublisher){
        mxDbProjectSetViewExternal(idProject=p,idView=view,action="add")
        mxFlashIcon("floppy-o")
      }
    }
  }

})


#
# Share
#


observeEvent(input$selectShareProject,{
  reactData$updateShareProject <- runif(1)
})


observeEvent(reactData$updateShareProject,{
  project <- input$selectShareProject
  if(noDataCheck(project)) return()
  data <- reactData$showShareManager 
  projectCur <- reactData$project
  isSameProj <- identical(project,projectCur)
  hasDataViews <- isSameProj && !noDataCheck(data) && !noDataCheck(data$views)
  language <- reactData$language
  userData <- reactUser$data
  idUser <- userData$id
  token <- reactUser$token
  collections <- reactCollections()
  if(noDataCheck(collections)) collections <- list()
  updateSelectInput(session,
    inputId="selectShareCollections",
    choices=collections
    )

  views <-  mxApiGetViews(
    idUser = idUser,
    idProject = project,
    token = token,
    language = language,
    keys = c("id","_title")
    )
   
  if(noDataCheck(views)){
    viewsList=list()
  }else{
    viewsList <- lapply(views,`[[`,'id')
    names(viewsList) <- lapply(views,`[[`,'_title')
  }

  updateSelectInput(session,
    inputId = "selectShareViews",
    choices = viewsList,
    selected = '',
    )

  updateSelectInput(session,
    inputId = "selectShareViewsOpen",
    choices = viewsList,
    selected = ifelse(hasDataViews,data$views,"")
    )
})

observeEvent(input$checkShareStoryAutoStart, {
  autoStart = isTRUE(input$checkShareStoryAutoStart)

  toDisable = c('checkShareStyle','checkShareProject', 'checkShareMapPosition','checkShareViewsOpen','checkShareViews','checkShareCollections','checkShare')

  if(autoStart){
    sapply(toDisable,function(id){
    mxUpdateCheckboxInput(id=id, disabled=TRUE, checked=FALSE);
    })
  }else{
    sapply(toDisable,function(id){
    mxUpdateCheckboxInput(id=id, disabled=FALSE);
    })
  }
})

observe({
  urlHost <- session$clientData[["url_hostname"]]  
  urlPort <- session$clientData[["url_port"]] 
  urlProtocol <- session$clientData[["url_protocol"]]
  urlPort <- ifelse(!noDataCheck(urlPort),sprintf(":%s",urlPort),"") 

  project <- ""
  style <- ""
  collections <- ""
  views <- ""
  viewsOpen <- ""
  storyAutoStart <- ""
  first <- TRUE
  mapPosition = list()

  isolate({
    projectCurrent = reactData$project
  })

  s<-function(){
    if(first){
      first<<-FALSE
      return("?")
    }else{
      return("&")
    }
  }

  #
  # Build request
  #
  data <- reactData$showShareManager
  addIframe <- isTRUE(input$checkShareIframe)
  addStyle <- isTRUE(input$checkShareStyle)
  addStoryAutoStart <- isTRUE(input$checkShareStoryAutoStart)
  addProject <- isTRUE(input$checkShareProject)
  addCollections <- isTRUE(input$checkShareCollections)
  addViews <- isTRUE(input$checkShareViews)
  addViewsOpen <- isTRUE(input$checkShareViewsOpen)
  addMapPosition <- isTRUE(input$checkShareMapPosition)

  if(addMapPosition){
    mapPositionIssue <- .get(input$shareMapPosition_issues,c('data'),list())
    if(length(mapPositionIssue) == 0){
      mapPosition$lat <- .get(input$shareMapPosition_values,c('data','lat'),0)
      mapPosition$lng <- .get(input$shareMapPosition_values,c('data','lng'),0) 
      mapPosition$zoom <- .get(input$shareMapPosition_values,c('data','z'),0) 
    }
  }

  if(!addStoryAutoStart){
    if(addStyle) style <- s() + "style=" + mxEncode(jsonlite::toJSON(jsonlite::fromJSON(input$txtShareStyle),auto_unbox=T))
    if(addProject) project <- s() + "project=" + input$selectShareProject
    if(addCollections) collections <-  s() + "collections=" + paste(input$selectShareCollections,collapse=",")
    if(addViews) views <-  s() + "views=" + paste(input$selectShareViews,collapse=",")
    if(addViewsOpen) viewsOpen <-  s() + "viewsOpen=" + paste(input$selectShareViewsOpen,collapse=",")
    if(addMapPosition) mapPosition <- s() + "lat=" + mapPosition$lat +'&lng='+ mapPosition$lng + '&zoom=' + mapPosition$zoom 
  }
  
  if(addStoryAutoStart) storyAutoStart <- s() + "storyAutoStart=true&views=" + data$views 
  
  out <- ""

  url <- urlProtocol + "//" + urlHost + urlPort + style + project + collections +  views + viewsOpen + storyAutoStart + mapPosition


  #
  # Hide twitter button if the output is an iframe
  #
  mxToggleButton(id="btnTwitterShareLink",disable=isTRUE(addIframe))

  #
  # Build iframe
  #
  if(addIframe){
    out <- sprintf("<iframe width='800' height='500' src='%1$s' frameborder='0' allowfullscreen></iframe>",url)
  }else{
    out <- url
  }

  updateTextAreaInput(
    session=shiny::getDefaultReactiveDomain(),
    inputId="txtShareLink",
    value=url
    )
  updateTextAreaInput(
    session=shiny::getDefaultReactiveDomain(),
    inputId="txtShareBuilt",
    value=out
    )
})

observeEvent(input$shareMapPosition_init,{

  language <- reactData$language 
  tt <- function(id){d(id,language,web=F)}

  project <- reactData$project
  projectData <- mxDbGetProjectData(project)
  mapPosition <- .get(projectData,c("map_position"))

  schema <- list(
    type = "object",
    format = "position",
    title = tt("share_map_pos_set"),
    options = list(
      addButtonPos = TRUE,
      idMap = "map_main",
      textButton = tt("share_map_pos_get"),
      collapsed = TRUE
      ),
    properties = list(
      z = list(
        title = tt("map_zoom"),
        type = "number",
        minimum = 0,
        maximum = 22
        ),
      lat = list(
        title = tt("map_latitude_center"),
        type="number",
        minimum=-90,
        maximum=90
        ),
      lng = list(
        title = tt("map_longitude_center"),
        type="number",
        minimum=-180,
        maximum=180
        )
      )
    )
  jedSchema(
    id = "shareMapPosition",
    schema = schema,
    startVal = mapPosition,
    options = list(
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE
      )
    )
})


