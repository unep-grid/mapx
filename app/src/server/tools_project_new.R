

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

  projectTitle <- input$txtProjectTitle
  language <- reactData$language 
  errors <- logical(0)
  warning <- logical(0)

  errors['error_title_short'] <- noDataCheck(projectTitle) || nchar(projectTitle) < 5
  errors['error_title_long'] <- nchar(projectTitle) > 50
  errors['error_title_bad'] <- mxProfanityChecker(projectTitle)
  errors['error_title_exists'] <-  mxDbProjectTitleExists(projectTitle)

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

observeEvent(input$btnAddProjectConfirm,{

  if(!isTRUE(reactData$projectAllowedToCreate)) return()
  if(isTRUE(reactData$projectAddHasError)) return()

  userRole <- getUserRole()

  project <- reactData$project 
  language <- reactData$language
  userData <- reactUser$data
  title <- reactData$projectAddTitle
  titles <- list()
  titles[language] <- title
  descriptions <- list()
  descriptions[language] <- title

  idProject <- reactData$projectAddId
  idCreator <- userData$id

  r <- mxDbGetProjectData(project)
  r$pid <- NULL
  r$id <- idProject 
  r$id_old <- NULL
  r$title <- titles
  r$description <- descriptions
  r$countries <- list()
  r$active <- TRUE
  r$creator <- idCreator
  r$admins <- list(idCreator)
  r$publishers <- list()
  r$members <- list()
  r$date_modified <- Sys.time()
  r$date_created <- Sys.time()
  r$public <- FALSE
  r$map_position <- list(lat=0,lng=0,zoom=2)
  r$views_external <- list()

  mxDbAddRow(r,"mx_projects")

  btns = list(
    actionButton("btnLoadNewProject",
      label=d("btn_load_new_project",language)
      )
    )

  mxModal(
    id = "createNewProject",
    title = d("project_new_title",language),
    textCloseButton = d("btn_close",language),
    buttons = btns,
    content = tags$span(sprintf(d("project_created",language,web=F),title))
    )

})


observeEvent(input$btnLoadNewProject,{
  reactData$project <- reactData$projectAddId
  mxModal(
    id = "createNewProject",
    close = TRUE
    )
})

