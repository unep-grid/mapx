
#
# Define language.
#
observe({
  langs <- .get(config,c("languages","codes"))
  lang_def <- langs[[1]]
  lang_ui <- input$selectLanguage
  lang_query <- query$language
  lang_db <- .get(reactUser$data,c("data","user","cache","last_language"))
  
  isolate({

    lang_react <- reactData$language

    if(isNotEmpty(lang_query)){
      query$language <<- NULL
      lang_out <- lang_query
    }else{
      if(isEmpty(lang_react) && isNotEmpty(lang_db)){
        lang_out <- lang_db
      }else if(isNotEmpty(lang_ui)){
        lang_out <- lang_ui
      }else{
        lang_out <- lang_def
      }

      if(isEmpty(lang_out)){
        lang_out <- lang_def
      }
    }
    
    if(!identical(lang_out,lang_react)){  
      mxUpdateSettings(list(
          language = lang_out
          ))
      reactData$language <- lang_out
    }
    mxUpdateQueryParameters(list(
        language = lang_out
        ))
  })
})

#
# Update last_language
#
observeEvent(reactData$language,{

  language <- reactData$language
  isGuest <- isGuestUser()

  if(!isGuest){
    mxDbUpdateUserData(reactUser,
      path = c("user","cache","last_language"),
      value = language
      )
  }
})


