


#
# Set view and source ui 
#
observe({

  userRole <- getUserRole()
  role <- userRole$name

  isolate({
    language <- reactData$language

    if(  "public" %in% role ){
      uiSourceEdit = div()
      uiViewAdd =  div()

    }else{

      uiViewAdd <- tagList(
        tags$h4(`data-lang_key`="title_tools_views",d("title_tools_views",language)),
        actionButton(
          label = "Add view",
          inputId = "btnAddView",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_view"
          ))


      uiSourceEdit <- tagList(
        tags$h4(`data-lang_key`="title_tools_sources",d("title_tools_sources",language)),
        actionButton(
          label = d("btn_edit_source",language),
          inputId = "btnEditSources",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_edit_source"
          ),
        actionButton(
          label = d("btn_add_source",language),
          inputId = "btnUploadSources",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_add_source"
          )
        )
    }

    output$uiBtnViewAdd <- renderUI(uiViewAdd)
    output$uiBtnSourceEdit <- renderUI(uiSourceEdit)

    })
})


#
# Access to self table data info
#
observe({

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  isolate({
    language <- reactData$language
    dbInfo <- tags$div()
    
    if( "dbSelf" %in% access  ){

      dbInfo <- tagList(
        tags$h4(d("title_tools_db",language)),
        actionButton(
          label = d("show_db_info_self",language),
          inputId = "btnShowDbInfoSelf",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_db_info_self"
          )
        )

      if( "db" %in% access  ){

        dbInfo <- c(dbInfo,tagList(
            actionButton(
              label = d("show_db_info",language),
              inputId = "btnShowDbInfo",
              class = "btn btn-sm btn-default hint",
              `data-lang_key` = "btn_show_db_info"
              )
            )
          )
      }
    }


    output$uiBtnShowDbInfo <- renderUI(dbInfo)

  })
})


observeEvent(input$btnShowDbInfoSelf,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  if( "dbSelf" %in% access ){

    dbInfo <- tags$p()


    mxModal(
      id = "dbInfo",
      title = "Postgres info",
      content = dbInfo
      )
  }

})


observeEvent(input$btnShowDbInfo,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  if( "db" %in% access ){

    dbInfo <- listToHtmlSimple(list(
        db_name =  .get(config,c("pg","dbname")),
        db_host = session$clientData$url_hostname,
        db_port = .get(config,c("pg","port")),
        db_username =  .get(config,c("pg","user")),
        db_password =  .get(config,c("pg","password"))
        ))

    mxModal(
      id = "dbInfo",
      title = "Postgres info",
      content = dbInfo
      )
  }

})

#
# User role
#
observe({

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  isolate({
    language <- reactData$language
    editRoles <- tags$div()


    if( "editRoles" %in% access  ){

      editRoles <- tagList(
        tags$h4(d("title_tools_admin",language)),
        actionButton(
          label = "Show roles ",
          inputId = "btnShowRoleManager",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_role_manager"
          )
        )

    }

    output$uiBtnShowRoleManager <- renderUI(editRoles)

  })
})




reactTableEditableUsers <- reactive({
  out <- data.frame()
  userRole <- getUserRole()
  userData <- reactUser$data
  country <- reactData$country
  access <- .get(userRole,c("access"))
  if( "editRoles" %in% access ){

    userList <- list() 
    canEdit <- userRole$edit
    users <- mxDbGetUserByRoles(roles=canEdit)
    out <- users

  }

  return(out)

})


observeEvent(input$btnShowRoleManager,{

  userRole <- getUserRole()
  userData <- reactUser$data
  country <- reactData$country
  access <- .get(userRole,c("access"))

  if( "editRoles" %in% access ){

    userList <- list() 
    users <- reactTableEditableUsers()
    users <- users[!duplicated(users$id),]
    users <- users[!users$id == userData$id,]
    userList <- users$id
    names(userList) <- users$email
    #
    # Update user list
    #
    ui <- tagList(
      selectizeInput(
        "selectUserForEditRole",
        label = "User to edit role",
        choices = userList,
        options=list(
          dropdownParent="body"
          )
        ),
      jedOutput("roleEdit")
      )

    mxModal(
      id = "roleInfo",
      title = "Role administration",
      content = ui
      )
  }

})



reactEditedUserRoles = reactive({
  out <- list()
  users <- reactTableEditableUsers()
  editedUser <- input$selectUserForEditRole 
  if(!noDataCheck(editedUser)){
    userId <- users[users$id == editedUser ,c("id")][[1]]
    out <- mxDbGetUserRoles(userId)
  }
  return(out)
})




observeEvent(input$roleEdit_init,{

  userRole <- getUserRole()
  countries <- c("world",.get(config,c("countries","codes","id")))
  edit <- userRole$admin

  schema = list(
    title = "Roles",
    type = "array",
    format = "table",
    uniqueItems = TRUE,
    items = list(
      type = "object",
      title = "Role",
      properties = list(
        role = list(
          title = "Role",
          type = "string",
          enum =  edit,
          required = TRUE
          ),
        project = list(
          title = "Project",
          type = "string",
          enum = countries,
          required = TRUE
          )
        )
      )
    )


  jedSchema(
    id="roleEdit",
    schema=schema,
    startVal=reactEditedUserRoles()
    )

})

observeEvent(input$selectUserForEditRole,{

  jedUpdate(
    id="roleEdit",
    values = reactEditedUserRoles()
    )

})


observeEvent(input$roleEdit_values,{

  userRole <- getUserRole()
  access <- .get(userRole,c("access"))

  if( "editRoles" %in% access ){

    users <- reactTableEditableUsers()
    roles <- input$roleEdit_values$msg
    oldRoles <- reactEditedUserRoles()
    userId <- input$selectUserForEditRole
    tableUser <- .get(config,c("pg","tables","users"))
    hasUser <- userId %in% users$id
    hasValues <- !noDataCheck(roles)
    areIdentical <- identical(oldRoles,roles)
    if(!hasValues || !hasUser || areIdentical ) return();

    mxDebugMsg("Update roles in db.")
    #
    # Update json value, given a path and id
    #

    mxDbUpdate(
      table = tableUser,
      idCol = 'id',
      id = userId,
      column = 'data',
      value = roles,
      path = c("admin","roles")
      )

  }
})
