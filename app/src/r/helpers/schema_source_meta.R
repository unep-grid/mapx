#' Produce a MapX JSON schema for sources metadata
#'
#' @param language {Character} Two letter language code
#' @param attributesNames {Character} Vector of attribute names. Used to generate attribute and attribute_alias translation schema.
#' @param title {Character} Default Title
#' @param abstract {Character} Default abstract
#' @param notes {Character} Default notes
#' @param noAttributes {Logical} Do not output schema for attributes and attributes alias.
#' @param idSource Used to create an bounding box editor
#' @return Ready to parse JSON schema
mxSchemaSourceMeta <- function(
  language = NULL,
  attributesNames = c(),
  title = "",
  abstract = "",
  notes = "",
  noAttributes = FALSE,
  idSource = NULL,
  idView = NULL
) {
  #
  #
  # PArtial use of codes from from  https://geo-ide.noaa.gov/wiki/index.php?title=ISO_19115_and_19115-2_CodeList_Dictionaries#MD_GeometricObjectTypeCode

  # dict =  .get(config,c("dictionaries","schemaMetadata"))
  dict <- config$dict
  v <- .get(config, c("validation", "input", "nchar"))

  #
  # Counter to keep property in the same order as described here
  #
  mxCounter(reset = T)

  #
  # Avoid replicating language when extracting dict item
  #
  t <- function(id = NULL) {
    d(id = id, lang = language)
  }

  m49Options <- mxGetM49Options(language)

  #
  # Final object
  #
  out <- list(
    title = t("schema_title"),
    description = t("schema_desc"),
    type = "object",
    properties = list(
      text = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("textual_title"),
        description = t("textual_desc"),
        options = list(collapsed = TRUE),
        properties = list(
          title = mxSchemaMultiLingualInput(
            language = language,
            keyTitle = "textual_desc_title",
            default = list(en = title),
            dict = dict,
            maxLength = v$sourceTitle$max,
            minLength = v$sourceTitle$min
          ),
          abstract = mxSchemaMultiLingualInput(
            language = language,
            keyTitle = "textual_desc_abstract",
            default = list(en = abstract),
            type = "string",
            format = "textarea",
            dict = dict,
            maxLength = v$sourceAbstract$max,
            minLength = v$sourceAbstract$min
          ),
          keywords = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            options = list(collapsed = TRUE),
            title = t("textual_keyword_title"),
            description = t("textual_keyword_desc"),
            properties = list(
              keys = list(
                title = t("textual_keywords_title"),
                description = t("textual_keywords_desc"),
                type = "array",
                uniqueItems = TRUE,
                format = "selectizeMetaKeywords",
                items = list(
                  type = "string",
                  title = t("textual_keyword_item_title"),
                  minLength = v$sourceKeywords$min
                )
              ),
              keys_m49 = list(
                title = t("textual_keywords_m49_title"),
                type = "array",
                description = t("textual_keywords_m49_desc"),
                format = "selectizeOptGroup",
                uniqueItems = TRUE,
                minItems = 1,
                options = m49Options,
                items = list(
                  type = "string"
                )
              ),
              keys_gemet = list(
                title = t("textual_keywords_gemet_title"),
                type = "array",
                description = t("textual_keywords_gemet_desc"),
                format = "selectizeGemet",
                uniqueItems = TRUE,
                minItems = 0,
                items = list(
                  type = "string"
                )
              ),
              keys_topic = list(
                title = t("textual_topics"),
                description = t("textual_topics_desc"),
                type = "array",
                format = "select_tom_simple",
                uniqueItems = TRUE,
                items = list(
                  type = "string",
                  enum = c(
                    "biota",
                    "boundaries",
                    "farming",
                    "climatologyMeteorologyAtmosphere",
                    "economy",
                    "elevation",
                    "environment",
                    "geoscientificInformation",
                    "health",
                    "imageryBaseMapsEarthCover",
                    "intelligenceMilitary",
                    "inlandWaters",
                    "location",
                    "oceans",
                    "planningCadastre",
                    "society",
                    "structure",
                    "transportation",
                    "utilitiesCommunication"
                  ),
                  options = list(
                    enum_titles = c(
                      "biota",
                      "boundaries",
                      "farming",
                      "climatology meteorology atmosphere",
                      "economy",
                      "elevation",
                      "environment",
                      "geoscientific information",
                      "health",
                      "imagery base maps earth cover",
                      "intelligence military",
                      "inland waters",
                      "location",
                      "oceans",
                      "planning cadastre",
                      "society",
                      "structure",
                      "transportation",
                      "utilities communication"
                    )
                  )
                )
              )
            )
          ),
          attributes = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("attributes_desc_title"),
            description = t("attributes_desc_desc"),
            options = list(collapsed = TRUE),
            properties = mxSchemaAttributeInput(
              language = language,
              format = "textarea",
              keyTitle = "attribute_desc_item_title",
              keyCounter = "attr",
              type = "string",
              collapsed = TRUE,
              attributes = attributesNames,
              dict = dict,
              maxLength = v$sourceAttributesDesc$max,
              minLength = v$sourceAttributesDesc$min
            )
          ),
          attributes_alias = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("attributes_alias_title"),
            description = t("attributes_alias_desc"),
            options = list(collapsed = TRUE),
            properties = mxSchemaAttributeInput(
              language = language,
              format = "text",
              keyTitle = "attribute_alias_item_title",
              keyCounter = "attr",
              type = "string",
              collapsed = TRUE,
              attributes = attributesNames,
              dict = dict,
              maxLength = v$sourceAttributesAlias$max,
              minLength = v$sourceAttributesAlias$min
            )
          ),
          notes = mxSchemaMultiLingualInput(
            language = language,
            keyTitle = "textual_desc_notes",
            default = list(en = notes),
            type = "string",
            format = "textarea",
            dict = dict,
            languagesRequired = c()
          ),
          language = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("lang_title"),
            description = t("lang_desc"),
            options = list(collapsed = TRUE),
            properties = list(
              codes = list(
                type = "array",
                title = t("lang_list_title"),
                description = t("lang_list_desc"),
                format = "table",
                items = list(
                  type = "object",
                  options = list(collapsed = TRUE),
                  title = t("lang_item_title"),
                  properties = list(
                    code = list(
                      type = "string",
                      pattern = "[a-z]{2}",
                      default = "en"
                    )
                  )
                )
              )
            )
          ),
          data_attribution = list(
            title = t("textual_data_attribution"),
            description = t("textual_data_attribution_desc"),
            type = "string"
          ),
          citation = list(
            title = t("textual_citation"),
            description = t("textual_citation_desc"),
            type = "string"
          )
        )
      ),
      temporal = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("temporal_title"),
        description = t("temporal_desc"),
        options = list(collapsed = TRUE),
        properties = list(
          issuance = list(
            type = "object",
            title = t("temporal_issuance_title"),
            description = t("temporal_issuance_desc"),
            options = list(collapsed = TRUE),
            properties = list(
              periodicity = list(
                title = t("temporal_periodicity"),
                description = t("temporal_periodicity_desc"),
                type = "string",
                enum = c(
                  "continual",
                  "daily",
                  "weekly",
                  "fortnightly",
                  "monthly",
                  "quarterly",
                  "biannually",
                  "annually",
                  "as_needed",
                  "irregular",
                  "not_planned",
                  "unknown"
                ),
                options = list(
                  enum_titles =
                    t(c(
                      "continual",
                      "daily",
                      "weekly",
                      "fortnightly",
                      "monthly",
                      "quarterly",
                      "biannually",
                      "annually",
                      "as_needed",
                      "irregular",
                      "not_planned",
                      "unknown"
                    ))
                )
              ),
              released_at = list(
                title = t("temporal_release_title"),
                description = t("temporal_release_desc"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                # default = format(Sys.Date(),"%Y-%m-%d")
                default = "0001-01-01"
              ),
              modified_at = list(
                title = t("temporal_update_title"),
                description = t("temporal_update_desc"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
              )
            )
          ),
          range = list(
            title = t("temporal_range_title"),
            description = t("temporal_range_desc"),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              is_timeless = list(
                title = t("temporal_range_timeless"),
                type = "boolean",
                format = "checkbox"
              ),
              start_at = list(
                title = t("temporal_range_start"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
              ),
              end_at = list(
                title = t("temporal_range_end"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
              )
            )
          )
        )
      ),
      spatial = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("spatial_title"),
        description = t("spatial_desc"),
        options = list(collapsed = TRUE),
        properties = list(
          crs = list(
            title = t("spatial_srs_title"),
            description = t("spatial_srs_desc"),
            type = "object",
            format = "table",
            options = list(collapsed = TRUE),
            properties = list(
              code = list(
                title = t("spatial_srs_code"),
                type = "string",
                default = "EPSG:4326"
              ),
              url = list(
                title = t("spatial_srs_desc_url"),
                type = "string",
                default = "http://spatialreference.org/ref/epsg/4326/"
              )
            )
          ),
          bbox = list(
            title = t("spatial_bbx_title"),
            description = t("spatial_bbx_desc"),
            type = "object",
            format = "meta_bbox",
            options = list(
              collapsed = TRUE,
              idSource = idSource,
              idView = idView
            ),
            required = c(),
            properties = list(
              lng_min = list(
                title = t("spatial_bbx_lng_min"),
                type = "number",
                minimum = -180,
                maximum = 180,
                minLength = 0,
                default = -180
              ),
              lng_max = list(
                title = t("spatial_bbx_lng_max"),
                type = "number",
                minumum = -180,
                maximum = 180,
                minLength = 0,
                default = 180
              ),
              lat_min = list(
                title = t("spatial_bbx_lat_min"),
                type = "number",
                minumum = -90,
                maximum = 90,
                default = -90
              ),
              lat_max = list(
                title = t("spatial_bbx_lat_max"),
                type = "number",
                minumum = -90,
                maximum = 90,
                default = 90
              )
            )
          )
        )
      ),
      contact = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("contact_title"),
        description = t("contact_desc"),
        options = list(collapsed = TRUE),
        properties = list(
          contacts = list(
            title = t("contact_list_title"),
            type = "array",
            items = list(
              title = t("contact_item_title"),
              type = "object",
              options = list(collapsed = TRUE),
              properties = list(
                "function" = list(
                  title = t("contact_function"),
                  default = "point_of_contact",
                  type = "string",
                  minLength = 1,
                  enum = list(
                    "point_of_contact",
                    "author",
                    "custodian",
                    "distributor",
                    "originator",
                    "owner",
                    "principal_investigator",
                    "processor",
                    "publisher",
                    "resource_provider",
                    "user"
                  ),
                  options = list(
                    enum_titles = list(
                      t("contact_function_point_of_contact"),
                      t("contact_function_author"),
                      t("contact_function_custodian"),
                      t("contact_function_distributor"),
                      t("contact_function_originator"),
                      t("contact_function_owner"),
                      t("contact_function_principal_investigator"),
                      t("contact_function_processor"),
                      t("contact_function_publisher"),
                      t("contact_function_resource_provider"),
                      t("contact_function_user")
                    )
                  )
                ),
                honorific = list(
                  title = t("contact_honorific"),
                  type = "string"
                ),
                name = list(
                  title = t("contact_name"),
                  type = "string"
                ),
                organisation_name = list(
                  title = t("contact_org_name"),
                  type = "string"
                ),
                address = list(
                  title = t("contact_address"),
                  type = "string"
                ),
                city = list(
                  title = t("contact_city"),
                  type = "string"
                ),
                state = list(
                  title = t("contact_state"),
                  type = "string"
                ),
                postal_code = list(
                  title = t("contact_postal_code"),
                  type = "string"
                ),
                country = list(
                  title = t("contact_country"),
                  type = "string"
                ),
                email = list(
                  title = t("contact_email"),
                  type = "string",
                  minLength = 3
                )
              )
            )
          )
        )
      ),
      origin = list(
        propertyOrder = mxCounter("a"),
        title = t("origin_title"),
        description = t("origin_desc"),
        options = list(collapsed = TRUE),
        type = "object",
        properties = list(
          homepage = list(
            type = "object",
            title = t("origin_homepage_title"),
            description = t("origin_homepage_desc"),
            options = list(collapsed = TRUE),
            properties = list(
              url = list(
                title = t("origin_homepage_item_title"),
                type = "string",
                format = "uri"
              )
            )
          ),
          `source` = list(
            type = "object",
            options = list(collapsed = TRUE),
            title = t("origin_sources_title"),
            description = t("origin_sources_desc"),
            properties = list(
              urls = list(
                type = "array",
                title = t("origin_sources_list"),
                uniqueItems = TRUE,
                items = list(
                  type = "object",
                  title = t("origin_source_title"),
                  options = list(collapsed = TRUE),
                  properties = list(
                    is_download_link = list(
                      title = t("origin_source_is_full_request_title"),
                      type = "boolean",
                      format = "checkbox",
                      default = FALSE
                    ),
                    url = list(
                      title = t("origin_source_url_title"),
                      type = "string",
                      format = "uri"
                    ),
                    label = list(
                      title = t("origin_source_url_label_title"),
                      type = "string",
                      format = "string"
                    )
                  )
                )
              )
            )
          )
        )
      ),
      license = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("license_title"),
        description = t("license_desc"),
        options = list(
          collapsed = TRUE
        ),
        properties = list(
          licenses = list(
            type = "array",
            title = t("license_list_title"),
            description = t("license_list_desc"),
            items = list(
              type = "object",
              title = t("license_item_title"),
              options = list(collapsed = TRUE),
              properties = list(
                name = list(
                  title = t("license_name"),
                  type = "string"
                ),
                text = list(
                  title = t("license_text"),
                  type = "string",
                  format = "textarea"
                )
              )
            )
          )
        )
      ),
      annex = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("additional_doc_title"),
        description = t("additional_doc_desc"),
        options = list(
          collapsed = TRUE
        ),
        properties = list(
          references = list(
            type = "array",
            title = t("additional_doc_items_title"),
            description = t("additional_doc_items_desc"),
            items = list(
              type = "object",
              title = t("additional_doc_item_title"),
              options = list(collapsed = TRUE),
              properties = list(
                url = list(
                  title = t("additional_doc_item_url"),
                  type = "string",
                  format = "uri"
                )
              )
            ),
            uniqueItems = TRUE
          )
        )
      )
    )
  )

  if (noAttributes) {
    out <- .set(out, c("properties", "text", "properties", "attributes"), NULL)
    out <- .set(out, c("properties", "text", "properties", "attributes_alias"), NULL)
  }

  return(out)
}

#' Produce option and optgroup for m49 + countr name
#'
#' @param language {Character} Two letter language code
#' @return List with options  and optgroup list
mxGetM49Options <- function(language) {
  #
  # M9 keywords
  # {"country":[{"id":'COD'},{"id":'AFG'},...]}
  #
  m49Group <- .get(config, c("m49_geo_keywords")) # country, etc..

  # Translate groups and create optgroups
  optgroups <- lapply(names(m49Group), function(group) {
    list(value = group, label = d(group, language))
  })

  # Create options using lapply
  options <- do.call(c, lapply(names(m49Group), function(group) {
    lapply(m49Group[[group]], function(item) {
      list(value = item, text = d(item, language), optgroup = group)
    })
  }))

  # Sorting options based on the original order of
  # optgroups and then alphabetically within each group
  group_order <- setNames(1:length(names(m49Group)), names(m49Group))
  options <- options[order(sapply(options, function(opt) {
    group_order[opt$optgroup]
  }), sapply(options, function(opt) {
    opt$text
  }))]

  # Combine options and optgroups into a single list
  m49Options <- list(options = options, optgroups = optgroups)

  return(m49Options)
}
