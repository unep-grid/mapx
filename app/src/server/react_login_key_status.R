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


