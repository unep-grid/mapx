

mxSchemaSourceMeta <- function(language=NULL,rolesTarget="self",attributesNames=c(),extent=list(),title="",abstract="",notes=""){

  #
  # 
  # PArtial use of codes from from  https://geo-ide.noaa.gov/wiki/index.php?title=ISO_19115_and_19115-2_CodeList_Dictionaries#MD_GeometricObjectTypeCode

  dict =  .get(config,c("dictionaries","schemaMetadata"))

  #
  # Counter to keep property in the same order as described here 
  #  
  mxCounter(reset=T)

  t <- function(i=NULL){
    d(id=i,lang=language,dict=dict,web=F,asChar=T)
  }

  #
  # Final object
  #
  out = list(
    title = t("schema_title"),
    description = t("schema_desc"),
    type = "object",
    required = list(),
    properties = list(
      text = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title =  t("textual_title"),
        description = t("textual_desc"),
        options = list(collapsed = TRUE),
        properties = list(
          title = mxSchemaMultiLingualInput(
            language =  language,
            keyTitle = "textual_desc_title",
            default = list(en=title),
            dict = dict
            ),
          abstract = mxSchemaMultiLingualInput(
            language =  language,
            keyTitle="textual_desc_abstract",
            default = list(en=abstract),
            type="string",
            format="textarea",
            dict = dict
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
                type = "array",
                format = "table",
                minItems = 1,
                items = list(
                  type = "string",
                  title = t("textual_keyword_item_title")
                  )
                )
              )
            ),
          attributes = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("attributes_title"),
            description = t("attributes_desc"), 
            options = list(collapsed = TRUE),
            properties = mxSchemaAttributeInput(
              format = "textarea",
              keyTitle = "attribute_desc_title",
              keyCounter = "attr",
              type = "string",
              collapsed = TRUE,
              attributes = attributesNames,
              dict = dict
              )  
            ),
          notes = mxSchemaMultiLingualInput(
            language =  language,
            keyTitle = "textual_desc_notes",
            default = list(en=notes),
            type = "string",
            format = "textarea",
            dict = dict,
            englishRequired = F
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
            )
          )
        ),
      access = list(
        propertyOrder = mxCounter("a"),
        title = t("target_title"),
        description = t("target_desc"),
        type = "object",
        options = list(collapsed = TRUE),
        properties = list(
          rolesRead = list(
            title = t("target_roles_read_title"),
            type =  "array",
            format = "checkbox",
            uniqueItems = TRUE,
            items = list(
              type = "string",
              enum = as.list(rolesTarget),
              default = "self",
              options = list(
                enum_titles = names(t(rolesTarget))
                )
              )
            ),
          rolesGet = list(
            title = t("target_roles_get_title"),
            type =  "array",
            format = "checkbox",
            uniqueItems = TRUE,
            items = list(
              type = "string",
              enum = as.list(rolesTarget),
              default = "self",
              options = list(
                enum_titles = names(t(rolesTarget))
                )
              )
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
            title =  t("temporal_issuance_title"),
            description =  t("temporal_issuance_desc"),
            options = list(collapsed=TRUE),
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
                options = list(enum_titles = 
                  names(t(c(     
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
                        ))))
                ),
              released_at = list(
                title = t("temporal_release_title"),
                description = t("temporal_release_desc"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                #default = format(Sys.Date(),"%Y-%m-%d")
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
            options = list(collapsed = TRUE),
            properties = list(
              lng_min = list(
                title = t("spatial_bbx_lng_min"),
                type = "number",
                minimum = -180,
                maximum = 180,
                default = .get(extent,"lng1")
                ),
              lng_max = list(
                title = t("spatial_bbx_lng_max"),
                type = "number",
                minumum = -180,
                maximum = 180,
                default = .get(extent,"lng2")
                ),
              lat_min = list(
                title = t("spatial_bbx_lat_min"),
                type = "number",
                minumum = -90,
                maximum = 90,
                default = .get(extent,"lat1") 
                ),
              lat_max = list(
                title = t("spatial_bbx_lat_max"),
                type = "number",
                minumum = -90,
                maximum = 90, 
                default = .get(extent,"lat2") 
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
                  type = "string",
                  title = t("contact_function"),
                  description = t("contact_function_desc")
                  ),
                name = list(
                  title = t("contact_name"),
                  type = "string"
                  ),
                address = list(
                  title = t("contact_address"),
                  type = "string"
                  ),
                email = list(
                  title = t("contact_email"),
                  type = "string")
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
            properties =list(
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
                minItems = 1,
                uniqueItems = TRUE,
                items = list(
                  type = "object",
                  title = t("origin_source_title"),
                  required = "url",
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
                  type="string",
                  format="textarea"
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
                  title =t("additional_doc_item_url"), 
                  type = "string",
                  format = "uri"
                  )
                )
              ),
            minItems = 1,
            uniqueItems = TRUE)
          )
        ),
      integrity = list(
        propertyOrder = mxCounter("a"),
        title = t("data_integrity_title"),
        description = t("data_integrity_desc"),
        type = "object",
        options = list(collapsed = TRUE),
        properties = list(
          "di_1_1" = mxSchemaDataIntegrityQuestion("di_1_1"),
          "di_1_2" = mxSchemaDataIntegrityQuestion("di_1_2"), 
          "di_1_3" = mxSchemaDataIntegrityQuestion("di_1_3"),
          "di_1_4" = mxSchemaDataIntegrityQuestion("di_1_4"),
          "di_2_1" = mxSchemaDataIntegrityQuestion("di_2_1"),
          "di_2_2" = mxSchemaDataIntegrityQuestion("di_2_2"),
          "di_2_3" = mxSchemaDataIntegrityQuestion("di_2_3"),
          "di_2_4" = mxSchemaDataIntegrityQuestion("di_2_4"),
          "di_3_1" = mxSchemaDataIntegrityQuestion("di_3_1"),
          "di_3_2" = mxSchemaDataIntegrityQuestion("di_3_2"),
          "di_3_3" = mxSchemaDataIntegrityQuestion("di_3_3"),
          "di_3_4" = mxSchemaDataIntegrityQuestion("di_3_4"),
          "di_4_1" = mxSchemaDataIntegrityQuestion("di_4_1"),
          "di_4_2" = mxSchemaDataIntegrityQuestion("di_4_2"),
          "di_4_3" = mxSchemaDataIntegrityQuestion("di_4_3"),
          "di_4_4" = mxSchemaDataIntegrityQuestion("di_4_4")
          )
        )
      )
    )


  return(out)
}
