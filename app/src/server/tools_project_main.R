#
# Admin panel and button
#
observe({

  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  isPublisher <- isTRUE(userRole$publisher)
  isGuest <- isGuestUser()
 
  if( isGuest ) return()

  isolate({
    language <- reactData$language
    toolsTitle <- tagList(
      tags$h4(d("title_tools_admin_project",language,web=FALSE))
      )
    btns <- tagList(
      actionButton(
        label = d("btn_show_add_project",language),
        inputId = "btnShowAddProject",
        class = "btn btn-sm btn-default hint",
        `data-lang_key` = "btn_show_add_project"
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
          label = d("btn_show_project_delete",language),
          inputId = "btnShowProjectDelete",
          class = "btn btn-sm btn-default hint",
          `data-lang_key` = "btn_show_project_delete"
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


