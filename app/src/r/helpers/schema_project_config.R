#
# Create a unified schema for project configuration
#
mxCreateProjectConfigSchema <- function(projectData, language, project) {
  languages <- .get(config, c("languages", "codes"))
  v <- .get(config, c("validation", "input", "nchar"))
  projection <- .get(projectData, "map_projection", list())

  # Helper function for translations
  tt <- function(id) {
    d(id, language, web = F)
  }


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
              org_contact_name = list(
                type = "string",
                title = tt("project_contact_name"),
                default = projectData$org_contact_name
              ),
              org_contact_email = list(
                type = "string",
                title = tt("project_contact_email"),
                format = "email",
                default = projectData$org_contact_email
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
            items = list(
              type = "string"
            ),
            maxItems = 10,
            minItems = 0,
            default = projectData$countries,
            mx_options = list(
              renderer = "tom-select",
              loader = "countries"
            )
          ),
          theme= list(
            type = "string",
            title = tt("project_id_theme"),
            default = projectData$theme,
            maxItems = 1,
            minItems = 0,
            mx_options = list(
              renderer = "tom-select",
              loader = "themes"
            )
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
        org_contact_name = projectData$org_contact_name,
        org_contact_email = projectData$org_contact_email
      )
    ),
    appearance = list(
      logo = projectData$logo,
      countries = projectData$countries,
      theme = projectData$theme
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
    startVal = startVal,
    time = Sys.time()
  ))
}
