

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

##
## Remove publishers and admins if there are removed from members
##
#observeEvent(input$selectProjectMembers,{
  #members <- input$selectProjectMembers 
  #admins <- input$selectProjectAdmins
  #publishers <- input$selectProjectPublishers
  
  #newAdmins <- admins[admins %in% members]
  #newPublishers <- publishers[publishers %in% members]

  #if( !identical(admins,newAdmins) ){
    #updateSelectizeInput(session,"selectProjectAdmins",selected=newAdmins)  
  #}
  #if( !identical(publishers,newPublishers) ){
    #updateSelectizeInput(session,"selectProjectPublishers",selected=newPublishers)  
  #}

#})
##
## Remove  admins if there are removed from publishers
## Add publishers to members if needed
##
#observeEvent(input$selectProjectPublishers,{
  #members <- input$selectProjectMembers
  #admins <- input$selectProjectAdmins
  #publishers <- input$selectProjectPublishers
  
  #newAdmins <- admins[admins %in% publishers]
  #newMembers <- unique(c(members,publishers))

  #if( !identical(admins,newAdmins) ){
    #updateSelectizeInput(session,"selectProjectAdmins",selected=newAdmins)  
  #}
  #if( !identical(members,newMembers) ){
    #updateSelectizeInput(session,"selectProjectMembers",selected=newMembers)
  #}
#})

##
## Add admins to members and publishers if needed
##
#observeEvent(input$selectProjectAdmins,{
  #members <- input$selectProjectMembers
  #admins <- input$selectProjectAdmins
  #publishers <- input$selectProjectPublishers
  
  #newMembers <- unique(c(admins,members))
  #newPublishers <- unique(c(admins,publishers))

  #if( !identical(publishers,newPublishers) ){
    #updateSelectizeInput(session,"selectProjectPublishers",selected=newPublishers)  
  #}
  #if( !identical(members,newMembers) ){
    #updateSelectizeInput(session,"selectProjectMembers",selected=newMembers)
  #}
#})


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
    members <- as.numeric(input$selectProjectMembers)
    admins <- as.numeric(input$selectProjectAdmins)
    publishers <- as.numeric(input$selectProjectPublishers)

    res <- list(
      new_members = members[ ! members %in% oldMembers ],
      new_publishers = publishers[ ! publishers %in% oldPublishers ],
      new_admins = admins[ ! admins %in% oldAdmins ],
      rem_members = oldMembers[ ! oldMembers %in% members ],
      rem_publishers = oldPublishers[ ! oldPublishers %in% publishers ],
      rem_admins = oldAdmins[ ! oldAdmins %in% admins ]
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





