
#
# Hamdle logout process
#
observeEvent(input$btnLogout,{
  mxCatch(title="Logout",{
    reactUser <- reactiveValues()
    reactData <- reactiveValues()
   
    mxUpdateUrlParams(clean=T)
    mxUpdateValue(id="loginUserEmail",value="")
    mxSetCookie(
      deleteAll = TRUE,
      reloadPage = TRUE
      )
})
})

#
# Login email input validation 
#
observeEvent(input$loginUserEmail,{

  #  login validation timing 2-9 ms
  mxCatch(title="Login email validation",{

    email <- input$loginUserEmail
    emailIsValid <- mxEmailIsValid(email)

    mxUiHide(
      id="btnSendLoginKey",
      disable = !emailIsValid,
      hide = FALSE
      )

})
})

#
# Login send login key
#
observeEvent(input$btnSendLoginKey,{
  mxCatch(title="Btn send password event",{
    email <- input$loginUserEmail
    emailIsValid <- mxEmailIsValid(email)
    res <- NULL
    msg <- character(0) 

    if( !emailIsValid ){
      msg <- "Email is not valid"

    }else{

      mxUpdateValue(
        id="loginKey",
        value=""
        )

      #
      # Create the unique secret key
      #
      reactData$loginSecret <- randomString(
        splitSep="-",
        splitIn=5,
        addLetters=FALSE,
        addLETTERS=TRUE
        )

      mxUpdateText(
        id="txtLoginDialog",
        text="Generate strong password and send it, please wait..."
        )
      
      #
      # Send email
      #
      res <- try({

        template <- .get(config,c("templates","text","email_password"))

        text <- gsub("\\{\\{PASSWORD\\}\\}",reactData$loginSecret,template)

        mxSendMail(
          from = .get(config,c("mail","bot")),
          to = email,
          body = text,
          type = "text",
          subject = "MAP-X SECURE PASSWORD",
          wait = F
          )
      })

      if("try-error" %in% class(res)){

        msg <- "An error occured, sorry, We can't send you an email right now."

      }else{

        msg <- "An email has been sent, please check your email and copy the received password in the box."
        #
        # save the provided address as the input could be change during the interval.
        #
        reactData$loginUserEmail <- email
        #
        # Update UI
        #
        mxUiHide(
          id="btnSendLoginKey",
          disable=TRUE,
          hide=TRUE
          )
        mxUiHide(
          id="loginKey",
          disable=FALSE,
          hide=FALSE
          )
        mxUiHide(
          id="divEmailInput",
          disable=TRUE,
          hide=TRUE
          )

        reactData$loginTimerEndAt <- Sys.time() + .get(config,c("users","loginTimerMinutes")) * 60
        reactData$loginAttemptCounter <- 0
      }
    }

    mxUpdateText(
      id="txtLoginDialog",
      text=msg
      )
})
})

#
# key status 
# 
keyStatus <- reactive({
  mxCatch(title="Key status reactive obj.",{
    key <- gsub("[[:blank:]]","",input$loginKey)
    timer <- reactData$loginTimerEndAt
    secret <- reactData$loginSecret

    isolate({
      isEmpty = isTRUE(is.null(key)) || isTRUE(nchar(key)==0)
      isMalformed = !isTRUE(grepl("^(\\w{3}-\\w{3}-\\w{3}-\\w{3}-\\w{3})$",key))
      isWrong = !isTRUE(identical(key,secret))
      isOld = isTRUE("POSIXct" %in% class(timer) && timer - Sys.time() < 0)
      tooManyAttempts = FALSE

      if(!isEmpty && !isMalformed ){
        #
        # Begin counter for non malformed password
        #
        counter <- reactData$loginAttemptCounter
        reactData$loginAttemptCounter <- counter + 1    
        tooManyAttempts = isTRUE(counter > .get(config,c("users","loginMaxAttempts")))
      }


      list(
        isEmpty = isEmpty,
        isMalformed = isMalformed,
        isWrong = isWrong,
        isOld = isOld,
        tooManyAttempts = tooManyAttempts
        )

    })
})
})

#
# key validation 
#
observe({
  mxCatch(title="Key validation",{
    k <- keyStatus()
    msg <- ""
    #
    # If there is no error, log in
    #
    hasNoError <- !any(sapply(k,isTRUE))
    if( hasNoError ){

      # trigger login observer
      reactData$loginRequested <- runif(1)

      # close the panel
      mxModal(id="loginCode",close=T)

    }else{
      # only one message is returned : 
      #  I think that most probable causes password error are, in this order : 
      # 1. empty password
      # 2. malformed (unwanted characters)
      # 3. wrong password
      # 4. time limit reached.
      if(!k$isEmpty){
        if(k$isOld) msg <- "Time is up, please request a new password."
        if(k$isWrong) msg <- "The password is not correct"
        if(k$isMalformed) msg <- "The password in not valid"
        if(k$tooManyAttempts) msg <- "Too many attempts, please request a new password."

        mxUpdateText(
          id="txtLoginDialog",
          text=HTML(msg)
          )


      }


    }

})
})

#
# Handle new login 
#
observeEvent(reactData$loginRequested,{ 
  mxCatch(title="Login process",{

    #
    # get the email adress provided in input
    #
    email <- reactData$loginUserEmail

    #
    # Login : set cookies and get userdata
    #
    reactUser$data <- mxLogin(email,input$browserData);


    #
    # Execute login callback
    #
    if(!noDataCheck(reactData$onLoggedIn) && typeof(reactData$onLoggedIn) == "closure"){
      reactData$onLoggedIn()
      reactData$onLoggedIn <- NULL
    }
          
})
})


