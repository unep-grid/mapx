##' Send an email using local or remote 'mail' command
##' @param subject. String. Test for the subject 
##' @param from String. Valid email for  sender
##' @param to String. Valid email for Recipient
##' @param body String. Text of the body
##' @param type String. "text" or "html"
##' @param wait Boolean. Wait for the mail to be sent
##' @export
#mxSendMail <- function( from=NULL, to=NULL, type="text", body=NULL,bodyHTML=NULL, subject=NULL, wait=F ){


  #msgClear <- list(
    #from = from,
    #to = to,
    #subject = subject,
    #text = body,
    #html = bodyHTML,
    #validUntil = as.character(Sys.Date() + 1)
    #)

  #msg <- mxDbEncrypt(msgClear)
  #route <- .get(config,c('api','routes','postEmail'))

  #res <- mxApiPost(route,list(
      #msg = msg
      #))

  #if(to %in% res$accepted){
    #return()
  #}else{
    #return("Server can't send this message. Reason" + toJSON(res))
  #}

#}

#' Send email with default template
#'
#' @param to {Character} Email of receiver. Mendatory
#' @param subject {Character} Subject. Mendatory
#' @param content {Character} Content. Mendatory
#' @param from {Character} Optional sender email, default = config$mail$bot
#' @param title {Character} Optional title. Default = brand name from config
#' @param subtitle {Character} Optional subtitle. Default = subject 
#' @param subjectPrefix {Character} Optional subect prefix. Default = brand name from config
#' @param useNotify {Logical} Show a iconFlash and a notification
#' @return Post response
#' @export
mxSendMail <- function(
  to, 
  subject, 
  content, 
  from = NULL, 
  title = NULL, 
  subtitle = NULL,
  subjectPrefix = NULL,
  useNotify = TRUE,
  idGroupNotify = NULL,
  language = "en",
  encrypt = TRUE
  ){
  res <- NULL
  brand <- .get(config,c('brand','name'))
  if(isEmpty(subjectPrefix)){
    subjectPrefix <- brand
  }
  if(isEmpty(title)){
    title <- brand
  }
  if(isEmpty(subtitle)){
    subtitle <- subject
  }
  if(isEmpty(from)){
    from = .get(config,c("mail","bot")) 
  }

  hasContent <- isNotEmpty(content)
  toValid <- mxEmailIsValid(to)
  fromValid <- mxEmailIsValid(from) 
  hasSubject <- isNotEmpty(subject)
  useNotify <- isNotEmpty(shiny::getDefaultReactiveDomain()) && useNotify
  
  if(!hasContent || !toValid || !fromValid || !hasSubject){
    stop("Issue is email formating : can't send email")
  }

  msg <- list(
    from = from,
    to = to,
    content = content,
    title = title,
    subtitle =  subtitle,
    subjectPrefix = subjectPrefix,
    subject = sprintf('%1$s: %2$s',subjectPrefix,subject),
    validUntil = as.character(Sys.time() + 24*60*60)
  )

  if(isTRUE(encrypt)){
    tryCatch({
      msg <- mxDbEncrypt(msg)
    },error = function(e){
      encrypt <<- FALSE
    })
  }

  route <- .get(config,c('api','routes','postEmail'))

  res <- mxApiPost(route,list(
      msg = msg,
      encrypted = encrypt
      ))

  success <- class(res) == "list" && to %in% res$accepted

  if(useNotify){
    if(success){
      txt <-  mxParseTemplateDict("email_manager_sent_success_generic",language,list(email=to))
    }else{
      txt <-  mxParseTemplateDict("email_manager_sent_error_generic",language,list(email=to))
    }
    if(isEmpty(idGroupNotify)){
       idGroupNotify = randomString('mx_email')
    }
    mxNotify(
      notif = list(
        idGroup = idGroupNotify,
        type = 'info',
        message = txt,
        title = d("email_manager_title",language),
        level = ifelse(success,'message','warning')
        )
    )
  }

  return(list(
      res = res,
      success = success
      ))
}

