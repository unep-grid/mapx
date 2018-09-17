#
# Admin panel and button
#
observe({

  usersAllowedToCreate <- .get(config,c("project","creation","usersAllowed"),default=list())
  userRole <- getUserRole()
  userData <- reactUser$data
  isAdmin <- isTRUE(userRole$admin)
  isPublisher <- isTRUE(userRole$publisher)
  isProjectCreator <-  isTRUE(userData$id %in% usersAllowedToCreate)
  isProjectDefault <- isTRUE(reactData$project == .get(config,c("project","default")))
  isGuest <- isGuestUser()
  reactData$projectAllowedToCreate <- isProjectCreator

  if( isGuest ) return()

  isolate({
    language <- reactData$language
    toolsTitle <- tagList(
      tags$h4(d("title_tools_admin_project",language,web=FALSE))
      )
    
    btns <- tagList();

    labelBtnAdd <- ifelse(isProjectCreator,"btn_show_add_project","btn_show_add_project_disabled")
    labelBtnDelete <- ifelse(isProjectDefault,"btn_show_project_delete_disabled","btn_show_project_delete") 

    btns <- tagList(
      btns,
      actionButton(
        label = d(labelBtnAdd,language),
        inputId = "btnShowAddProject",
        class = "btn btn-sm btn-default hint " + ifelse(isProjectCreator,"","disabled"),
        `data-lang_key` = labelBtnAdd
        )
      )

    if ( isPublisher ){
      btns <- tagList(
        btns,
        actionButton(
          label = d("btn_show_project_external_views",language),
          inputId = "btnShowProjectExternalViews",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_project_external_views"
          )
        )
    }

    if( isAdmin ){

      btns <- tagList(
        btns,
        actionButton(
          label = d("btn_show_role_manager",language),
          inputId = "btnShowRoleManager",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_role_manager"
          ),
        actionButton(
          label = d("btn_show_invite_member",language),
          inputId = "btnShowInviteMember",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_invite_member"
          ),
        actionButton(
          label = d("btn_show_project_config",language),
          inputId = "btnShowProjectConfig",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_project_config"
          ),
        actionButton(
          label =  d(labelBtnDelete,language),
          `data-lang_key` = labelBtnDelete,
          inputId = "btnShowProjectDelete",
          class = "btn btn-sm btn-default hint " + ifelse(isProjectDefault,"disabled",""),
          )
        )
    }

    editProject <- tags$div(
      toolsTitle,
      tags$div(
        btns
        )
      )

    output$uiBtnShowRoleManager <- renderUI(editProject)

  })
})


