#
# Project config - Refactored version
# Config schema approach with comprehensive validation
#

# Main event handler for showing project configuration
observeEvent(input$btnShowProjectConfig, {
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data

  if (!isAdmin) {
    return()
  }
  projectData <- mxDbGetProjectData(project)

  schema <- mxCreateProjectConfigSchema(projectData, language, project)


  # Create additional UI components that are not part of the schema
  ui <- tagList(
    jedOutput("projectConfigSchema"),
    uiOutput("uiValidateProject", class = c("mx-sticky-bottom-10"))
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

  projectTimeStamp <- as.numeric(
    as.POSIXct(projectData$date_modified, format = "%Y-%m-%d%tT%T", tz = "UTC")
  )

  # Initialize the schema
  jedSchema(
    id = "projectConfigSchema",
    schema = schema$schema,
    startVal = schema$startVal,
    options = list(
      addSearch = TRUE,
      getValidationOnChange = TRUE,
      getValuesOnChange = TRUE,
      draftAutoSaveId = sprintf("jed_project_config_%s", project),
      draftAutoSaveDbTimestamp = projectTimeStamp,
      disable_properties = TRUE,
      no_additional_properties = TRUE,
      show_errors = "always"
    )
  )
})

#
# Validation for the project configuration
#
observe({
  # Monitor for changes in the schema values
  input$projectConfigSchema_values

  isolate({
    # Basic validation setup
    disabled <- TRUE
    language <- reactData$language
    errorsList <- list()
    warningsList <- list()
    isReady <- isTRUE(reactData$mapIsReady)
    project <- reactData$project

    if (isEmpty(project) || !isReady) {
      return()
    }

    # Get values from the schema
    schemaValues <- input$projectConfigSchema_values$data

    if (isEmpty(schemaValues)) {
      return()
    }

    # Extract relevant values for validation
    projectTitle <- .get(schemaValues, c("basic_info", "title"))
    projectDesc <- .get(schemaValues, c("basic_info", "description"))
    projectAlias <- .get(schemaValues, c("basic_info", "alias"))
    isProjectPublic <- .get(schemaValues, c("access_settings", "public"), FALSE)


    # Special case for default project
    isProjectDefaultNotPublic <- !isTRUE(isProjectPublic) && .get(config, c("project", "default")) == project

    # Validate project alias
    isProjectAliasValid <- mxDbValidateProjectAlias(projectAlias, project)

    # Get validation parameters
    v <- .get(config, c("validation", "input", "nchar"))

    # Determine which languages to test
    if (language != "en") {
      languagesTest <- c("en", language)
    } else {
      languagesTest <- c("en")
    }

    # Helper function for validation errors
    errTest <- function(language = "en", type = "", test = {}) {
      if (isTRUE(test)) {
        err <- list(
          type = type,
          language = language
        )
        errorsList <<- c(errorsList, list(err))
      }
    }

    # Run validation tests for each language
    for (l in languagesTest) {
      errTest(l, "error_description_short", isEmpty(projectDesc[[l]]) || nchar(projectDesc[[l]]) < v$projectAbstract$min)
      errTest(l, "error_description_long", nchar(projectDesc[[l]]) > v$projectAbstract$max)
      errTest(l, "error_description_bad", mxProfanityChecker(projectDesc[[l]]))
      errTest(l, "error_title_short", isEmpty(projectTitle[[l]]) || nchar(projectTitle[[l]]) < v$projectTitle$min)
      errTest(l, "error_title_long", nchar(projectTitle[[l]]) > v$projectTitle$max)
      errTest(l, "error_title_bad", mxProfanityChecker(projectTitle[[l]]))
      errTest(l, "error_title_exists", mxDbProjectTitleExists(projectTitle[[l]], ignore = project))
    }

    # Additional validation for special cases
    if (isProjectDefaultNotPublic) {
      errorsList <- c(errorsList, list(list(type = "error_project_default_not_public", language = language)))
    }
    if (!isProjectAliasValid) {
      errorsList <- c(errorsList, list(list(type = "error_project_alias_not_valid", language = language)))
    }

    # Set button state based on validation
    disabled <- isTRUE(length(errorsList) > 0)

    mxToggleButton(
      id = "btnSaveProjectConfig",
      disable = disabled
    )

    # Display validation errors
    output$uiValidateProject <- renderUI(
      mxErrorsLangToUi(
        errorsList = errorsList,
        warningsList = warningsList
      )
    )

    # Store validation state for reference
    reactData$projectConfigValid <- !disabled
  })
})

#
# Save project configuration
#
observeEvent(input$btnSaveProjectConfig, {
  mxCatch(title = "btn save project config", {
    mxToggleButton(
      id = "btnSaveProjectConfig",
      disable = TRUE
    )

    userRole <- getUserRole()
    project <- reactData$project
    language <- reactData$language
    isAdmin <- isTRUE(userRole$admin)
    isValid <- isTRUE(reactData$projectConfigValid)

    if (!isAdmin || !isValid) {
      return()
    }

    # Get values from the schema
    data <- input$projectConfigSchema_values$data

    # Extract all the values from the schema structure
    # Basic info section
    title <- .get(data, c("basic_info", "title"))
    description <- .get(data, c("basic_info", "description"))
    aliasProject <- .get(data, c("basic_info", "alias"))
    termsOfUse <- .get(data, c("basic_info", "terms_of_use"))
    orgName <- .get(data, c("basic_info", "organisation", "org_name"))
    contactName <- .get(data, c("basic_info", "organisation", "org_contact_name"))
    contactEmail <- .get(data, c("basic_info", "organisation", "org_contact_email"))

    # Appearance section
    logo <- .get(data, c("appearance", "logo"))
    theme <- .get(data, c("appearance", "theme"), config$themes$default)
    countries <- .get(data, c("appearance", "countries"), list())

    # Map settings section
    mapPosition <- .get(data, c("map_settings", "map_position"))
    projectionName <- .get(data, c("map_settings", "projection", "name"), "mercator")
    projectionDisableGlobe <- .get(data, c("map_settings", "projection", "disableGlobe"), FALSE)

    # Access settings section
    isPublic <- .get(data, c("access_settings", "public"), FALSE)
    allowJoin <- .get(data, c("access_settings", "allow_join"), FALSE)

    # Default project must be public
    if (.get(config, c("project", "default")) == project) {
      isPublic <- TRUE
    }

    # Validate project alias
    hasValidAlias <- mxDbValidateProjectAlias(aliasProject, project)

    if (!hasValidAlias) {
      aliasProject <- ""
    }

    # Prepare projection data
    projection <- list(
      name = projectionName,
      disableGlobe = projectionDisableGlobe
    )

    # Ensure countries is a list
    if (isEmpty(countries)) {
      countries <- list()
    }

    # Save the project data
    mxDbSaveProjectData(project, list(
      public = isPublic,
      active = TRUE,
      title = title,
      description = description,
      alias = aliasProject,
      terms_of_use = termsOfUse,
      org_name = orgName,
      org_contact_name = contactName,
      org_contact_email = contactEmail,
      admins = NULL, # Keep existing data structure
      members = NULL, # Keep existing data structure
      publishers = NULL, # Keep existing data structure
      map_position = mapPosition,
      logo = logo,
      map_projection = projection,
      countries = countries,
      theme = theme,
      creator = NULL, # Keep existing data structure
      allow_join = allowJoin
    ))

    # Update the project state
    reactData$updateProject <- runif(1)

    # Show save confirmation
    mxUpdateText(
      id = "projectConfig_txt",
      text = sprintf("Saved at %s", format(Sys.time(), "%H:%M"))
    )

    # Re-enable save button
    mxToggleButton(
      id = "btnSaveProjectConfig",
      disable = FALSE
    )

    projectData <- mxDbGetProjectData(project)

    # Update UI settings
    mxUpdateSettings(list(
      project = projectData
    ))

    # Flash save icon
    mxFlashIcon("floppy-o")
  })
})
