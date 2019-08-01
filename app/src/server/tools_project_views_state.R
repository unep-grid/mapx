#
# Project views state
#

observeEvent(input$btnShowProjectViewsStates,{

  userRole <- getUserRole()
  idProject <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  
  if( isAdmin ){

    mglGetProjectViewsState(list(
        idProject = idProject,
        idInput = 'projectViewsState'
        ))

    stateKeys <- mxDbGetProjectStateKeys(idProject)

    ui = tagList(
      selectizeInput(
        "selectProjectStateKey",
        label = d("project_state_key",language,web=F),
        selected = stateKeys[0],
        choices = as.list(stateKeys),
        multiple = FALSE,
        options=list(
          create = FALSE
          )
        )
      )

    btnSave <- actionButton(
      "btnSaveViewsState",
      d("btn_save",language)
      )

    mxModal(
      id = "projectSaveViewsState",
      title = d("project_save_views_state",language,web=F),
      content = ui,
      textCloseButton = d("btn_close",language,web=F),
      buttons = list(btnSave),
      addBackground = TRUE
      )

  }

})


observeEvent(input$selectProjectStateKey,{
  key <- input$selectProjectStateKey 
  mxToggleButton(
    id="btnSaveViewsState",
    disable = noDataCheck(key)
    )
})


observeEvent(input$btnSaveViewsState,{

  mxToggleButton(
    id="btnSaveViewsState",
    disable = TRUE
    )

  idProject <- reactData$project
  key <- input$selectProjectStateKey 
  state <- fromJSON(input$projectViewsState,simplifyDataFrame = FALSE)
  hasState <- !noDataCheck(state)
  states <- mxDbGetProjectStates(idProject)
  hasKey <- !noDataCheck(key)
  userRole <- getUserRole()
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  if( isAdmin && hasState && hasKey){

    states[[key]] <- state

    mxDbSaveProjectData(idProject,list(
        states_views = states
        )
      )
    reactData$updateProject <- runif(1)
    mxFlashIcon("floppy-o")
  }
  mxToggleButton(
    id="btnSaveViewsState",
    disable = FALSE
    )
})
