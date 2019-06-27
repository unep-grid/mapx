

observeEvent(input$btnShowRoleManager,{

  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isAdmin <- isTRUE(userRole$admin)
  #emails <- as.list(mxDbGetEmailList(munged=T))
  userData <- reactUser$data
  projectIsPublic <- mxDbGetProjectIsPublic(project)


  if( isAdmin ){

    userList <- reactTableEditableUsers()

    userListAll <- c(
      userList$members,
      userList$publishers,
      userList$admins
      )
    
    #
    # create select input for members, publishers and admins
    #
    ui <- tagList(
      uiOutput("uiValidateProjectRoles"),
      selectizeInput(
        "selectProjectContacts",
        label = d("list_contacts",language,web=F),
        selected = unique(userList$contacts),
        choices = userList$admins,
        multiple = FALSE
        ),
      selectizeInput(
        "selectProjectAdmins",
        label = d("list_admins",language,web=F),
        selected = userList$admins,
        choices = userListAll,
        multiple = TRUE,
        options=list(
          plugins = list("remove_button"),
          sortField="label"
          )
        ),
      selectizeInput(
        "selectProjectPublishers",
        label = d("list_publishers",language,web=F),
        selected = unique(c(userList$admins,userList$publishers)),
        choices = userListAll,
        multiple = TRUE,
        options=list(
          plugins = list("remove_button"),
          sortField="label"
          )
        ),
      selectizeInput(
        "selectProjectMembers",
        label = d("list_members",language,web=F),
        selected = unique(c(userList$admins,userList$publishers,userList$members)),
        choices = userListAll,
        multiple = TRUE,
        options=list(
          sortField="label",
          plugins = list("remove_button")
          )
        ),
        tags$div(style="height:300px;")
      )

    btnSave <- actionButton(
      "btnSaveProjectConfigRoles",
      d("btn_save",language)
      )


    mxModal(
      id = "roleInfo",
      title = d("project_roles_modal_title",language),
      content = ui,
      textCloseButton = d("btn_cancel",language,web=F),
      buttons = list(btnSave)
      )
  }

})


observeEvent(input$selectProjectAdmins,{
  contacts <- unique(as.numeric(input$selectProjectContacts))
  admins <- unique(as.numeric(input$selectProjectAdmins))
  emails <- vapply(admins,mxDbGetEmailFromId,character(1))
  names(admins) <- emails

  if( ! contacts %in% admins ){
    contacts <- admins[1]
  }

  updateSelectizeInput(session,
    inputId = 'selectProjectContacts',
    selected = contacts, 
    choices = admins
    )
})



#
# Validation of roles
# 
observe({

  admins <- input$selectProjectAdmins

  isolate({
    idCurent <- .get(reactUser$data,c("id"))


    removedSelf <-  ! isTRUE(idCurent %in% admins)
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE
    hasAdmins <- !noDataCheck(admins)

    err[['error_roles_no_admins']] <- !hasAdmins
    err[['error_roles_removed_self']] <- removedSelf

    output$uiValidateProjectRoles <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    mxToggleButton(
      id="btnSaveProjectConfigRoles",
      disable = hasErrors
      )
  })
})


observeEvent(input$btnSaveProjectConfigRoles,{


  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isAdmin <- isTRUE(userRole$admin)
  btnCloseText = "btn_cancel"

  if(isAdmin){

    btnConfirm <- list()
    userList <- reactTableEditableUsers()
    oldPublic <- mxDbGetProjectIsPublic(project)
    oldMembers <- as.numeric(userList$members)
    oldPublishers <- as.numeric(userList$publishers)
    oldAdmins <- as.numeric(userList$admins)
    oldContacts <- as.numeric(userList$contacts)
    members <- as.numeric(input$selectProjectMembers)
    admins <- as.numeric(input$selectProjectAdmins)
    publishers <- as.numeric(input$selectProjectPublishers)
    contacts <- as.numeric(input$selectProjectContacts)

    res <- list(
      new_members = members[ ! members %in% oldMembers ],
      new_publishers = publishers[ ! publishers %in% oldPublishers ],
      new_admins = admins[ ! admins %in% oldAdmins ],
      new_contacts = contacts[ ! contacts %in% oldContacts ],
      rem_members = oldMembers[ ! oldMembers %in% members ],
      rem_publishers = oldPublishers[ ! oldPublishers %in% publishers ],
      rem_admins = oldAdmins[ ! oldAdmins %in% admins ],
      rem_contacts = oldContacts[ ! oldContacts %in% contacts ]
      )

    res <- sapply(res,mxDbGetEmailListFromId)
    res <- res[!sapply(res,noDataCheck)]

    if(length(res)>0){

      res <- sapply(res,paste,collapse=", ")
      ui <- listToHtmlSimple(res,lang=language)

      btnConfirm <- list(
        actionButton(
          "btnConfirmProjectConfigRoles",
          d("btn_confirm",lang=language,web=F)
          )
        )

    }else{
      btnCloseText <- "btn_close"
      ui <- d("no_changes",lang=language,web=F) 
    }

    mxModal(
      id = "roleInfo",
      title = d("project_roles_modal_title",language),
      content = ui,
      textCloseButton = d(btnCloseText,language,web=F),
      buttons = btnConfirm
      )

  }

})

observeEvent(input$btnConfirmProjectConfigRoles,{

  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isAdmin <- isTRUE(userRole$admin)

  if(isAdmin){

    members <- as.integer(input$selectProjectMembers)
    admins <- as.integer(input$selectProjectAdmins)
    publishers <- as.integer(input$selectProjectPublishers)
    contacts <- as.integer(input$selectProjectContacts)

      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = 'members',
        value = as.list(unique(members))
        )

      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = 'publishers',
        value = as.list(unique(publishers))
        )

      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = 'contacts',
        value = as.list(unique(contacts))
        )

      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = 'publishers',
        value = as.list(unique(publishers))
        )


      if(!noDataCheck(admins)){
        mxDbUpdate(
          table = "mx_projects",
          idCol = 'id',
          id = project,
          column = 'admins',
          value = as.list(unique(admins))
          )
      }

    reactData$updateRoleList <- runif(1)

    ui = tags$span(d("roles_updated",lang=language,web=F));
    
    mxModal(
      id = "roleInfo",
      title = d("project_roles_modal_title",language),
      content = ui
      )

  }

})





