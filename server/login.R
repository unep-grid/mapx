#                             
#  _ __ ___   __ _ _ __   __  __
# | '_ ` _ \ / _` | '_ \  \ \/ /
# | | | | | | (_| | |_) |  >  < 
# |_| |_| |_|\__,_| .__/  /_/\_\
#                 | |           
#                 |_|           
# login and restriction  management


reactUser$data <- list()


#
# Handle reconnection from cookie stored information
#
observeEvent(input$cookies,{
  mxCatch(title="Reconnection from cookie",{

    dat <- NULL
    res <- NULL
    cookies <- input$cookies
    
    #
    # If there is values in cookies
    #
    if(isTRUE(length(cookies)>0)){
      #
      # Look for the default cookie name (e.g. mx_data)
      #
      dat <- mxDbDecrypt(cookies[[config[["users"]][["cookieName"]]]])
      #
      # If there is no error, fetch current email from stored id
      #
      if(!isTRUE("try-error" %in% class(dat)) && isTRUE(length(dat)>0)){
        id <- dat$id
        quer <- sprintf(
          "SELECT email 
          FROM %1$s WHERE 
          id=%2$s AND 
          validated='true' AND 
          hidden='false'",
          config[["pg"]][["tables"]][["users"]],
          id
          )
        res <- mxDbGetQuery(quer)
      }
    }

    #
    # If email is valid, use this to set as login email 
    # 
    if(mxEmailIsValid(res$email)){
      #
      # Login with valid email
      #
      reactData$loginUserEmail <- res$email
    }else{
      #
      # Login with guest
      #
      reactData$loginUserEmail <- config[["mail"]][["guest"]]
      #
      # Enable login panel 
      #
      mxUiHide(
        id = "mxPanelLogin",
        disable = FALSE,
        hide = FALSE
        )
      # if there is no guest account, create it
      if(!mxDbEmailIsKnown(config[["mail"]][["guest"]])){
        mxDbCreateUser(config[["mail"]][["guest"]])  
      }
    }


    #
    # Trigger login observer
    #

    reactData$loginRequested <- runif(1) 
})
})

#
# Hamdle logout process
#
observeEvent(input$btnLogout,{
mxCatch(title="Logout",{
    reactUser <- reactiveValues()
    reactData <- reactiveValues()
    mxUpdateValue(id="loginUserEmail",value="")
    mxSetCookie(
      deleteAll=TRUE,
      reloadPage=TRUE
      )
})
})

#
# Handle login window
#

observeEvent(input$btnLogin,{
})

#
# Login email input validation 
#
observeEvent(input$loginUserEmail,{

  #  login validation timing 2-9 ms
  mxCatch(title="Login email validation",{
    
    email <- input$loginUserEmail
    emailIsValid <- mxEmailIsValid(email)
    
    if(emailIsValid){
      emailIsKnown <- mxDbEmailIsKnown(email) 
    }

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

    if( emailIsValid ){

      mxUpdateValue(
        id="loginKey",
        value=""
        )

      # create the unique secret key
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
      # send mail
      res <- try({
          mxSendMail(
            from=config[["mail"]][["botEmail"]],
            to=email,
            body=reactData$loginSecret,
            subject="Map-x secure login",
            wait=F)
      })

      mxDebugMsg(reactData$loginSecret)

      if("try-error" %in% class(res)){ 
        msg <- "An error occured, sorry, We can't send you an email right now."

      }else{
        msg <- "An email has been send, please check your email and copy the received password in the box."
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

        reactData$loginTimerEndAt <- Sys.time() + config[["users"]][["loginTimerMinutes"]]*60
      }
    }else{
      msg <- "Email is not valid"
    }

    mxUpdateText(
      id="txtLoginDialog",
      text=msg
      )
})
})


#
# key status : given login key, login timer and secret, return a
# list containing controls for the key
# 

keyStatus <- reactive({
  mxCatch(title="Key status reactive obj.",{
    key <- gsub("[[:blank:]]","",input$loginKey)
    timer <- reactData$loginTimerEndAt
    secret <- reactData$loginSecret

    list(
      isEmpty = isTRUE(is.null(key)) || isTRUE(nchar(key)==0), 
      isMalformed = !isTRUE(grepl("^(\\w{3}-\\w{3}-\\w{3}-\\w{3}-\\w{3})$",key)),
      isWrong = !isTRUE(identical(key,secret)),
      isOld = isTRUE("POSIXct" %in% class(timer) && timer - Sys.time() < 0)
      )
})
})


#
# key validation 
#
observe({
  mxCatch(title="Key validation",{
    k <- keyStatus()
    msg <- ""
    isOk <- !any(sapply(k,isTRUE))
    if(isOk){
      mxUpdateText(
        id="txtLoginDialog",
        text="Ok!"
        )
      # trigger actual login
      reactData$loginRequested = runif(1)
      # close the panel
      output$panelLogin <- renderUI(tags$div())
    }else{
      # only one message is returned : 
      #  I think that most probable causes password error are, in this order : 
      # 1. empty password
      # 2. malformed (unwanted characters)
      # 3. wrong password
      # 4. time limit reached.
      if(!k$isEmpty){
        if(k$isOld) msg <- "Time is up, please request a new password."
        if(k$isWrong) msg <- "The password is wrong"
        if(k$isMalformed) msg <- "The password in not valid"
        mxUpdateText(
          id="txtLoginDialog",
          text=HTML(msg)
          )
      }
    }
})
})

#
# create account,set date last visit, create cookie
#
observeEvent(reactData$loginRequested,{ 
  tryCatch(title="Logic for login process",{


    # get the email adress provided in input
    email <- reactData$loginUserEmail

    timeStamp <- mxTimer("start",sprintf("Login process: logic done for %s in",email))

    # Last email validation
    if(!mxEmailIsValid(email)) stop(sprintf("Invalid email: %s",email))
    
    # Check if this is a new account (unknown email)
    newAccount <- !mxDbEmailIsKnown(email)

    # get default user table name
    userTable <-  config[["pg"]][["tables"]][["users"]]


    # check if the account is "guest"
    isGuest <- isTRUE(email == config[[c("mail","guest")]])

    if(newAccount){

      mxDbCreateUser(
        email=email,
        timeStamp=timeStamp
        ) 

    }else{

      #
      # Save last visit
      #
      mxDbUpdate(
        table=userTable,
        column='date_last_visit',
        idCol='email',
        id=email,
        value=timeStamp
        )

    }

    #
    # Get user ID
    #
    res <- mxDbGetQuery(
      sprintf("SELECT id from %1$s WHERE email='%2$s'",
        userTable,
        email
        )
      )

    # if it's empty or not an integer, stop
    if(!isTRUE(is.integer(res$id))) stop(sprintf("No data for %s",email))

    #
    # Encrypt and save cookie
    #
    ck <- mxDbEncrypt(
      list(
        id=res$id
        )
      )
    # save in a list 
    ck <- list(ck)
    # name it
    names(ck) <- config[["users"]][["cookieName"]]
    # save it
    mxSetCookie(
      cookie = ck,
      expireDays = config[["users"]][["cookieExpireDays"]]
      ) 

    #
    # Get user info
    #
    userInfo <- mxDbGetUserInfoList(id=res$id)

    #
    # Update reactive item
    #
    reactUser$data <- userInfo 

    mxTimer("stop")
})
})

#
# Update role
#
observe({
  mxCatch(title="Role attribution",{
    cntry <- reactData$country 
    userInfo <- reactUser$data

    hasInfo <- !noDataCheck(userInfo)
    hasCountry <- !noDataCheck(cntry)   

    isolate({


      if(hasInfo && hasCountry){

        # Get roles
        reactUser$role <- mxGetMaxRole(
          project=cntry,
          userInfo=userInfo
          )

        #
        # Extract role description value
        #
        roleDesc <- reactUser$role$desc
        
        profile <- roleDesc$profile
        edit <- roleDesc$edit
        publish <- roleDesc$publish 
        access <- roleDesc$access


        mxDebugMsg(sprintf("%1$s connected as %2$s in %3$s",
            reactUser$data$email,
            reactUser$role$role,
            cntry
            ))

        #
        # Set user access
        #

        reactUser$allowStoryCreator <- isTRUE("storymap_creator" %in% access)
        reactUser$allowStoryReader <-  isTRUE("storymap" %in% access)
        reactUser$allowViewsCreator <-isTRUE("view_creator" %in% access)
        reactUser$allowUpload <- isTRUE("data_upload" %in% access)
        reactUser$allowAnalysisOverlap <- isTRUE("analysis_overlap" %in% access)
        reactUser$allowPolygonOfInterest <- isTRUE("polygon_of_interest" %in% access)
        reactUser$allowMap <- isTRUE("map" %in% access)
        reactUser$allowAdmin <- isTRUE("admin" %in% access)
        reactUser$allowProfile <- isTRUE("profile" %in% access)
        #
        # Update select publishing / editing target
        #

        if("data_upload" %in% access){
          updateSelectInput(session,
            inputId="selNewLayerVisibility",
            choices=publish
            )
        }

        if("view_creator" %in% access){
          updateSelectInput(session,
            inputId="selNewViewVisibility",
            choices=publish
            )
        }

        if("storymap_creator" %in% access){
          updateSelectInput(session,
            inputId="selStoryVisibility",
            choices=publish
            )
        }
      }
    })
})
})

