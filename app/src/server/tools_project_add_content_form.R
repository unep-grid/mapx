
observeEvent(input$btnUploadSourceApi,{

  userData <- reactUser$data
  project <- reactData$project
  language <- reactData$language
  isGuest <- isGuestUser()
  userRole <- getUserRole()
  btnList <- list()
  idForm <- randomString("mx_form_") 
  
  isolate({

    isPublisher <- "publishers" %in% userRole$groups

    if( !isPublisher ){

      uiOut = tagList(
        tags$h3(d("src_upload_issues",language)),
        tags$p(d("you_not_allowed",language))
        )

    }else{

      uiOut <- tagList(
        tags$form(
          id = idForm,
          textInput("txtUploadSourceFileName",
            label = d("upload_source_title",language),
            ),
          textInput(
            "numEpsgCode",
            label = d("epsg_set_projection_import",language),
            value = "",
            ),
          textInput("txtEmailSourceUpload",
            label = d("email",language),
            userData$email
            )
          ),
        uiOutput("uiValidateSourceUpload")
        )

      btnList <- list(
        tags$button(
          disabled = TRUE,
          id = "btnSourceUpload",
          class = "btn btn-default",
          d("btn_browse",language),
          onclick="mx.helpers.triggerUploadForm({idForm:'" + idForm + "'})"
          )
        )
    }

    #
    # create modal
    #
    mxModal(
      id = "modalSourceDownload",
      title = d("upload"),
      content = uiOut,
      textCloseButton = d("btn_close",language),
      buttons = btnList
      )

    #
    # Add epsg search box
    #
    mxEpsgBuildSearchBox('#numEpsgCode')
    

  })

})


observe({

  filename <- input$txtUploadSourceFileName
  email <- input$txtEmailSourceUpload

  isolate({
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE
    hasFileName <- !noDataCheck(filename)
    hasEmail <- mxEmailIsValid(email)

    err[['txt_too_short_min_3']] <- !hasFileName || nchar(filename) < 3
    err[['error_title_bad']] <- mxProfanityChecker(filename)
    err[['txt_email_not_valid']] <- !hasEmail 

    output$uiValidateSourceUpload <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    mxToggleButton(
      id="btnSourceUpload",
      disable = hasErrors
      )
  })

})

#observeEvent(input$btnSourceUpload,{
  #session$sendCustomMessage("mglTriggerUploadForm",list(
   #idForm = 'formSourceUpload'
  #))
#})
