#
# Invite a member to join a project
# - Directly, after clicking on a "invite new member" button
# - Indirectly, if a member sumbmited a membership application
# Both case are handled here.
observeEvent(input$btnShowInviteMember,{
  reactData$showInviteMember <- runif(1)
})

observeEvent(input$btnInviteMemberEmail,{
  reactData$showInviteMemberCompose <- runif(1)
})

#
# When map is ready, apply invite member action
#
observeEvent(reactData$mapIsReady,{
  if(reactData$mapIsReady){
    hasAction <- isNotEmpty(query$action)
    if(hasAction && .get(query$action,c("id")) == 'invite_member'){
      reactData$showInviteMemberCompose <- .get(query,c("action","data"))
    }
  }
})


#
# Display a modal for inviting new user
# - Single input : email
#
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
            class = "btn-square btn-black hint hint--top-left",
            'aria-label'=d("btn_invite_form_hint",language),
            disabled=TRUE
            
          )
        ),
       tags$span(
          class="input-group-btn",   
          actionButton(
            inputId = "btnAddMemberEmail",
            label= d("btn_add",language),
            class = "btn-square btn-black hint hint--top-left",
            'aria-label'=d("btn_add_user_hint",language),
            disabled=TRUE
          )
        )
        ),
      uiOutput("uiInviteMember_validation")
    )

    mxModal(
      id = "modalSendProjectInvite",
      title = d("project_invite_modal_title",language),
      content = ui,
      textCloseButton = d("btn_close",language,web=F)
    )
  }
})



#
# Validation of invitation email form 
#
observeEvent(input$txtInviteEmail,{

  email <-  input$txtInviteEmail
  isEmpty <- isEmpty(email)
  project <- reactData$project
  language <- reactData$language 
  isValid <- mxEmailIsValid(email)
  isRegistered <- mxDbEmailIsKnown(email)
  isMember <- FALSE
  isAddable <- FALSE
  errors <- logical(0)
  warning <- logical(0)

  if( isRegistered ){
    idUser <- mxDbGetIdFromEmail(email) 
    userRole <- mxDbGetProjectUserRoles(id=idUser,idProject=project)
    isMember <- userRole$member
    isAddable <- !isMember
  }

  if(!isEmpty){

    errors['error_email_not_valid'] <- !isValid
    warning['error_email_not_registered'] <- isValid && !isRegistered
    errors['error_email_is_member'] <- isMember

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

  mxToggleButton(
    id="btnAddMemberEmail",
    disable = !isAddable
  )
  reactData$inviteEmailHasError <- hasError
  reactData$inviteEmailIsAddable <- isAddable

})


#
# Display modal :
#  - Email message composer: 
#       - Direct invitation
#       - Invitation through join request
#
observeEvent(reactData$showInviteMemberCompose,{
  mxCatch('invite member compose',{

  # Init
 language <- reactData$language
  project <- reactData$project
  projectTitle <- mxDbGetProjectTitle(project,language)
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data
  emailAdmin <- userData$email
  modalTitle <- d('project_invite_message_compose',language)

  #
  # From a join request, data should be available
  #
  inviteData <- reactData$showInviteMemberCompose 
  isListInviteData <- isTRUE(
    isNotEmpty(inviteData) && class(inviteData) == "list"
  )
  if( isListInviteData ){
    #
    # If there is data -e.g. from query / join request.
    # Use that instead of form value
    #
    email <- inviteData$email_invite
    isValid <- mxEmailIsValid(email)
    if(!isValid){
      stop('invalid email from invitation data: '+ email)
    }
    languageCom <- mxDbGetUsersLanguageMatch(language,email)
    msgInvite <- mxParseTemplateDict("project_invite_message_confirm",languageCom,list(
        projectName = projectTitle
        ))
  }else{
    #
    # Use form data
    #
    email <- input$txtInviteEmail
    isValid <- mxEmailIsValid(email) || !isTRUE(reactData$inviteEmailHasError)
    if(!isValid){
      stop('invalid email from invite form: ' + email)
    }
    languageCom <- mxDbGetUsersLanguageMatch(language,email)
    msgInvite <- mxParseTemplateDict("project_invite_message",languageCom, list(
        projectName = projectTitle
        ))
  }

  #
  # Only admins can display invitation panel
  #
  if( isValid  && isAdmin ){

    #
    # Build UI for the text area form input
    #
    btn <- list()

    uiOutput <- tagList(
      tags$label(d("from",language)),
      tags$input(type="text","class"="form-control",disabled="true",value=emailAdmin),
      tags$label(d("to",language)),
      tags$input(type="text","class"="form-control",disabled="true",value=email),
      textAreaInput(
        inputId = "txtAreaInviteMessage",
        label = modalTitle,
        rows = "10",
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
      id = "modalSendProjectInviteForm",
      title = modalTitle,
      content = uiOutput,
      textCloseButton = d("btn_close",language),
      buttons = btn
    )

  }
  })
})
#
# Direct add user
#
observeEvent(input$btnAddMemberEmail,{
  mxCatch(title="Add user to project",{


    # New member
    email <- input$txtInviteEmail 
    idUser <- mxDbGetIdFromEmail(email)
    isValid <- mxEmailIsValid(email)
    isRegistered <- mxDbEmailIsKnown(email)
    project <- reactData$project

    # Current admin
    userRole <- getUserRole()
    isAdmin <- isTRUE(userRole$admin)
    language <- reactData$language

    # Update UI
    updateTextInput(
      session = session,
      inputId = "txtInviteEmail",
      value = ""
    )

    mxToggleButton(
      id="btnAddMemberEmail",
      disable = TRUE
    )

    if(!isAdmin || !isValid || !isRegistered){
      stop('Action unauthorized')
    }

    mxDbProjectAddUser(
      idProject = project,
      idUser = idUser,
      roles=c('members')
    )
    reactData$updateRoleList <- runif(1)
    mxFlashIcon('envelope')

  })

})

#
# Send invitation
#
observeEvent(input$btnSendInviteMessage,{
  mxCatch(title="Send invitation",{

    inviteData <- reactData$showInviteMemberCompose 
    if( isNotEmpty(inviteData) && class(inviteData) == "list"){
      email <- inviteData$email_invite
    }else{
      email <- input$txtInviteEmail 
    }

    if(!mxEmailIsValid(email)){
      stop("Invalid email: "+email)
    }

    userData <- reactUser$data
    emailAdmin <- userData$email
    isValid <- !isTRUE(reactData$inviteEmailHasError)
    language <- reactData$language
    msgInvite <- input$txtAreaInviteMessage
    project <- reactData$project
    projectTitle <- mxDbGetProjectTitle(project,language)
    userRole <- getUserRole()
    isAdmin <- isTRUE(userRole$admin)
    languageDest <- mxDbGetUserLanguage(email)
    timeNowSeconds <- as.numeric(Sys.time())


    modalTitle <- d('project_invite_message_compose',language)

    #
    # Only admins can send invitation
    #
    if( isValid  && isAdmin ){


      isTemplateValid <- mxParseTemplateHasKey(msgInvite,'link')

      if(!isTemplateValid){
        stop('Messsage not valid. Check for missing tag e.g. {{link}}')
      }

      # Create action link to auto_register user
      urlAction <- mxCreateEncryptedUrlAction("auto_register",list(
          email_auto = email,
          project = project,
          role = "member",
          timestamp = timeNowSeconds
          ))

      # Link label
      linkTitle <- mxParseTemplateDict('project_invite_message_accept',languageDest,list(
          project = projectTitle
          ))

      # Add link to text from <textarea>
      msgInvite <- mxParseTemplate(msgInvite,list(
          link = tags$a(href=urlAction,linkTitle),
          projectName = projectTitle
          ))

      # Text to HTML: convert \n to <br>
      msgInvite <- mxNewLineToBr(msgInvite)

      # Create subject
      subject <- mxParseTemplateDict('project_invite_message_subject',languageDest,list(
          project = projectTitle 
          ))

      # Title
      title <- dd('project_invite_message_title',languageDest)

      # Send mail with default template
      mxSendMail(
        from = emailAdmin,
        to = email,
        content = msgInvite,
        title = title,
        subject = subject,
        subtitle = subject,
        language = language
      )

      mxFlashIcon('envelope')

      mxModal(
        close = TRUE,
        id = "modalSendProjectInviteForm",
      )
      
      updateTextInput(
        session = session,
        inputId = "txtInviteEmail",
        value = ""
      )
    }

  })

})

#
# Notification to admins : someone used a auto_register link
#
observeEvent(reactData$notifyAdminAutoRegister,{
  data <- reactData$notifyAdminAutoRegister
  emailUser <- data$email
  timeExpire <- data$timeExpire
  emailContact <- mxDbGetProjectEmailContact(data$project) 
  languageDest <- mxDbGetUserLanguage(emailContact)
  projectTitle <- mxDbGetProjectTitle(data$project,languageDest)
  urlProject <- mxGetProjectUrl(data$project)

  #
  # NOTE: Should an email be sent if the link as been used multiple time ?
  #
  content <- mxParseTemplateDict('project_invite_notify_auto_register_email',languageDest,list(
      project = tags$a(href=urlProject,projectTitle),
      emailUser = emailUser,
      timeExpire = timeExpire
      ))

  subject <- mxParseTemplateDict('project_invite_notify_auto_register_email_subject', languageDest
    ,list(
      project = projectTitle
      ))

  mxSendMail(
    to = emailContact,
    subject = subject,
    content = content,
    useNotify = FALSE
  )

})
