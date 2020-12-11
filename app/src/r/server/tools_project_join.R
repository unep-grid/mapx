#
# Request project membership
#

#
# Trigger request project join/membership:
#  - from project list : data from object
#  - using direct button : data from current project
observeEvent(input$requestProjectMembership,{
  reactData$requestProjectMembership <- input$requestProjectMembership;
})
observeEvent(input$btnJoinProject,{
  reactData$requestProjectMembership <- list(id=reactData$project,date=Sys.time())
})

#
# Show modal with textarea
#
observeEvent(reactData$requestProjectMembership,{

  projectRequestData <- reactData$requestProjectMembership
  project <- projectRequestData$id

  if(noDataCheck(project)) return()

  userData <- reactUser$data
  language <- reactData$language
  projectTitle <- mxDbGetProjectTitle(project,language)
  projectData <- mxDbGetProjectData(project)
  modalTitle <- d('project_request_membership',language)
  userRole <- mxDbGetProjectUserRoles(userData$id,project)
  projectAllowsJoin <- isTRUE(.get(projectData,c('allow_join')))
  isNotMember <- !isTRUE(userRole$member)
  isGuest <- isGuestUser()
  emailContact <- mxDbGetProjectEmailContact(project)

  if( !isGuest ){
    emailUser <- userData$email
  }

  languageCom <- mxDbGetUsersLanguageMatch(language,emailContact)

  if( isNotMember && projectAllowsJoin ){

    btn <- list()

    msgRequestMembership <- mxParseTemplateDict("project_request_membership_message",languageCom, list(
        projectName = projectTitle
        ))

    uiOutput <- tagList(
      textInput(
        inputId = "txtEmailRquestMembership",
        label = d("from",language),
        value = emailUser
        ),
      textAreaInput(
        inputId = "txtAreaRequestMembershipMessage",
        label = modalTitle,
        rows = "10",
        value = msgRequestMembership,
        placeholder = modalTitle 
        ),
      uiOutput("uiValidateRquestMembership")
    )

    btn = list(
      actionButton(
        inputId = "btnSendRequestMembershipMessage",
        label = d("btn_send",language),
        enabled = FALSE
        ))

    mxModal(
      title = modalTitle,
      id = "modalSendProjectRequestMembership",
      content = uiOutput,
      textCloseButton = d("btn_close",language),
      buttons = btn
    )

  }

})

#
# Validation requestMembership email
#
observe({

  requestMessage <-  input$txtAreaRequestMembershipMessage
  email <-  input$txtEmailRquestMembership
  language <- reactData$language
  projectRequestData <- reactData$requestProjectMembership
  project <- projectRequestData$id


  isEmailNotValid <- !mxEmailIsValid(email)
  isMessageTooLong <- nchar(requestMessage) > 500
  isMessageTooShort <- nchar(requestMessage) < 10
  isMessageBad <- mxProfanityChecker(requestMessage)
  isEmailBad <- mxProfanityChecker(email)

  isEmailMember <- !isEmailNotValid && mxDbProjectCheckEmailMembership(
    idProject = project,
    email = email
  )

  errors <- logical(0)
  warning <- logical(0)

  errors['error_msg_too_short'] <- isMessageTooShort 
  errors['error_msg_too_long'] <- isMessageTooLong
  errors['error_msg_bad'] <- isMessageBad
  errors['error_email_bad'] <- isEmailBad
  errors['error_email_not_valid'] <- isEmailNotValid
  if(!isEmailNotValid) errors['error_email_is_member'] <- isEmailMember

  errors <- errors[errors]
  hasError <- length(errors) > 0

  output$uiValidateRquestMembership <- renderUI(
    mxErrorsToUi(
      errors = errors,
      warning = warning,
      language = language
    )
  )

  mxToggleButton(
    id="btnSendRequestMembershipMessage",
    disable = hasError
  )

  reactData$hasErrorRequestMembership <- hasError

})


#
# Send message
#
observeEvent(input$btnSendRequestMembershipMessage,{
  mxCatch(title="Send invitation",{

    if(reactData$hasErrorRequestMembership) return()

    language <- reactData$language
    projectRequestData <- reactData$requestProjectMembership
    project <- projectRequestData$id

    emailUser <- input$txtEmailRquestMembership 
    emailUserIsRegistered <- mxDbEmailIsKnown(emailUser)
    emailContact <- mxDbGetProjectEmailContact(project)
    languageContact <- mxDbGetUserLanguage(emailContact)
   
    projectTitle <- mxDbGetProjectTitle(project,languageContact)


    # Message
    msgRequestMembership <- input$txtAreaRequestMembershipMessage

    #
    # Action link that will open mapx, log in, and open the invitation window. 
    # data evaluated in mxLogin().
    #
    urlAction <- mxCreateEncryptedUrlAction("invite_member",list(
        email_invite = emailUser,
        email_admin = emailContact,
        project = project,
        role = "member"
        ))
    linkTitle <- mxParseTemplateDict('project_join_message_reply',languageContact,list(
        project = projectTitle,
        email = emailUser
        ))
    
    # Link to the project
    projectUrl <- mxGetProjectUrl(project)
    projectUrlTitle <- mxParseTemplateDict('project_open_url',languageContact,list(
      project = projectTitle
    ))

    # Email subject
    title <- d('project_request_membership',languageContact)

    # Email subject
    subject <- mxParseTemplateDict('project_request_membership_subject',languageContact,list(
          project = projectTitle
          ))

    msgRequest <- mxParseTemplateDict('project_request_membership_message_recap',languageContact,list(
        msg = msgRequestMembership,
        from = emailUser,
        userStatus = ifelse(emailUserIsRegistered,'Registered','Unregistered'),
        actionUrl = tags$a(href=urlAction,linkTitle),
        projectUrl= tags$a(href=projectUrl,projectUrlTitle),
        data = toJSON(projectRequestData)
        ))


    mxSendMail(
      from = emailUser,
      to = emailContact,
      content = msgRequest,
      title = title,
      subject = subject,
      subtitle = subject,
      language = language
    )


    mxModal(
      id = "modalSendProjectRequestMembership",
      close = true
    )

    mxFlashIcon('envelope')

  })
})
