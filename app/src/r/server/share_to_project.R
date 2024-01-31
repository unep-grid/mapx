observeEvent(reactData$showShareManagerProject,{
  mxCatch('Share to project : build modal',{
    update <- reactData$showShareManagerProject
    viewData <- reactData$viewDataEdited
    project <- reactData$project
    language <- reactData$language
    userData <- reactUser$data
    idUser <- userData$id
    idView <- viewData$id
    viewsList <- reactViewsListProject()
    hasViews <- isNotEmpty(idView) && idView %in% viewsList

    if(hasViews){
      viewProject <- .get(viewData, c('project'), project)
      #
      # Translation
      #
      tt <- function(id){d(id,lang=language,web=F)}

      projectsPublisher<- mxDbGetProjectListByUser(
        id = idUser,
        whereUserRoleIs = "publisher",
        language = language,
        token = reactUser$token,
        asNamedList = TRUE
      )

      #
      # Do not list current project
      #
      projectsPublisher <- projectsPublisher[!projectsPublisher %in% project]
      projectsPublisher <- projectsPublisher[!projectsPublisher %in% viewProject]
      enableShareViewProject <- isNotEmpty(projectsPublisher) && hasViews
      reactData$projectsPublisher <- projectsPublisher

      #
      # Share to proejct interface
      #
      if(enableShareViewProject){
        ui <- tagList(
          tags$h3(tt("share_in_project_title")),
          wellPanel(
            span(class="text-muted",
              tt("share_in_project_desc")
              ),
            selectizeInput(
              "selectProjectsToShareView",
              label = NULL,
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
              label = tt("share_in_project_btn"),
              disabled = T
              )
            )
          )
      }else if(hasViews){
        ui <- tags$b(tt("share_in_project_no_publisher_project"))
      }else{
        ui <- tags$b(tt("share_in_project_no_view"))
      }

      mxModal(
        id = "modalSharedProject",
        title = tt('share_manager_title'),
        content = ui,
        addBackground = TRUE 
        )

    }
})
})

#
# Validate project
#
observeEvent(input$selectProjectsToShareView,{
  mxCatch('Share to project : validation',{
    projects <- input$selectProjectsToShareView 
    projectsPublisher <- reactData$projectsPublisher
    project <- reactData$project
    viewsList <- reactViewsListProject() 
    viewData <- reactData$viewDataEdited
    idViews <- .get(viewData,c('id'))

    isAllowedView <- isTRUE(idViews %in% viewsList)
    isProjectInProjects <- isTRUE( project %in% projects ) 
    areAllowedProjects <- isTRUE(all(projects %in% projectsPublisher))
    isValid <- isAllowedView && !isProjectInProjects && areAllowedProjects

    reactData$validateShareToProject <- isValid

    mxToggleButton(id="btnShareViewInProject",disable=isTRUE(!isValid))
})
})

#
# Add view to project as external view
#
observeEvent(input$btnShareViewInProject,{
  mxCatch('Share to project : update projects',{
    mxToggleButton(id="btnShareViewInProject",disable=TRUE)
    projects <- input$selectProjectsToShareView 
    isValid <- isTRUE(reactData$validateShareToProject)
    viewData <- reactData$viewDataEdited
    idView <- .get(viewData,c('id'))
    if( !isValid ){
      mxFlashIcon("times")
    }else{
      for(p in projects){
        mxDbProjectSetViewExternal(
          idProject = p,
          idView = idView,
          action = "add"
          )
      }
      mxFlashIcon("floppy-o")
      mxToggleButton(id="btnShareViewInProject",disable=FALSE)
    }
})
})


