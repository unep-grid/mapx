#
# Admin panel and button
#
observe({
  userRole <- getUserRole()
  userData <- reactUser$data
  isAdmin <- isTRUE(userRole$admin)
  isPublisher <- isTRUE(userRole$publisher)
  isProjectCreator <- isTRUE(userRole$project_creator)
  isProjectDefault <- isTRUE(
    reactData$project == .get(config, c("project", "default"))
  )
  isGuest <- isGuestUser()

  if (isGuest) {
    return()
  }

  isolate({
    language <- reactData$language
    toolsTitle <- tagList(
      tags$h4(d("title_tools_admin_project", language, web = T))
    )

    btns <- tagList()

    labelBtnAdd <- ifelse(
      isProjectCreator,
      "btn_show_add_project",
      "btn_show_add_project_disabled"
    )
    labelBtnDelete <- ifelse(
      isProjectDefault,
      "btn_show_project_delete_disabled",
      "btn_show_project_delete"
    )


    btns <- tagList(
      btns,
      actionButton(
        label = mxLabel(labelBtnAdd, language, 'plus'),
        inputId = "btnShowAddProject",
        class = "btn btn-default " + ifelse(isProjectCreator, "", "disabled")
      )
    )

    if (isPublisher) {
      btns <- tagList(
        btns,
        actionButton(
          label = mxLabel("btn_show_project_external_views", language, "share-alt-square"),
          inputId = "btnShowProjectExternalViews",
          class = "btn btn-default"
        )
      )
    }

    if (isAdmin) {
      btns <- tagList(
        btns,
        actionButton(
          label = mxLabel("btn_show_role_manager", language, "users"),
          inputId = "btnShowRoleManager",
          class = "btn btn-default",
        ),
        actionButton(
          label = mxLabel("btn_show_invite_member", language, "user-plus"),
          inputId = "btnShowInviteMember",
          class = "btn btn-default",
        ),
        actionButton(
          label = mxLabel("btn_show_project_config", language, "cog"),
          inputId = "btnShowProjectConfig",
          class = "btn btn-default",
        ),
        actionButton(
          label = mxLabel(labelBtnDelete, language, "trash-o"),
          inputId = "btnShowProjectDelete",
          class = "btn btn-default " + ifelse(isProjectDefault, "disabled", ""),
        ),
        actionButton(
          label = mxLabel("btn_show_project_views_states", language, "sitemap fa-rotate-270"),
          inputId = "btnShowProjectViewsStates",
          class = "btn btn-default "
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
