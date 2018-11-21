#' Login : get user info and set cookies
#' @param {Character} email to login
#' @param {Clist} list of data for fingerprinting browser
#' @param {List} query URL query
#' @return {List} user data
mxLogin <- function(email,browserData,query){

  hasExpired <- FALSE
  hasInvalidMail <- FALSE

  isGuest <- FALSE
  emailGuest <- .get(config,c("mail","guest"))
  emailNewMember <- ""
  timeStamp <- Sys.time()
  nowPosix <- as.numeric(timeStamp)
  queryAction <- .get(query,c("action"))
  useAutoRegister <- !noDataCheck(queryAction) && isTRUE(.get(queryAction,c("id")) == "autoregister")
  useConfirmMembership <- !noDataCheck(queryAction) && isTRUE(.get(queryAction,c("id")) == "confirmregister")

  forceProject <- ""

  if( useConfirmMembership ){
    #
    # The admin clicked in the link to confirm membership.
    # We bypass browser data to automatically login the user as admin
    # Then when the map is ready, display a panel to send a proper invite
    # to verify the email account of the invited user.
    # Search for query -> action -> confirmregister
    #
    val <- .get(query,c("action","value"))
    email <- .get(val,c('emailAdmin'))
    forceProject <- .get(val,c('project')) 
  }

  if( useAutoRegister ){
    #
    # The new user has been confirmed and invited
    #
    val <- .get(query,c("action","value"))
    email <- .get(val,c('email'))
    forceProject <- .get(val,c('project'))
    validUntil <- .get(val,c('valid_until'))
    hasExpired <- noDataCheck(validUntil) || isTRUE(nowPosix > validUntil)
  }
  
  # make sure to use lowercase and trimed email
  email <- trimws(tolower(email))

  # test for invalid email
  hasInvalidMail <- !mxEmailIsValid(email)

  #
  # Modal with issue if any
  # if any, set email to emailGuest
  #
  if( hasInvalidMail || hasExpired ){
    err <- tagList()

    if(hasInvalidMail) err <- tagList(err,p(d("error_email_not_valid")))
    if(hasExpired) err <-  tagList(err,p(d("error_email_confirm_too_old")))

    mxModal(
      id = 'valid_issue',
      content = err
      )

    email <- emailGuest
    isGuest <- TRUE
  }


  # Check if this is a new account (unknown email)
  newAccount <- !mxDbEmailIsKnown(email)

  # get default user table name
  userTable <-  .get(config,c("pg","tables","users"))

  # check if the account is "guest"
  isGuest <- isGuest || isTRUE(email == .get(config,c("mail","guest")))

  if( newAccount ){

    #
    # Create new user
    # 
    mxDbCreateUser(
      email = email,
      timeStamp = timeStamp
      ) 

  }else{

    #
    # Save last visit
    #
    mxDbUpdate(
      table = userTable,
      column = 'date_last_visit',
      idCol = 'email',
      id = email,
      value = timeStamp
      )

  }

  #
  # Get user ID
  #
  res <- mxDbGetQuery(
    sprintf("SELECT id, key from %1$s WHERE email='%2$s'",
      userTable,
      email
      )
    )

  hasValidId <- isTRUE(is.integer(res$id))

  # if it's empty or not an integer, stop
  if( !hasValidId ) {
    
    email <- emailGuest
    isGuest <- TRUE

  }

  #
  # Handle autoregister after account validation
  #

  if( !isGuest && useAutoRegister ){

    projectData <- mxDbGetProjectData(forceProject)
    members <- unique(c(projectData$members,list(res$id)))

    mxDbUpdate(
      table = "mx_projects",
      idCol = 'id',
      id = forceProject,
      column = 'members',
      value = as.list(members)
      )
  }

  #
  # If query action was performed, forceProject is set and
  # bypass last_project value. 
  #
  if( !isGuest && (useAutoRegister || useConfirmMembership ) && !noDataCheck(forceProject) ){
    mxDbUpdate(
      table=userTable,
      idCol='id',
      id=res$id,
      column='data',
      path = c("user","cache","last_project"),
      value = forceProject
      )
  }

  #
  # Encrypt and save cookie
  #
  toStore = list(
    id_user = res$id,
    date_created = nowPosix
    )

  toStore <- c(
    toStore,
    browserData[.get(config,c("browser","params"))]
    )

  ck <- mxDbEncrypt(toStore)

  # As we could have more than one cookie, save as list, name it
  ck <- list(ck)
  names(ck) <- .get(config,c("users","cookieName"))

  # Send to client
  mxSetCookie(
    cookie = ck,
    expireDays = .get(config,c("users","cookieExpireDays"))
    )

  #
  # Save user id in mx.settings.user.id
  #
  mglSetUserData(list(
      id = res$id,
      guest = isGuest,
      email =  ifelse(isGuest,"",email),
      token = ifelse(isGuest,"",res$key)
      ));
  #
  # Get user info
  #
  mxDebugMsg(" User " + email +" loged in.")
  return(mxDbGetUserInfoList(id=res$id))

}

#' Get email of the user based on cookies
#' @param {String} cookies string
#' @param {Function} callback with a unique argument : email
mxInitBrowserData <- function(browserData,callback){

  dat <- NULL
  res <- NULL

  dateNow <- as.numeric(Sys.time())
  maxSecondsValid <- .get(config,c("users","cookieExpireDays")) * 86400
  emailGuest <- .get(config,c("mail","guest"))
  emailUser <- NULL
  
  #
  # Check that the account exists
  #
  if(!mxDbEmailIsKnown(emailGuest)){
    mxDbCreateUser(emailGuest)
  }

  #
  # If there is values in cookies
  #
  if(isTRUE(length(browserData)>0) && !noDataCheck(browserData$cookies)){
    #
    # Look for the default cookie name (e.g. mx_data)
    #
    cookies <- browserData$cookies
    cookieData <- mxDbDecrypt(cookies[[.get(config,c("users","cookieName"))]])

    #
    # Check for issues
    #

    #
    # NOTE: dat is not used, check for try-error on cookieData ?
    #
    hasNoError <- !isTRUE("try-error" %in% class(dat))
    hasLength <- isTRUE(length(cookieData)>0)
    browserParams <- .get(config,c("browser","params"))
    
    hasExpectedKeys <- isTRUE(all(c(
        browserParams %in% names(cookieData),
        browserParams %in% names(browserData)
        )))
        
    if( hasNoError && hasLength && hasExpectedKeys){

      #
      # Check if ip match
      #
      browserMatch <- identical(
        cookieData[browserParams],
        browserData[browserParams]
        )

      isYetValid <- isTRUE( 
        dateNow <= cookieData$date_created + maxSecondsValid 
        )

      if( browserMatch && isYetValid ){
        #
        # Get the user email
        #
        emailUser <- mxDbGetEmailFromId(cookieData$id_user)
      }
    }
  }

  #
  # If email is valid, use this to set as login email 
  # 
  if(!mxEmailIsValid(emailUser)){
    emailUser = emailGuest 
  }

  callback(emailUser)

}




#' Parse cookies string
#' @param {String} str cookie string
#' @return {List} Named list with cookie values
mxParseCookies <- function(str){
  if(class(str)=="list") return(str);

  out <- list()
  if(!noDataCheck(str)){
    
    pairs <- strsplit(str,"; ",fixed=T)[[1]]

    for(p in pairs){
      dat <- strsplit(p,"=")[[1]]
      key <- trimws(dat[[1]])
      value <- dat[[2]]
      out[[key]] <- value
    } 
    }
    return(out)
}

