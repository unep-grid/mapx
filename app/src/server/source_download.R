
observeEvent(reactData$sourceDownloadRequest,{

  conf <- reactData$sourceDownloadRequest
  idSource <- conf$idSource
  project <- reactData$project
  language <- reactData$language
  isGuest <- isGuestUser()
  meta <- mxDbGetLayerMeta(idSource)
  isDownloadable <- isTRUE(.get(meta,c("license","allowDownload")))
  sourceTitle <- mxDbGetLayerTitle(idSource,language) 
  btnList = list()

  if( !isDownloadable || isGuest ){

    uiDl = tags$h3(d("src_download_issues",language))

    if( isGuest ) {
      uiDl = tagList(uiDl, d("you_not_logged_in",language))
    }
    if( !isDownloadable ){
      uiDl = tagList(uiDl, d("src_download_disabled",language))
    }

    uiOut <- tagList(
      tags$p(uiDl)
      )   

  }else{

    formats <- .get(config,c("data","format"))              
    formatsNames <- sapply(formats,function(x){if(x$type=="vector"){return(x$driver)}})
    countries <- mxDbGetProjectData(project)$countries
    
    uiOut <- tagList(
      selectizeInput("selectDownloadFormat",
        label = d("download_select_format_vector",language),
        choices = formatsNames,
        multiple = FALSE,
        options=list(
          dropdownParent="body"
          )
        ),
      selectizeInput(
        "selectFilterDataByCountries",
        label = d("download_select_by_countries",language,web=F),
        selected = countries,
        choices = mxGetCountryList(language,includeWorld=F),
        multiple = TRUE,
        options = list(
          dropdownParent="body"
          )
        ),
      textInput("txtDownloadFileName",
        label = d("download_file_name",language),
        value = subPunct(sourceTitle)
        ),
        uiOutput("uiValidateDownload")
      )

    btnList <- list(
      actionButton(
        inputId = "btnSourceDownload",
        label = d("btn_confirm",language),
        disabled = TRUE
        )
      )
  }

  #
  # create modal
  #
  mxModal(
    id = "modalSourceDownload",
    title = tags$b(sourceTitle),
    content = uiOut,
    textCloseButton = d("btn_close",language),
    buttons = btnList
    )
})

#
# Validation of download format
# 
observe({

  filename <- removeExtension(input$txtDownloadFileName)
  update <- reactData$sourceDownloadRequest
  
  isolate({
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE
    hasFileName <- !noDataCheck(filename)

    err[['txt_too_short_min_5']] <- !hasFileName || nchar(filename) < 5

    output$uiValidateDownload <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    mxToggleButton(
      id="btnSourceDownload",
      disable = hasErrors
      )
  })
})

observeEvent(input$btnSourceDownload,{
  mxCatch(title="btnSourceDownload",{

    #
    # Get values
    # 
    conf <- reactData$sourceDownloadRequest
    language <- reactData$language
    idSource <- conf$idSource
    format <- input$selectDownloadFormat
    emailUser <- reactUser$data$email
    emailAdmin <- .get(config,c("mail","admin"))
    filename <- removeExtension(input$txtDownloadFileName)
    filename <- subPunct(filename)
    iso3codes <- input$selectFilterDataByCountries
    sourceTitle <- mxDbGetLayerTitle(idSource,language) 

    request = mxDbEncrypt(list(
        layer = idSource,
        email =  emailUser,
        filename = filename,
        format = format,
        iso3codes = iso3codes
        ))

    mxModal(
      id = "modalSourceDownload",
      title = tags$b(sourceTitle),
      content = tags$div(
        tags$div(id='mxDownloadHandler')
        ),
      textCloseButton = d("btn_close",language)
      )

    mglDownloadHandler(list(
        data = request,
        idHandlerContainer = "mxDownloadHandler"
        ))



    })
})




