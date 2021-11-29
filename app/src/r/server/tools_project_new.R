

observeEvent(input$btnShowAddProject,{

  userRole <- getUserRole()
  isGuest <- isGuestUser()
  language <- reactData$language 
  userData <- reactUser$data
  isProjectCreator <- reactData$projectAllowedToCreate
  
  if( isGuest || !isProjectCreator ) return();

    language <- reactData$language
    idProject <- randomString(
      prefix="MX-",
      splitIn=5,
      addLetters=F,
      addLETTERS=T,
      splitSep="-",
      sep="-"
      )

    reactData$projectAddId <- idProject

    buttons <- list(
      actionButton(
        inputId = "btnAddProjectConfirm",
        label = d("create",language),
        enanle = FALSE
        )
      )

    mxModal(
      id = "createNewProject",
      title = d("project_new_title",language),
      buttons = buttons,
      textCloseButton = d("btn_cancel",language),
      content = tags$div(
        textInput(
          inputId = "txtProjectTitle",
          label = d("project_new_title",language),
          value = idProject
          )
        )
      )
})

#
# Validate
#
observeEvent(input$txtProjectTitle,{

  if(!isTRUE(reactData$projectAllowedToCreate)) return()

  mxCatch('Validate project title',{

    v <- .get(config,c('validation','input','nchar'))
    projectTitle <- trimws(input$txtProjectTitle)
    language <- reactData$language 
    errors <- logical(0)
    warning <- logical(0)
    errors['error_title_short'] <- noDataCheck(projectTitle) || nchar(projectTitle) < v$projectTitle$min
    errors['error_title_long'] <- nchar(projectTitle) > v$projectTitle$max
    errors['error_title_bad'] <- mxProfanityChecker(projectTitle)
    errors['error_title_exists'] <- mxDbProjectTitleExists(projectTitle)
    errors <- errors[errors]
    hasError <- length(errors) > 0

    if(hasError) projectTitle <-  reactData$projectAddId

    mxUiHide(
      id = "btnAddProjectConfirm",
      hide = FALSE,
      disable = hasError
    )

    output$createNewProject_validation <- renderUI(
      mxErrorsToUi(
        errors = errors,
        warning = warning,
        language = language
      )
    )

    reactData$projectAddHasError <- hasError
    reactData$projectAddTitle <- projectTitle
      })
})

observeEvent(input$btnAddProjectConfirm,{

  if(!isTRUE(reactData$projectAllowedToCreate)) return()
  if(isTRUE(reactData$projectAddHasError)) return()

  userRole <- getUserRole()

  language <- reactData$language
  userData <- reactUser$data
  title <- reactData$projectAddTitle
  titles <- list()
  titles[language] <- title
  titles['en'] <- title
  descriptions <- list()
  descriptions[language] <- title
  descriptions['en'] <- title

  idProject <- reactData$projectAddId
  idCreator <- userData$id

  r = list(
    id =  idProject,
    title = titles,
    description = descriptions,
    countries = list(),
    active = TRUE,
    creator = idCreator,
    admins = list(idCreator),
    members = list(),
    publishers = list(),
    contacts = list(idCreator),
    date_modified = Sys.time(),
    date_created = Sys.time(),
    public = FALSE,
    map_position = list(lat=0,lng=0,zoom=1),
    views_external = list(),
    alias = character(1),
    states_views = list()
    )

  mxDbAddRow(r,"mx_projects")

  btns = list(
    actionButton("btnLoadNewProject",
      label=d("btn_load_new_project",language)
      )
    )

  msg <- mxParseTemplateDict("project_created",language,list(
        title = title
      ))

  mxModal(
    id = "createNewProject",
    title = d("project_new_title",language),
    textCloseButton = d("btn_close",language),
    buttons = btns,
    content = tags$span(msg)
    )

})


observeEvent(input$btnLoadNewProject,{
  mxModal(
    id = "createNewProject",
    close = TRUE
    )
  mglUpdateProject(reactData$projectAddId)
})

