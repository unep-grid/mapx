#
# Project views state
#

observeEvent(input$btnShowProjectViewsStates,{

  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  idProject <- reactData$project

  if( isAdmin ){

    mglGetProjectViewsState(list(
        idProject = idProject,
        idInput = 'projectViewsState'
        ))
  }
})

observeEvent(input$projectViewsState,{

  userRole <- getUserRole()
  idProject <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  
  if(noDataCheck(input$projectViewsState)){
    return()
  }

  if(!isAdmin){
    return()
  }

  stateKeys <- mxDbGetProjectStateKeys(idProject,language)

  ui = tagList(
    selectizeInput(
      "selectProjectStateKey",
      label = d("project_state_key",language,web=F),
      selected = stateKeys[0],
      choices = stateKeys,
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
  if( isAdmin && hasState && hasKey ){

    states <- lapply(states, function(s){
      if( s$id == key ){
        s$state <- state
      }else{
        s$state <- s$state
      }
      return(s)
      })

    mxDbSaveProjectData(idProject,list(
        states_views = states
        )
      )

    #
    # NOTE: updateProject has an impact on map position only, no other 
    # reactive dependency. We can skip it, as views list state does not
    # impact any command triggered by updateProject
    # reactData$updateProject <- runif(1)
    #
    mxFlashIcon("floppy-o")
  }
  mxToggleButton(
    id="btnSaveViewsState",
    disable = FALSE
    )
})
