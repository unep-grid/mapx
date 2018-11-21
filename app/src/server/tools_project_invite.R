
observeEvent(input$btnShowInviteMember,{
  reactData$showInviteMember <- runif(1)
})

observeEvent(reactData$mapIsReady,{
  if(reactData$mapIsReady){
    if(!noDataCheck(query$action) && isTRUE(.get(query$action,c("id")) == "confirmregister")){
      emailUser <- .get(query,c("action","value","emailUser"))
      reactData$showInviteMemberCompose <- list(
        emailUser = emailUser       
        )
    }
  }
})




observeEvent(reactData$showInviteMember,{

  emailToInvite <- ""
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language 
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  projectIsPublic <- mxDbGetProjectIsPublic(project)


  if( isAdmin ){

    ui <- tagList(
      tags$label(
        d("invite_member_email",language)
        ),
      div(
        class="input-group",
        style ="margin-bottom:10px",
        textInput(
          "txtInviteEmail",
          label = NULL,
          placeholder = d("email",language),
          value = emailToInvite
          ),
        tags$span(
          class="input-group-btn",   
          actionButton(
            inputId = "btnInviteMemberEmail",
            label= d("btn_invite",language),
            class = "btn-square btn-black",
            disabled=TRUE
            )
          )
        ),
      uiOutput("uiInviteMember_validation")
      )

    mxModal(
      id = "roleInfo",
      title = d("project_invite_modal_title",language),
      content = ui,
      textCloseButton = d("btn_cancel",language,web=F)
      )
  }
})



#
# Validation invite email
#
observeEvent(input$txtInviteEmail,{

  email <-  input$txtInviteEmail
  isEmpty <- noDataCheck(email)
  project <- reactData$project
  language <- reactData$language 
  isValid <- mxEmailIsValid(email)
  isRegistered <- mxDbEmailIsKnown(email)
  isMember <- FALSE
  errors <- logical(0)
  warning <- logical(0)

  if( isRegistered ){
    idUser <- mxDbGetIdFromEmail(email) 
    userRole <- mxDbGetProjectUserRoles(id=idUser,idProject=project)
    isMember <- userRole$member
  }

  if(!isEmpty){
    
    errors['error_email_not_valid'] <- !isValid
    warning['error_email_not_registered'] <- isValid && !isRegistered
    errors['error_email_already_member'] <- isMember

    errors <- errors[errors]
    hasError <- length(errors) > 0


    }else{
    hasError <- TRUE
  }

  output$uiInviteMember_validation <- renderUI(
      mxErrorsToUi(
        errors = errors,
        warning = warning,
        language = language
        )
      )

  mxToggleButton(
    id="btnInviteMemberEmail",
    disable = hasError
    )

  reactData$hasErrorInviteEmail <- hasError

})


observeEvent(input$btnInviteMemberEmail,{
   reactData$showInviteMemberCompose <- runif(1)
})

observeEvent(reactData$showInviteMemberCompose,{
  inviteData <- reactData$showInviteMemberCompose 
  isListInviteData <- isTRUE(!noDataCheck(inviteData) && class(inviteData) == "list" && !noDataCheck(inviteData$emailUser))
  language <- reactData$language
  project <- reactData$project
  projectTitle <- mxDbGetProjectTitle(project,language)
  modalTitle <- d('project_invite_message_compose',language)
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  emailAdmin <- userData$email
  

  #
  # If action was set in query, use that instead of form
  #
  if( isListInviteData ){
    email <- inviteData$emailUser
    isValid <- TRUE
    msgInvite <- d("project_invite_message_confirm",language)
  }else{
    email <- input$txtInviteEmail 
    isValid <- !isTRUE(reactData$hasErrorInviteEmail)
    msgInvite <- d("project_invite_message",language)
  }

  #
  # Hack. New lines are not respected by textArea input 
  #

  if( isValid  && isAdmin ){

    btn <- list()

    msgInvite <- mxUnescapeNewLine(msgInvite)
    msgInvite <- gsub("<projectname>",projectTitle,msgInvite)

    uiOutput <- tagList(
      tags$label(d("from",language)),
      tags$input(type="text","class"="form-control",disabled="true",value=emailAdmin),
      tags$label(d("to",language)),
      tags$input(type="text","class"="form-control",disabled="true",value=email),
      textAreaInput(
        inputId = "txtAreaInviteMessage",
        label=modalTitle,
        rows="10",
        value = msgInvite,
        placeholder = modalTitle 
        ),
      tags$p(d("project_invite_message_tips",language))
      )

    btn = list(
      actionButton(
        inputId = "btnSendInviteMessage",
        label = d("btn_send",language)
        ))

    mxModal(
      title = modalTitle,
      id = "modalSendProjectInvite",
      content = uiOutput,
      textCloseButton = d("btn_close",language),
      buttons = btn
      )

  }


})

observeEvent(input$btnSendInviteMessage,{
  mxCatch(title="Send invitation",{

    inviteData <- reactData$showInviteMemberCompose 
    if( !noDataCheck(inviteData) && class(inviteData) == "list" && !noDataCheck(inviteData$emailUser)){
      email <- inviteData$emailUser
    }else{
      email <- input$txtInviteEmail 
    }
    userData <- reactUser$data
    emailAdmin <- userData$email
    isValid <- !isTRUE(reactData$hasErrorInviteEmail)
    language <- reactData$language
    msgInvite <- input$txtAreaInviteMessage
    project <- reactData$project
    projectTitle <- mxDbGetProjectTitle(project,language)
    modalTitle <- d('project_invite_message_compose',language)
    userRole <- getUserRole()
    isAdmin <- isTRUE(userRole$admin)
    #
    # Hack. New lines are not respected by textArea input 
    #

    if( isValid  && isAdmin ){

     urlAction <- mxCreateEncryptedUrlAction("autoregister",list(
          email = email,
          project = project,
          role = "member",
          valid_until = as.numeric((Sys.time()+2*60*60*24))
          ))

      if(!grepl("<link>",msgInvite)) msgInvite <- msgInvite +"/n"+"<link>"

      msgInvite <- gsub("<link>",urlAction,msgInvite)

      mxSendMail(
        from = emailAdmin,
        to = email,
        body = msgInvite,
        subject = projectTitle    
        )

      mxModal(
      close = T,
      id  =  "modalSendProjectInvite"
      )

      mxModal(
        id = "modalSendProjectInvite",
        title = modalTitle,
        content = d('project_invite_message_sent',language)
        )

    }

})

})



