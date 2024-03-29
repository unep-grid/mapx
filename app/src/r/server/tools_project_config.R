#
# Project config
# TODO: merge multiple schemas into one.
#
observeEvent(input$btnShowProjectConfig, {
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data

  if (isAdmin) {
    projectData <- mxDbGetProjectData(project)
    projection <- .get(projectData, "map_projection", list())
    #
    # Set public mode and
    # create select input for members, publishers and admins
    #
    ui <- tagList(
      jedOutput("projectTitleSchema"),
      jedOutput("projectDescriptionSchema"),
      jedOutput("projectMapPosition"),
      selectizeInput(
        "selectProjectConfigCountries",
        label = d("project_countries_highlight", language, web = F),
        selected = projectData$countries,
        choices = mxGetCountryList(language, includeWorld = F),
        multiple = TRUE,
        options = list(
          plugins = list("remove_button")
        )
      ),
      selectizeInput(
        "selectProjectConfigTheme",
        label = d("project_id_theme", language, web = F),
        selected = projectData$theme,
        choices = config$themes$idsNamed
      ),
      tags$div(
        class = "well",
        tagList(
          textInput("txtProjectNameAlias",
            ddesc("project_alias_name", language),
            value = projectData$alias,
            placeholder = project
          )
        )
      ),
      checkboxInput(
        "checkProjectionGlobe",
        label = ddesc("project_globe_projection", language),
        value = isTRUE(projection$name == "globe")
      ),
      checkboxInput(
        "checkProjectPublic",
        label = ddesc("project_enable_public", language),
        value = projectData$public
      ),
      checkboxInput(
        "checkProjectEnableJoin",
        label = d("project_enable_join", language),
        value = projectData$allow_join
      ),
      uiOutput("uiValidateProject")
    )

    btnSave <- actionButton(
      "btnSaveProjectConfig",
      d("btn_save", language)
    )


    mxModal(
      id = "projectConfig",
      title = d("project_settings", language, web = F),
      content = ui,
      textCloseButton = d("btn_close", language, web = F),
      buttons = list(btnSave),
      addBackground = FALSE
    )
  }
})


#
# Validation schema
#

observe({
  input$projectTitleSchema_values
  input$projectDescriptionSchema_values
  input$checkProjectPublic
  input$checkProjectEnableJoin
  input$txtProjectNameAlias
  isolate({
    #
    # Other input check
    #
    disabled <- TRUE
    language <- reactData$language
    errorsList <- list()
    warningsList <- list()


    project <- reactData$project
    if (isEmpty(project)) {
      return()
    }
    projectTitle <- input$projectTitleSchema_values$data
    projectDesc <- input$projectDescriptionSchema_values$data
    projectAlias <- input$txtProjectNameAlias

    isProjectDefaultNotPublic <- !isTRUE(input$checkProjectPublic) && .get(config, c("project", "default")) == project

    isProjectAliasValid <- mxDbValidateProjectAlias(projectAlias, project)

    v <- .get(config, c("validation", "input", "nchar"))

    if (language != "en") {
      languagesTest <- c("en", language)
    } else {
      languagesTest <- c("en")
    }

    errTest <- function(language = "en",
      type = "",
      test =
        {}) {
      if (isTRUE(test)) {
        err <- list(
          type = type,
          language = language
        )
        errorsList <<- c(errorsList, list(err))
      }
    }

    for (l in languagesTest) {
      errTest(l, "error_description_short", isEmpty(projectDesc[[l]]) || nchar(projectDesc[[l]]) < v$projectAbstract$min)
      errTest(l, "error_description_long", nchar(projectDesc[[l]]) > v$projecAbstract$max)
      errTest(l, "error_description_bad", mxProfanityChecker(projectDesc[[l]]))
      errTest(l, "error_title_short", isEmpty(projectTitle[[l]]) || nchar(projectTitle[[l]]) < v$projectTitle$min)
      errTest(l, "error_title_long", nchar(projectTitle[[l]]) > v$projectTitle$max)
      errTest(l, "error_title_bad", mxProfanityChecker(projectTitle[[l]]))
      errTest(l, "error_title_exists", mxDbProjectTitleExists(projectTitle[[l]], ignore = project))
    }

    if (isProjectDefaultNotPublic) {
      errorsList <- c(errorsList, list(list(type = "error_project_default_not_public", language = language)))
    }
    if (!isProjectAliasValid) {
      errorsList <- c(errorsList, list(list(type = "error_project_alias_not_valid", language = language)))
    }

    disabled <- isTRUE(length(errorsList) > 0)

    mxToggleButton(
      id = "btnSaveProjectConfig",
      disable = disabled
    )

    output$projectConfig_validation <- renderUI(
      mxErrorsLangToUi(
        errorsList = errorsList,
        warningsList = warningsList
      )
    )

    reactData$projectConfigValid <- !disabled
  })
})


observeEvent(input$projectMapPosition_init, {
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  if (isAdmin) {
    project <- reactData$project
    projectData <- mxDbGetProjectData(project)
    language <- reactData$language
    tt <- function(id) {
      d(id, language, web = F)
    }
    mapPosition <- .get(projectData, c("map_position"))

    schema <- list(
      type = "object",
      format = "position",
      title = tt("project_map_pos_set"),
      options = list(
        addButtonPos = TRUE,
        idMap = "map_main",
        textButton = tt("project_map_pos_get"),
        collapsed = TRUE
      ),
      properties = list(
        z = list(
          title = tt("map_zoom"),
          type = "number",
          minimum = 0,
          maximum = 22
        ),
        lat = list(
          title = tt("map_latitude_center"),
          type = "number",
          minimum = -90,
          maximum = 90
        ),
        lng = list(
          title = tt("map_longitude_center"),
          type = "number",
          minimum = -180,
          maximum = 180
        ),
        pitch = list(
          title = tt("map_pitch"),
          type = "number",
          minimum = 0,
          maximum = 60
        ),
        bearing = list(
          title = tt("map_bearing"),
          type = "number"
        ),
        n = list(
          title = tt("map_north_max"),
          type = "number"
        ),
        s = list(
          title = tt("map_south_max"),
          type = "number"
        ),
        e = list(
          title = tt("map_east_max"),
          type = "number"
        ),
        w = list(
          title = tt("map_west_max"),
          type = "number"
        ),
        fitToBounds = list(
          type = "boolean",
          format = "checkbox",
          title = tt("map_fit_to_bounds")
        ),
        useMaxBounds = list(
          type = "boolean",
          format = "checkbox",
          title = tt("map_use_max_bounds"),
          description = tt("map_use_max_bounds_desc")
        )
      )
    )

    jedSchema(
      id = "projectMapPosition",
      schema = schema,
      startVal = mapPosition,
      options = list(
        getValidationOnChange = TRUE,
        getValuesOnChange = TRUE
      )
    )
  }
})



observeEvent(input$projectTitleSchema_init, {
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  if (isAdmin) {
    project <- reactData$project
    projectData <- mxDbGetProjectData(project)
    language <- reactData$language
    languages <- .get(config, c("languages", "codes"))
    titles <- .get(projectData, c("title"))
    v <- .get(config, c("validation", "input", "nchar"))

    schema <- mxSchemaMultiLingualInput(
      keyTitle = "project_title",
      format = "text",
      default = titles,
      language = language,
      languagesRequired = c(),
      languagesHidden = languages[!languages %in% c(language, "en")],
      minLength = v$projectTitle$min,
      maxLength = v$projectTitle$max
    )

    jedSchema(
      id = "projectTitleSchema",
      schema = schema,
      startVal = titles,
      options = list(
        getValidationOnChange = TRUE,
        getValuesOnChange = TRUE
      )
    )
  }
})

observeEvent(input$projectDescriptionSchema_init, {
  userRole <- getUserRole()
  isAdmin <- isTRUE(userRole$admin)
  v <- .get(config, c("validation", "input", "nchar"))

  if (isAdmin) {
    project <- reactData$project
    projectData <- mxDbGetProjectData(project)
    language <- reactData$language
    languages <- .get(config, c("languages", "codes"))
    descriptions <- .get(projectData, c("description"))

    schema <- mxSchemaMultiLingualInput(
      keyTitle = "project_description",
      format = "text",
      default = descriptions,
      language = language,
      languagesRequired = c(),
      languagesHidden = languages[!languages %in% c(language, "en")],
      minLength = v$projectAbstract$min,
      maxLength = v$projectAbstract$max
    )

    jedSchema(
      id = "projectDescriptionSchema",
      schema = schema,
      startVal = descriptions,
      options = list(
        getValidationOnChange = TRUE,
        getValuesOnChange = TRUE
      )
    )
  }
})


observeEvent(input$btnSaveProjectConfig, {
  mxToggleButton(
    id = "btnSaveProjectConfig",
    disable = TRUE
  )

  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  isValid <- isTRUE(reactData$projectConfigValid)
  isPublic <- isTRUE(input$checkProjectPublic) || .get(config, c("project", "default")) == project
  allowJoin <- isTRUE(input$checkProjectEnableJoin)
  aliasProject <- input$txtProjectNameAlias
  aliasProject <- ifelse(isTRUE(mxDbValidateProjectAlias(aliasProject, project)), aliasProject, "")

  countries <- input$selectProjectConfigCountries
  theme <- input$selectProjectConfigTheme

  projection <- list(
    name = ifelse(isTRUE(input$checkProjectionGlobe), "globe", "mercator"),
    disableGlobe = isTRUE(input$checkProjectionGlobeDisable)
  )


  if (isEmpty(countries)) {
    countries <- list()
  }

  if (!isAdmin || !isValid) {
    return()
  }

  mxDbSaveProjectData(project, list(
    public = isPublic,
    active = TRUE,
    title = input$projectTitleSchema_values$data,
    description = input$projectDescriptionSchema_values$data,
    alias = aliasProject,
    admins = NULL,
    members = NULL,
    publishers = NULL,
    map_position = input$projectMapPosition_values$data,
    map_projection = projection,
    countries = countries,
    theme = theme,
    creator = NULL,
    allow_join = allowJoin
  ))

  reactData$updateProject <- runif(1)

  mxUpdateText(
    id = "projectConfig_txt",
    text = sprintf("Saved at %s", format(Sys.time(), "%H:%M"))
  )

  #
  # Re-enable button only of success
  #
  mxToggleButton(
    id = "btnSaveProjectConfig",
    disable = FALSE
  )

  #
  # Update UI
  #
  mxUpdateSettings(list(
    project = list(
      id = project,
      public = isPublic,
      title = input$projectTitleSchema_values$data
    )
  ))

  mxFlashIcon("floppy-o")
})
