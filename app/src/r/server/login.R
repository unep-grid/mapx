
#
# Hamdle logout process
#

observeEvent(input$btnLogout, {
  reactChainCallback("forceLogout")
})


observeEvent(reactChain$forceLogout, {
  isolate({
    mxCatch(title = "Logout", {
      reactUser <- reactiveValues()
      reactData <- reactiveValues()
      mxUpdateQueryParameters(list(
        project = ""
      ))
      mxUpdateValue(id = "loginUserEmail", value = "")
      mxSetCookie(
        deleteAll = TRUE,
        reloadPage = TRUE
      )
    })
  })
})

#
# Login email input validation
#
observeEvent(input$loginUserEmail, {

  #  login validation timing 2-9 ms
  mxCatch(title = "Login email validation", {
    email <- input$loginUserEmail
    emailIsValid <- mxEmailIsValid(email)

    mxUiHide(
      id = "btnSendLoginKey",
      disable = !emailIsValid,
      hide = FALSE
    )
  })
})

#
# Login send login key
#
observeEvent(input$btnSendLoginKey, {
  mxCatch(title = "Btn send password event", {
    email <- input$loginUserEmail
    emailIsValid <- mxEmailIsValid(email)
    msg <- character(0)
    language <- reactData$language

    if (!emailIsValid) {
      msg <- "Email is not valid"
    } else {
      mxUpdateValue(
        id = "loginKey",
        value = ""
      )

      #
      # Create the unique secret key
      #
      reactData$loginToken <- randomString(
        splitSep = "-",
        splitIn = 5,
        addLetters = FALSE,
        addLETTERS = TRUE
      )

      mxUpdateText(
        id = "txtLoginDialog",
        text = "Generate strong password and send it, please wait..."
      )

      #
      # Send email
      #
      subject <- dd("login_single_use_password_email_subject", language)
      msgPassword <- mxParseTemplateDict("login_single_use_password_email", language, list(
        password = reactData$loginToken
      ))

      status <- mxSendMail(
        to = email,
        content = msgPassword,
        subject = subject,
        language = language
      )

      #
      # Handle issues
      #
      if (!isTRUE(status$success)) {

        #
        # Simple error message for dialog txt
        #
        msg <- d("login_pwd_mail_sent_error", language)
      } else {
        #
        # Simple success message for dialog txt
        #
        msg <- d("login_pwd_mail_sent", language)
        #
        # save the provided address as the input could be change during the interval.
        #
        reactData$loginUserEmail <- email
        #
        # Update UI
        #
        mxUiHide(
          id = "btnSendLoginKey",
          disable = TRUE,
          hide = TRUE
        )
        mxUiHide(
          id = "loginKey",
          disable = FALSE,
          hide = FALSE
        )
        mxUiHide(
          id = "divEmailInput",
          disable = TRUE,
          hide = TRUE
        )

        reactData$loginTimerEndAt <- Sys.time() + .get(config, c("users", "loginTimerMinutes")) * 60
        reactData$loginAttemptCounter <- 0
      }
    }

    mxUpdateText(
      id = "txtLoginDialog",
      text = msg
    )
  })
})

#
# key validation
#
observe({
  mxCatch(title = "Key validation", {
    k <- keyStatus()
    msg <- ""
    #
    # If there is no error, log in
    #
    hasNoError <- !any(sapply(k, isTRUE))
    if (hasNoError) {

      # trigger login observer
      reactChainCallback("loginRequested")

      # close the panel
      mxModal(id = "loginCode", close = T)
    } else {
      # only one message is returned :
      #  I think that most probable causes password error are, in this order :
      # 1. empty password
      # 2. malformed (unwanted characters)
      # 3. wrong password
      # 4. time limit reached.
      if (!k$isEmpty) {
        if (k$isOld) msg <- "Time is up, please request a new password."
        if (k$isWrong) msg <- "The password is not correct"
        if (k$isMalformed) msg <- "The password in not valid"
        if (k$tooManyAttempts) msg <- "Too many attempts, please request a new password."

        mxUpdateText(
          id = "txtLoginDialog",
          text = HTML(msg)
        )
      }
    }
  })
})

#
# Handle new login
#
observeEvent(reactChain$loginRequested, {
  mxCatch(title = "Login process", {

    #
    # get the email adress provided in input
    #
    email <- reactData$loginUserEmail

    #
    # Login : set cookies and get userdata
    #
    userInfo <- mxLogin(
      email = email,
      browserData = input$browserData,
      reactData = reactData
    )

    reactUser$data <- userInfo$info
    reactUser$token <- userInfo$token

    #
    # Execute login callback
    #
    if (!noDataCheck(reactChain$onLoggedIn)) {
      reactChainCallbackHandler(reactChain$onLoggedIn,
        type = "on_logged_in",
        expr = {
          reactChain$onLoggedIn$callback()
          reactChain$onLoggedIn <- NULL
        }
      )
    }
  })
})
