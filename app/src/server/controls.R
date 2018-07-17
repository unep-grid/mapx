

observeEvent(input$btn_control,{

  mxCatch("controls.R",{
    switch(input$btn_control$value,
      "showAbout"= {
        reactData$showAbout <- runif(1)
      },
      "showLanguage"={
        reactData$showLanguages <- runif(1)
      },
      "showProject"={
        if(!isTRUE(query$lockProject)){
          reactData$showProjectsList <- runif(1)
        }
      },
      "showLogin"={
        reactData$showLogin <- runif(1)
      }
      )
})
})





observeEvent(reactData$showLogin,{
  btn <- list()
  userInfo <- ""
  userRole <- getUserRole()
  language <- reactData$language
  project <- reactData$project
  titleModalLogin <- d("user_profile",language)
  projectData <- mxDbGetProjectData(project)
  projectName <- .get(projectData,c("title",language))
  titleModalLogin <- titleModalLogin + " (" + projectName + ")"
  event <- reactData$showLogin 
  msgLogin <- ""
  reactData$onLoggedIn <- function(){}


  if(typeof(event) == "list" && !noDataCheck(event$msg) ){
     msgLogin <- event$msg
    if(typeof(event$then) == 'closure'){
      reactData$onLoggedIn = event$then
    }
  }
  # 
  # If not logged, build an input form
  #
  if( isGuestUser() ){

    txtSubTitle <- d("login_subtitle",language)
    
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
        )
      )

  }else{

    #
    # If already logged, display the session status
    #

    idUser  <- .get(reactUser,c("data","id"))
    txtSubTitle <- d("login_user_status",language)
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

    if(!userRole$member){
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
    #textCloseButton=d("login_cancel",language),
    textCloseButton=d("btn_close",language),
    content=tags$div(
      tags$b(style="color:red",msgLogin),
      tags$b(div(id="txtLoginDialog",txtSubTitle)),
      uiOut
      )
    )
  # 
  # Render it to panel login div
  #
  #output$panelLogin = renderUI(panModal)

})



observeEvent(reactData$showLanguages,{

  language <- reactData$language
  languages <- config[["languages"]][["list"]]

  mxModal(
    id="uiSelectLanguage",
    textCloseButton=d("btn_close",language),
    content = selectizeInput(
      inputId="selectLanguage",
      choices=languages,
      label=d("ui_language",language),
      selected=language,
      options=list(
        dropdownParent="body"
        )
      )
    )

})

#
# Show about panel
#
observeEvent(reactData$showAbout,{
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


#
# Trigger render user project list
#
observeEvent(reactData$renderUserProjectsList,{
  session$sendCustomMessage("mxRenderUserProjectsList",reactData$renderUserProjectsList)
})
