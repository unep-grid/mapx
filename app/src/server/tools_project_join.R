


#
# Request project membership
#

observeEvent(input$requestProjectMembership,{
  reactData$requestProjectMembership <- input$requestProjectMembership;
})

observeEvent(input$btnJoinProject,{
   reactData$requestProjectMembership <- list(id=reactData$project,date=Sys.time())
})


observeEvent(reactData$requestProjectMembership,{
  
  emailAdmin <- ""
  emailUser <- ""
  projectRequestData <- reactData$requestProjectMembership
  project <- projectRequestData$id

  if(noDataCheck(project)) return()

  userData <- reactUser$data
  language <- reactData$language
  msgRequestMembership <- d("project_request_membership_message",language)
  projectTitle <- mxDbGetProjectTitle(project,language)
  modalTitle <- d('project_request_membership_message_compose',language)
  userRole <- mxDbGetProjectUserRoles(userData$id,project)
  isNotMember <- !isTRUE(userRole$member)
  isGuest <- isGuestUser()

  if( !isGuest ){
    emailUser <- userData$email
  }

  if( isNotMember ){

    btn <- list()
    msgRequestMembership <- mxUnescapeNewLine(msgRequestMembership)
    msgRequestMembership <- gsub("<projectname>",projectTitle,msgRequestMembership)

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


observeEvent(input$btnSendRequestMembershipMessage,{
  mxCatch(title="Send invitation",{

    if(reactData$hasErrorRequestMembership) return()

    language <- reactData$language
    projectRequestData <- reactData$requestProjectMembership
    project <- projectRequestData$id
    projectData <- mxDbGetProjectData(project)
    projectTitle <- projectData$title[language]
    projectAdmin <- projectData$admins
    nAdmins <- length(projectAdmin)
    if( nAdmins>1 ) projectAdmin <- projectAdmin[ceiling(runif(1)*nAdmins)]
    emailAdmin <- mxDbGetEmailListFromId(projectAdmin)
    
    #
    # TO REMOVE IN PROD
    #
    #emailAdmin <- "frederic.moser@unepgrid.ch"

    emailUser <- input$txtEmailRquestMembership 
    emailUserIsRegistered <- mxDbEmailIsKnown()
    urlAction <- mxCreateEncryptedUrlAction("confirmregister",list(
        emailUser = emailUser,
        emailAdmin = emailAdmin,
        project = project,
        role = "member"
        ))

    msgRequestMembership <- input$txtAreaRequestMembershipMessage
    msgRequest <- d("project_request_membership_message_recap",language)
    msgRequest <- mxUnescapeNewLine(msgRequest)
    msgRequest <- gsub("<msg>",msgRequestMembership,msgRequest)
    msgRequest <- gsub("<from>",emailUser,msgRequest)
    msgRequest <- gsub("<link>",urlAction,msgRequest)
    msgRequest <- gsub("<data>",toJSON(projectRequestData),msgRequest)


    mxSendMail(
      from = emailUser,
      to = emailAdmin,
      body = msgRequest,
      subject = "[ membership request ]" + projectTitle    
      )

    mxModal(
      close = T,
      id  =  "modalSendProjectRequestMembership"
      )

    mxModal(
      id = "modalSendProjectRequestMembership",
      title = projectTitle,
      content = d('project_request_membership_message_sent',language)
      )

    })


})



