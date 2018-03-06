

observeEvent(input$btn_control,{

  mxCatch("controls.R",{

    userRole <- getUserRole()

    switch(input$btn_control$value,
      "showAbout"= {

        language <- reactData$language
        languages <- config[["languages"]][["list"]]
        languageDefault <- config$languages$list[[1]]
        about <- mxDbConfigGet("about")

        out = tagList()

        if(!noDataCheck(about) && typeof(about) == "list"){

          out <- lapply(about,function(ab){
            title <- .get(ab,c("title",language))
            if(noDataCheck(title)) title <- .get(ab,c("title",languageDefault))
            content = .get(ab,c("content",language))
            if(noDataCheck(content)) content = .get(ab,c("content",languageDefault))

            section <- tags$section(
              tags$h4(title),
              tags$p(HTML(content))
              )

            return(section)

          })
        }


        mxModal(
          id="uiSelectLanguage",
          title=d("title_about",language),
          textCloseButton=d("btn_close",language),
          content = tagList(out)
          )
      },
      "showLanguage"={

        language <- reactData$language

        languages <- config[["languages"]][["list"]]

        mxModal(
          id="uiSelectLanguage",
          textCloseButton=d("btn_close",language),
          content = selectizeInput(
            inputId="selectLanguage",
            choices=languages,
            label=d("ui_language",language),
            selected=language,
            options=list(
              dropdownParent="body"
              )
            )
          )

      },
      "showCountry"={

        country <- reactData$country
        language <- reactData$language
        idUser  <- .get(reactUser,c("data","id"))
        canRead <-  .get(userRole,c("read"))

        #countries <- unique(config[[c("countries","table")]]$iso3)
        countries <- .get(config,c("dictionaries","countries","id"))

        countries <- countries[ !countries %in% "XXX" ]

        countriesDf <- data.frame()

        viewsCount <- mxDbGetViewsByCountry(idUser,canRead)
        
        for(c  in countries){
          count = viewsCount[viewsCount$country==c,"n"]
          if(noDataCheck(count)) count = 0;
          cDf = data.frame(  
            iso3 = c,
            count = count,
            name = d(c,language,web=F)
            )
          if(nrow(countriesDf)==0){
            countriesDf = cDf
          }else{ 
            countriesDf <- rbind(countriesDf,cDf,stringsAsFactors=F)
          }
        }

        countriesDf$name <- as.character(countriesDf$name)
        countriesDf$iso3 <- as.character(countriesDf$iso3)

        countriesDf <- countriesDf[order(countriesDf$count,-rank(countriesDf$name),decreasing=T),]

        countries <- countriesDf$iso3

        
        names(countries) <- countriesDf$name

        selectCountry <- tagList(
          tags$label(d("ui_country"),language),
          tags$select(
            type = "select",
            id = "selectCountry",
            class = "form-control"
            ), 
          tags$script(
            `data-for`="selectCountry",
            jsonlite::toJSON(list(
                valueField = 'iso3',
                labelField = 'name',
                items = list(country),
                searchField = list("name"),
                dropdownParent="body",
                options=countriesDf,
                renderFun = 'parseCountryOptions'
                ),auto_unbox=T)
            )
          )

        mxModal(
          id="uiSelectCountry",
          content=selectCountry,    
          textCloseButton=d("btn_close",language),
          )
      },
      "showLogin"={
        btn <- list()
        userInfo <- ""
        language <- reactData$language
        country <- reactData$country

        #
        # Check if not yet logged in or logged in as guest
        #
        isNotLogged <- isTRUE(
          reactUser$data$email == config[[c("mail","guest")]] ||
            is.null(reactUser$data$email)
          )

        # 
        # If not logged, build an input form
        #
        if(isNotLogged){


          txtSubTitle <- d("login_subtitle",language)

          loginInput <- div(
            div(id="divEmailInput",
              class="input-group mx-login-group",
              mxInputUser(
                inputId="loginUserEmail",
                label=d("login_email",language,web=F),
                class="mx-login-input-black form-control"
                ),
              tags$span(
                class="input-group-btn",   
                actionButton(
                  inputId="btnSendLoginKey", 
                  label= d("login_send_pwd",language),
                  class="btn-square btn-black",
                  disabled=TRUE
                  )
                ) 
              ),
            div(
              tags$input(
                id="loginKey",
                type="text",
                placeholder = d("login_insert_pwd",language,web=F),
                class="form-control mx-login-input mx-login-input-black  mx-hide"
                )
              )
            )

        }else{

          #
          # If already logged, display the session status
          #

          txtSubTitle <- "Status"

          #sessionDuration <- mxGetSessionDurationHMS(reactUser$data$id)

          loginInput <- listToHtmlSimple(list(
               "login_email"=.get(reactUser,c("data","email")),
               "login_role"=.get(userRole,c("name")),
               "login_country"=d(country,language,web=F)
              ),lang=language)

          btn <-list(
            actionButton(
              inputId = "btnLogout",
              label = d("login_out",language),
              class="btn btn-modal"
              )
            )
        }






        #
        # Build the final modal 
        #
        mxModal(
          id="loginCode",
          buttons=btn,
          textCloseButton=d("login_cancel",language),
          content=tags$div(
            tags$b(div(id="txtLoginDialog",txtSubTitle)),
            loginInput
            )
          )
        # 
        # Render it to panel login div
        #
        #output$panelLogin = renderUI(panModal)


      })
})
})
