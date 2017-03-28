

observeEvent(input$btn_control,{
  
  switch(input$btn_control$value,
    "showLanguage"={

      language <- reactData$language

      languages <- config[["languages"]][["list"]]

      ui <- mxPanel(
        id="uiSelectLanguage",
        title=tags$span(icon("language"),style="font-size:100px"),
        html=selectizeInput(
          inputId="selectLanguage",
          choices=languages,
          label=tags$span(d("ui_language",language),`data-lang_key`='ui_language'),
          selected=language,
          options=list(
            dropdownParent="body"
            )
          )
        )

      output$panelSelect <- renderUI(ui)

    },
    "showCountry"={

      country <- reactData$country
      language <- reactData$language

      countries <- unique(config[[c("countries","table")]]$iso3)

      viewsCount <- mxDbGetViewsByCountry()

      labels <- c()

      for(i in 1:length(countries)){ 
        ctry = countries[i];
        count = 0;
        if(!ctry %in% viewsCount$country){
          viewsCount = rbind(
            viewsCount,
            data.frame( count=0, country=ctry )
            )
        }
      }
     

      labels <- apply(viewsCount, 1, function(row){
            sprintf("%1$s (%2$d)", 
              d(row['country'],language), 
              as.integer(row['count'])
              )
            })

      countries <- viewsCount$country

      if( length(labels) == length(countries) ){      
        names(countries) <- labels
      }else{
        names(countries) <- d(countries,language)
      }

      ui <- mxPanel(
        id="uiSelectCountry",
        title=tags$span(icon("globe"),style="font-size:100px"),
        html= selectizeInput(
          inputId = "selectCountry",
          label=tags$span(d("ui_country",language),`data-lang_key`='ui_country'),
          selected = country,
          choices = as.list(countries),
          options = list(
            dropdownParent="body"
            )
          )
        )

      output$panelSelect <- renderUI(ui)

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
              label=d("login_email",language),
              class="mx-login-input-black form-control"
              ),
            tags$span(
              class="input-group-btn",   
              actionButton(
                inputId="btnSendLoginKey", 
                label=tagList(icon("envelope"),tags$span(d("login_send_pwd",language))),
                class="btn-square btn-black",
                disabled=TRUE
                )
              ) 
            ),
          div(
            tags$input(
              id="loginKey",
              type="text",
              placeholder=d("login_insert_pwd",language),
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

        loginInput <- tags$ul(
          tags$li(
            tags$span(
              tags$b(d("login_email",language)),
              reactUser$data$email
              )
            ),
          tags$li(
            tags$span(
              tags$b(d("login_role",language)),
              reactUser$role$role
              )
            ),
          tags$li(
            tags$span(
              tags$b(d("login_country",language)),
              country
              )
            )
          )

        btn <-list(
          actionButton(
            inputId = "btnLogout",
            label = d("login_out",language),
            icon=icon("sign-out"),
            class="btn btn-modal"
            )
          )
      }

      #
      # Build the final modal 
      #
      panModal <- mxPanel(
        listActionButton=btn,
        addCloseButton=TRUE,
        closeButtonText=d("login_cancel",language),
        id="loginCode",
        #title=d("login_title",language),
        title=tags$span(icon("sign-in"),style="font-size:100px"),
        subtitle=div(id="txtLoginDialog",txtSubTitle), 
        html=loginInput
        )

      # 
      # Render it to panel login div
      #
      output$panelLogin = renderUI(panModal)


    }
    )

})
