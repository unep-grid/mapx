
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

    if(!noDataCheck(lang_query)){
      query$language <<- NULL
      lang_out <- lang_query
    }else{
      if(noDataCheck(lang_react) && !noDataCheck(lang_db)){
        lang_out <- lang_db
      }else if(!noDataCheck(lang_ui)){
        lang_out <- lang_ui
      }else{
        lang_out <- lang_def
      }

      if(noDataCheck(lang_out)){
        lang_out <- lang_def
      }
    }
    if(!identical(lang_out,lang_react)){  
      mxUpdateLanguage(lang_out)
      reactData$language <- lang_out
    } 
    mxUpdateQueryParameters(list(
        language = lang_out
        ))
  })
})

#
# Send dictionnary to client.
#
observeEvent(reactData$language,{

  language <- reactData$language
  isGuest <- isGuestUser()

  if(!isGuest){
    # update reactive value and db if needed
    mxDbUpdateUserData(reactUser,
      path = c("user","cache","last_language"),
      value = language
      )
  }

  mxUpdateText(
    "btnShowProject",
    mxDbGetProjectTitle(reactData$project,language)
    )

})


