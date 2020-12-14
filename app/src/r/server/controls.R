

observeEvent(input$btn_control,{
  mxCatch("controls.R",{
    switch(input$btn_control$value,
      "showAbout" = {
        reactChainCallback('showAbout')
      },
      "showLanguage" = {
        reactChainCallback('showLanguages')
      },
      "showProject" = {
        if(!isTRUE(query$lockProject)){
          reactChainCallback('showProjectsList')
        }
      },
      "showLogin" = {
        reactChainCallback('showLogin')
      }
    )
})
})



observeEvent(reactChain$showLogin,{
  btn <- list()
  userInfo <- ""
  userRole <- getUserRole()
  language <- reactData$language
  project <- reactData$project
  projectData <- mxDbGetProjectData(project)
  projectName <- .get(projectData,c("title",language))
  projectAllowsJoin <- isTRUE(.get(projectData,c("allow_join")))
  #titleModalLogin <- titleModalLogin + " (" + projectName + ")"

  event <- reactChain$showLogin 
  msgLogin <- ""
  reactData$onLoggedIn <- function(){}
  userIsGuest <- isGuestUser()
  showForm <- userIsGuest

  #
  # Register actions after login
  #
  reactChainCallbackHandler(reactChain$showLogin,
    #
    # Show project list after log in
    #
    type  = 'login_requested_project_list',
    expr = {
      msgLogin <- reactChain$showLogin$message
      reactChainCallback("onLoggedIn",
        type = "on_logged_in",
        callback = reactChain$showLogin$callback
      )
    })
  reactChainCallbackHandler(reactChain$showLogin,
    #
    # Change project after login
    #
    type  = 'login_requested_project_access',
    expr = {
      msgLogin <- reactChain$showLogin$message
      showForm <- TRUE 
      reactChainCallback("onLoggedIn",
        type = "on_logged_in",
        callback = reactChain$showLogin$callback
      )
    })

  # 
  # If not logged or show form requested
  #
  if( showForm ){

    txtSubTitle <- d("login_subtitle",language)
    titleModalLogin <- d("user_authentication",language)

    uiOut <- div(
      div(id="divEmailInput",
        class="input-group mx-login-group",
        mxInputUser(
          inputId="loginUserEmail",
          label=d("login_email",language,web=F),
          class="mx-login-input-black form-control"
          ),
        tags$span(
          class="input-group-btn",   
          actionButton(
            inputId="btnSendLoginKey", 
            label= d("login_send_pwd",language),
            class="btn-square btn-black",
            disabled=TRUE
          )
        ) 
        ),
      div(
        tags$input(
          id="loginKey",
          type="text",
          placeholder = d("login_insert_pwd",language,web=F),
          class="form-control mx-login-input mx-login-input-black  mx-hide"
        )
        ),
      div(
        class="mx-login-info",
        tags$p(d("login_info_box",language))
      )
    )

  }else{

    #
    # If already logged, display the session status
    #

    idUser  <- .get(reactUser,c("data","id"))
    txtSubTitle <- d("login_user_status",language)
    titleModalLogin <- d("user_profile",language)
    groupNames <- d(as.character(userRole$groups),lang=language)
    groupNames <- paste(groupNames,collapse=", ")

    loginStatus <- listToHtmlSimple(list(
        "login_project"=mxDbGetProjectTitle(project,language),
        "login_email"=.get(reactUser,c("data","email")),
        "login_groups"= groupNames
        ),lang=language)

    btnJoinProject <- actionButton(
      inputId='btnJoinProject',
      label <- sprintf(d('btn_join_current_project',language),projectName)
    )

    btn <- tagList(
      actionButton(
        inputId = "btnLogout",
        label = d("login_out",language),
        class="btn btn-modal"
      )
    )

    uiOut <- tagList(
      loginStatus,
      tags$div(id='mxListProjects')
    )

    if(!userRole$member && projectAllowsJoin){
      btn <- tagList(
        btn,
        btnJoinProject
      )
    }

  }

  #
  # Build the final modal 
  #
  mxModal(
    id="loginCode",
    buttons=btn,
    replace = T,
    title = titleModalLogin,
    textCloseButton=d("btn_close",language),
    content = tags$div(
      tags$b(
        tags$span(msgLogin),
        tags$div(id="txtLoginDialog",txtSubTitle)
        ),
      uiOut
    )
  )

})



observeEvent(reactChain$showLanguages,{

  language <- reactData$language
  languages <- config[["languages"]][["list"]]

  mxModal(
    id="uiSelectLanguage",
    title = d("ui_language",language),
    textCloseButton=d("btn_close",language),
    content = selectizeInput(
      inputId="selectLanguage",
      choices=languages,
      label=d("ui_language",language),
      selected=language
    )
  )

})

#
# Show about panel
#
observeEvent(reactChain$showAbout,{
  userRole <- getUserRole()
  userData <- reactUser$data

  language <- reactData$language
  languageDefault <- config$languages$list[[1]]
  about <- mxDbConfigGet("about")

  out = tagList()

  if(!noDataCheck(about) && typeof(about) == "list"){

    out <- lapply(about,function(ab){
      #
      # Get correct conttent according to language, with default. 
      # NOTE: this could be done in DB.
      #
      title <- .get(ab,c("title",language))
      if(noDataCheck(title)) title <- .get(ab,c("title",languageDefault))
      content = .get(ab,c("content",language))
      if(noDataCheck(content)) content = .get(ab,c("content",languageDefault))

      section <- tags$section(
        tags$h4(title),
        tags$p(HTML(content))
      )

      return(section)})
  }

  mxModal(
    id="uiShowAbout",
    title=d("title_about",language),
    textCloseButton=d("btn_close",language),
    content = tagList(out)
  )

})

