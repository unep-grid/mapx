#
# Project config - Refactored version
# Unified schema approach with comprehensive validation
#

# Main event handler for showing project configuration
observeEvent(input$btnShowProjectConfig, {
  userRole <- getUserRole()
  project <- reactData$project
  language <- reactData$language
  isAdmin <- isTRUE(userRole$admin)
  userData <- reactUser$data

  if (isAdmin) {
    projectData <- mxDbGetProjectData(project)

    # Create unified schema for project configuration
    unifiedSchema <- mxCreateProjectUnifiedSchema(projectData, language, project)

    # Initialize the schema
    jedSchema(
      id = "projectUnifiedSchema",
      schema = unifiedSchema$schema,
      startVal = unifiedSchema$startVal,
      options = list(
        getValidationOnChange = TRUE,
        getValuesOnChange = TRUE
      )
    )

    # Create additional UI components that are not part of the schema
    ui <- tagList(
      jedOutput("projectUnifiedSchema"),
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
# Create a unified schema for project configuration
#
mxCreateProjectUnifiedSchema <- function(projectData, language, project) {
  languages <- .get(config, c("languages", "codes"))
  v <- .get(config, c("validation", "input", "nchar"))
  projection <- .get(projectData, "map_projection", list())

  # Helper function for translations
  tt <- function(id) {
    d(id, language, web = F)
  }

  # Create counter to keep property order


  # Create the schema structure
  schema <- list(
    title = tt("project_settings"),
    type = "object",
    options = list(
      disable_collapse = TRUE,
      disable_edit_json = TRUE,
      disable_properties = TRUE
    ),
    properties = list(
      basic_info = list(
        type = "object",
        title = tt("project_basic_info"),
        options = list(
          collapsed = FALSE
        ),
        properties = list(
          title = mxSchemaMultiLingualInput(
            keyTitle = "project_title",
            format = "text",
            default = .get(projectData, c("title")),
            language = language,
            languagesRequired = c(),
            languagesHidden = languages[!languages %in% c(language, "en")],
            minLength = v$projectTitle$min,
            maxLength = v$projectTitle$max
          ),
          description = mxSchemaMultiLingualInput(
            keyTitle = "project_description",
            format = "text",
            default = .get(projectData, c("description")),
            language = language,
            languagesRequired = c(),
            languagesHidden = languages[!languages %in% c(language, "en")],
            minLength = v$projectAbstract$min,
            maxLength = v$projectAbstract$max
          ),
          alias = list(
            type = "string",
            title = tt("project_alias_name"),
            default = projectData$alias,
            description = tt("project_alias_name_desc")
          ),
          organisation = list(
            type = "object",
            title = tt("project_org_details"),
            options = list(collapsed = TRUE),
            properties = list(
              org_name = list(
                type = "string",
                title = tt("project_org_name"),
                default = projectData$org_name
              ),
              contact_name = list(
                type = "string",
                title = tt("project_contact_name"),
                default = projectData$contact_name
              ),
              contact_email = list(
                type = "string",
                title = tt("project_contact_email"),
                format = "email",
                default = projectData$contact_email
              )
            )
          )
        )
      ),
      appearance = list(
        type = "object",
        title = tt("project_appearance"),
        options = list(collapsed = TRUE),
        properties = list(
          theme = list(
            type = "string",
            title = tt("project_id_theme"),
            enum = names(config$themes$idsNamed),
            options = list(
              enum_titles = unname(config$themes$idsNamed)
            ),
            default = projectData$theme
          ),
          logo = list(
            type = "string",
            format = "svg",
            title = tt("project_logo"),
            options = list(
              label = tt("project_logo"),
              uploadText = tt("project_logo_upload")
            ),
            default = .get(projectData, c("logo"))
          ),
          countries = list(
            type = "array",
            title = tt("project_countries_highlight"),
            uniqueItems = TRUE,
            format = "select_tom_simple",
            items = list(
              type = "string",
              enum = names(mxGetCountryList(language, includeWorld = F))
            ),
            options = list(
              enum_titles = unname(mxGetCountryList(language, includeWorld = F))
            ),
            default = projectData$countries
          )
        )
      ),
      map_settings = list(
        type = "object",
        title = tt("project_map_settings"),
        options = list(collapsed = TRUE),
        properties = list(
          map_position = list(
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
            ),
            default = .get(projectData, c("map_position"))
          ),
          projection = list(
            type = "object",
            title = tt("project_map_projection"),
            properties = list(
              name = list(
                type = "string",
                title = tt("project_map_projection_type"),
                enum = c("mercator", "globe"),
                options = list(
                  enum_titles = c(
                    tt("project_map_projection_mercator"),
                    tt("project_map_projection_globe")
                  )
                ),
                default = .get(projection, "name", "mercator")
              ),
              disableGlobe = list(
                type = "boolean",
                format = "checkbox",
                title = tt("project_disable_globe"),
                default = .get(projection, "disableGlobe", FALSE)
              )
            )
          )
        )
      ),
      access_settings = list(
        type = "object",
        title = tt("project_access_settings"),
        options = list(collapsed = TRUE),
        properties = list(
          public = list(
            type = "boolean",
            format = "checkbox",
            title = tt("project_enable_public"),
            default = projectData$public
          ),
          allow_join = list(
            type = "boolean",
            format = "checkbox",
            title = tt("project_enable_join"),
            default = projectData$allow_join
          )
        )
      )
    )
  )

  # Create start values for the schema
  startVal <- list(
    basic_info = list(
      title = projectData$title,
      description = projectData$description,
      alias = projectData$alias,
      organisation = list(
        org_name = projectData$org_name,
        contact_name = projectData$contact_name,
        contact_email = projectData$contact_email
      )
    ),
    appearance = list(
      theme = projectData$theme,
      logo = projectData$logo,
      countries = projectData$countries
    ),
    map_settings = list(
      map_position = projectData$map_position,
      projection = list(
        name = .get(projection, "name", "mercator"),
        disableGlobe = .get(projection, "disableGlobe", FALSE)
      )
    ),
    access_settings = list(
      public = projectData$public,
      allow_join = projectData$allow_join
    )
  )

  return(list(
    schema = schema,
    startVal = startVal
  ))
}

#
# Validation for the project configuration
#
observe({
  # Monitor for changes in the unified schema values
  input$projectUnifiedSchema_values

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

    # Get values from the unified schema
    schemaValues <- input$projectUnifiedSchema_values$data

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

  # Get values from the unified schema
  schemaValues <- input$projectUnifiedSchema_values$data

  # Extract all the values from the schema structure
  # Basic info section
  title <- .get(schemaValues, c("basic_info", "title"))
  description <- .get(schemaValues, c("basic_info", "description"))
  aliasProject <- .get(schemaValues, c("basic_info", "alias"))
  orgName <- .get(schemaValues, c("basic_info", "organisation", "org_name"))
  contactName <- .get(schemaValues, c("basic_info", "organisation", "contact_name"))
  contactEmail <- .get(schemaValues, c("basic_info", "organisation", "contact_email"))

  # Appearance section
  logo <- .get(schemaValues, c("appearance", "logo"))
  theme <- .get(schemaValues, c("appearance", "theme"))
  countries <- .get(schemaValues, c("appearance", "countries"), list())

  # Map settings section
  mapPosition <- .get(schemaValues, c("map_settings", "map_position"))
  projectionName <- .get(schemaValues, c("map_settings", "projection", "name"), "mercator")
  projectionDisableGlobe <- .get(schemaValues, c("map_settings", "projection", "disableGlobe"), FALSE)

  # Access settings section
  isPublic <- .get(schemaValues, c("access_settings", "public"), FALSE)
  allowJoin <- .get(schemaValues, c("access_settings", "allow_join"), FALSE)

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
    org_name = orgName,
    contact_name = contactName,
    contact_email = contactEmail,
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

  # Update UI settings
  mxUpdateSettings(list(
    project = list(
      id = project,
      public = isPublic,
      title = title
    )
  ))

  # Flash save icon
  mxFlashIcon("floppy-o")
})
