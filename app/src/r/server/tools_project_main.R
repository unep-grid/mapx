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
      tags$h4(d("title_tools_admin_project",language,web=T))
      )
    
    btns <- tagList();

    labelBtnAdd <- ifelse(isProjectCreator,"btn_show_add_project","btn_show_add_project_disabled")
    labelBtnDelete <- ifelse(isProjectDefault,"btn_show_project_delete_disabled","btn_show_project_delete") 

    btns <- tagList(
      btns,
      actionButton(
        label = d(labelBtnAdd,language, web=T),
        inputId = "btnShowAddProject",
        class = "btn btn-sm btn-default hint " + ifelse(isProjectCreator,"","disabled")
        )
      )

    if ( isPublisher ){
      btns <- tagList(
        btns,
        actionButton(
          label = d("btn_show_project_external_views",language,web=T),
          inputId = "btnShowProjectExternalViews",
          class = "btn btn-sm btn-default hint"
          )
        )
    }

    if( isAdmin ){

      btns <- tagList(
        btns,
        actionButton(
          label = d("btn_show_role_manager",language,web=T),
          inputId = "btnShowRoleManager",
          class = "btn btn-sm btn-default hint",
          ),
        actionButton(
          label = d("btn_show_invite_member",language,web=T),
          inputId = "btnShowInviteMember",
          class = "btn btn-sm btn-default hint",
          ),
        actionButton(
          label = d("btn_show_project_config",language,web=T),
          inputId = "btnShowProjectConfig",
          class = "btn btn-sm btn-default hint",
          ),
        actionButton(
          label =  d(labelBtnDelete,language,web=T),
          inputId = "btnShowProjectDelete",
          class = "btn btn-sm btn-default hint " + ifelse(isProjectDefault,"disabled",""),
          ),
        actionButton(
          label =  d('btn_show_project_views_states',language, web=T),
          inputId = "btnShowProjectViewsStates",
          class = "btn btn-sm btn-default hint "
          )
        )
    }

    editProject <- tagList(
      toolsTitle,
      btns
      )

    output$uiBtnShowRoleManager <- renderUI(editProject)

  })
})


