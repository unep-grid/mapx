
#
# Define language.
#
observe({
  lang_def <- .get(config,c("languages","list"))[[1]]
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

        #
        # Logger language change from UI
        #
        if( lang_ui != lang_react ){
          mxDbLogger("USER_ACTION", list(
              side = "app",
              id_log = "language_change",
              id_project = reactData$project,
              id_user = reactUser$data$id,
              is_guest = isGuestUser(),
              data = list(
                language = lang_out
                )
              ))
        }

      }else{
        lang_out <- lang_def
      }

      if(noDataCheck(lang_out)){
        lang_out <- lang_def
      }
    }
    mxUpdateUrlParams(list(language=lang_out)) 
    mxUpdateSettings(list(
          language = lang_out
          ))

    reactData$language <- lang_out
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

})


#
# Update language. Based on generated json files.
#
# See also : "src/js/mx_helper_language.js"
#
observeEvent(input$selectLanguage,{
  language <- input$selectLanguage

  session$sendCustomMessage(
    "mxUpdateLanguage",
    list(
      lang=language
      )
    )
  mxUpdateText(
    "btnShowProject",
    mxDbGetProjectTitle(reactData$project,language)
    )
})

