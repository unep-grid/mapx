
#
# Define language.
#
observe({
  lang_def <- .get(config,c("languages","list"))[[1]]
  lang_ui <- input$selectLanguage
  lang_db <- .get(reactUser$data,c("data","user","cache","last_language"))

  isolate({

    lang_react <- reactData$language

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
    reactData$language <- lang_out
  })
})

#
# Send dictionnary to client.
#
observeEvent(reactData$language,{

  language <- reactData$language

  isGuest <- isTRUE(.get(reactUser$data,c("email")) == .get(config,c("mail","guest")))
  if(!isGuest){
    # update reactive value and db if needed
    mxDbUpdateUserData(reactUser,
      path = c("user","cache","last_language"),
      value = language
      )
  }

})


#
# Update map label
#
observe({

  language <- reactData$language

  hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[["map"]][["id"]]) ]])
  hasLang <- !noDataCheck(language)

  if( hasMap && hasLang ){

    # subset dictionary for default and choosen language
    val <- d(lang=language)

    # create dict object for ui
    dict <- list(
      lang = language,
      default = config[[c("languages","list")]][[1]],
      dict = val
      )

    # send dict to ui
    # TODO: mglSetLanguage to this ?
    #
    session$sendCustomMessage(
      "mxSetLanguage",
      jsonlite::toJSON(dict,auto_unbox=T)
      )

    # update map language
    mglSetLanguage(
      id = config[["map"]][["id"]],
      language = language,
      labelLayer = "country-label"
      )

  }

})


