#' Send an email using local or remote 'mail' command
#' @param subject. String. Test for the subject 
#' @param from String. Valid email for  sender
#' @param to String. Valid email for Recipient
#' @param body String. Text of the body
#' @param type String. "text" or "html"
#' @param wait Boolean. Wait for the mail to be sent
#' @export
mxSendMail <- function( from=NULL, to=NULL, type="text", body=NULL,bodyHTML=NULL, subject=NULL, wait=F ){


  if(noDataCheck(from)){
    from <- .get(config,c("mail","bot"))
  }

  if(noDataCheck(subject)){
    subject = "MapX"
  }

  if(noDataCheck(body) && noDataCheck(bodyHTML)){
    stop("empty message")
  }else{
    body <- as.character(body)
  }

  if(noDataCheck(bodyHTML)){
    bodyHTML <- ""
  }else{
    bodyHTML <- as.character(bodyHTML)
  }


  if( ! mxEmailIsValid(from) | ! mxEmailIsValid(to)) stop(paste("mxSendMail : email not valid. From: ", from, " To: ", to))

  msgClear <- list(
      from = from,
      to = to,
      subject = subject,
      text = body,
      html = bodyHTML,
      validUntil = as.character(Sys.Date() + 1)
      )

  msg <- mxDbEncrypt(msgClear)

  data = toJSON(list(msg = msg ),auto_unbox=T)

  host <-  .get(config,c("api","host")) 
  url <- "http://api:3333/send/mail"
  h <- new_handle(copypostfields = data)
  handle_setheaders(h,
    "Content-Type" = "application/json",
    "Cache-Control" = "no-cache",
    "Host" = host 
    )

  req <- curl_fetch_memory(url, handle = h)
  
  res <- fromJSON(rawToChar(req$content))

  if(to %in% res$accepted){
    return()
  }else{
    return("Server can't send this message. Reason" + toJSON(res))
  }

}
