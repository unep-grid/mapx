

observeEvent(input$switchUser,{
  reactData$rootToken =    randomString(prefix='mx',n=20,splitIn=4,addSymbols=T)  
  data <- input$switchUser
  language <- reactData$language

  if(noDataCheck(data)){
    data <- list()
  }

  id_user <- .get(reactUser$data,c("id"))
  email_user <- .get(reactUser$data,c("email"))
  root_members <- .get(config,c("root_mode","members"))

  mxCatch("Swich user mode",{

    if(id_user %in% root_members){

      emails <- mxDbGetEmailList()

      #
      #
      #
      ui <- tagList(
        selectInput("selectSwitchUserId",
          label = "User list",
          choices = emails,
          selected = data$id
          ),
        textInput("txtSwitchUserToken",
          label = "Enter provided token"
          ),
        checkboxInput("checkSwitchUserPrivacyConfirm",
          label = "I will respect privacy of this user; I will think before any actions; I will immediately log out after doing my job."
          )
        )


      btns <- tagList(
        actionButton("btnSwitchUser",
          label = "Switch user"
          )  
        )


      mxModal(
        id = "switch_user",
        title = "Switch user",
        content = ui,
        textCloseButton = "Cancel",
        buttons = btns
        )

      #
      # Send email
      #
      text <- mxParseTemplateDict('login_single_use_password_email',language,list(
             password = reactData$rootToken
          ))

      status <- mxSendMail(
        from = .get(config,c("mail","bot")),
        to = email_user,
        subject = "SWITCH USER TOKEN",
        content = text,
        language = language
        )

      if(!isTRUE(status$success)){
        reactData$rootToken <- NULL
      }

    }else{
      reactChainCallback('forceLogout')
    }

})
})

observeEvent(input$btnSwitchUser,{
  mxModal(close=TRUE,id="switch_user")
  id_user <- .get(reactUser$data,c("id")) 
  id_user_target <- input$selectSwitchUserId
  token_root_input <- input$txtSwitchUserToken

  token_root <- reactData$rootToken
  hasToken <- !noDataCheck(token_root)
  isValidToken <- hasToken  && identical(token_root_input,token_root)
  isValidCheckPrivacy <- isTRUE(input$checkSwitchUserPrivacyConfirm)
  isValidId <- id_user_target %in% mxDbGetEmailList() 
  isAuthorised <- id_user %in% .get(config,c("root_mode","members"))

  reactData$rootToken <- NULL

  if(isValidId && isValidToken && isValidCheckPrivacy && isAuthorised ){
    target_email <- mxDbGetEmailFromId(id_user_target)
    reactData$loginUserEmail <- target_email
    reactChainCallback('loginRequested')
  }else{
    reactData$forceLogout <- runif(1) 
  }

})
