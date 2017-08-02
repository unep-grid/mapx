

mxSchemaSourceMeta <- function(language=NULL,rolesTarget="self",attributesNames=c(),extent=list(),title="",abstract=""){

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
    title = t("schemaTitle"),
    description = t("schemaDesc"),
    type = "object",
    required = list(),
    properties = list(
      text = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title =  t("textualTitle"),
        description = t("textualDesc"),
        options = list(collapsed = TRUE),
        properties = list(
          title = mxSchemaMultiLingualInput(
            keyTitle="textualDescTitle",
            default= list(en=title),
            dict = dict
            ),
          abstract = mxSchemaMultiLingualInput(
            keyTitle="textualDescAbstract",
            default = list(en=abstract),
            type="string",
            format="textarea",
            dict = dict
            ),
          keywords = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            options = list(collapsed = TRUE),
            title = t("textualKeywordTitle"),
            description = t("textualKeywordDesc"),
            properties = list(
               keys = list(
                title = t("textualKeywordsTitle"),
                type = "array",
                format = "table",
                minItems = 1,
                items = list(
                  type = "string",
                  title = t("textualKeywordItemTitle")
                  )
                )
              )
            ),
          attributes = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("attributesTitle"),
            description = t("attributesDesc"), 
            options = list(collapsed = TRUE),
            properties = mxSchemaAttributeInput(
                format="textarea",
                keyTitle="attributeDescTitle",
                keyCounter="attr",
                type="string",
                collapsed=TRUE,
                attributes=attributesNames,
                dict = dict
                )  
            ),
          language = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = t("langTitle"), 
            description = t("langDesc"),
            options = list(collapsed = TRUE),
            properties = list(
              codes = list(
                type = "array",
                title = t("langListTitle"),
                description = t("langListDesc"),
                format = "table",
                items = list(
                  type = "object",
                  options = list(collapsed = TRUE),
                  title = t("langItemTitle"),
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
        title = t("targetTitle"),
        description = t("targetDesc"),
        type = "object",
        options = list(collapsed = TRUE),
        properties = list(
          roles = list(
            title = t("targetRolesTitle"),
            description = t("targetRolesDesc"),
            type =  "object",
            options = list(collapsed = TRUE),
            properties = list(
              names = list(
                title = t("targetRolesListTitle"),
                type = "array",
                format = "table",
                minItems = 1,
                items = list(
                  type = "object",
                  options = list(collapsed = TRUE),
                  properties = list(
                    role = list(
                      title = t("targetRoleItemTitle"),
                      type = "string",
                      enum =  rolesTarget,
                      default = "self",
                      options = list(
                        enum_titles = names(t(rolesTarget))
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        ),
      temporal = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title = t("temporalTitle"),
        description = t("temporalDesc"),
        options = list(collapsed = TRUE),
        properties = list(
          issuance = list(
            type = "object",
            title =  t("temporalIssuanceTitle"),
            description =  t("temporalIssuanceDesc"),
            options = list(collapsed=TRUE),
            properties = list(
              periodicity = list(
                title = t("temporalPeriodicity"),
                description = t("temporalPeriodicityDesc"),
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
                  "asNeeded",
                  "irregular",
                  "notPlanned",
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
                        "asNeeded",
                        "irregular",
                        "notPlanned",
                        "unknown"
                        ))))
                ),
              released_at = list(
                title = t("temporalReleaseTitle"),
                description = t("temporalReleaseDesc"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                #default = format(Sys.Date(),"%Y-%m-%d")
                default = "0001-01-01"
                ),
              modified_at = list(
                title = t("temporalUpdateTitle"),
                description = t("temporalUpdateDesc"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
                )
              )
            ),
          range = list(
            title = t("temporalRangeTitle"),
            description = t("temporalRangeDesc"),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              is_timeless = list(
                title = t("temporalRangeTimeless"),
                type = "boolean",
                format = "checkbox"
                ),
              start_at = list(
                title = t("temporalRangeStart"),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
                ),
              end_at = list(
                title = t("temporalRangeEnd"),
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
        title = t("spatialTitle"),
        description = t("spatialDesc"),
        options = list(collapsed = TRUE),
        properties = list(
          crs = list(
            title = t("spatialSrsTitle"),
            description = t("spatialSrsDesc"),
            type = "object",
            format = "table",
            options = list(collapsed = TRUE),
            properties = list(
              code = list(
                title = t("spatialSrsCode"),
                type = "string",
                default = "EPSG:4326"
                ),
              url = list(
                title = t("spatialSrsDescUrl"),
                type = "string",
                default = "http://spatialreference.org/ref/epsg/4326/"
                )
              )
            ),
          bbox = list(
            title = t("spatialBbxTitle"),
            description = t("spatialBbxDesc"),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              lng_min = list(
                title = t("spatialBbxLngMin"),
                type = "number",
                minimum = -180,
                maximum = 180,
                default = .get(extent,"lng1")
                ),
              lng_max = list(
                title = t("spatialBbxLngMax"),
                type = "number",
                minumum = -180,
                maximum = 180,
                default = .get(extent,"lng2")
                ),
              lat_min = list(
                title = t("spatialBbxLatMin"),
                type = "number",
                minumum = -90,
                maximum = 90,
                default = .get(extent,"lat1") 
                ),
              lat_max = list(
                title = t("spatialBbxLatMax"),
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
      title = t("contactTitle"),
      description = t("contactDesc"),
      options = list(collapsed = TRUE),
      properties = list(
        contacts = list(
          title = t("contactListTitle"),
          type = "array",
          items = list(
            title = t("contactItemTitle"),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              "function" = list(
                type = "string",
                title = t("contactFunction"),
                description = t("contactFunctionDesc")
                ),
              name = list(
                title = t("contactName"),
                type = "string"
                ),
              address = list(
                title = t("contactAddress"),
                type = "string"
                ),
              email = list(
                title = t("contactEmail"),
                type = "string")
              )
            )
          )
        )
      ),
    origin = list(
      propertyOrder = mxCounter("a"),
      title = t("originTitle"),
      description = t("originDesc"),
      options = list(collapsed = TRUE),
      type = "object",
      properties = list(
        homepage = list(
          type = "object",
          title = t("originHomepageTitle"),
          description = t("originHomepageDesc"),
          options = list(collapsed = TRUE),
          properties =list(
            url = list(
              title = t("originHomepageItemTitle"),
              type = "string",
              format = "uri"
              )
            )
          ),
        `source` = list(
          type = "object",
          options = list(collapsed = TRUE),
          title = t("originSourcesTitle"),
          description = t("originSourcesDesc"),
          properties = list(
            urls = list(
              type = "array",
              title = t("originSourcesList"),
              minItems = 1,
              uniqueItems = TRUE,
              items = list(
                type = "object",
                title = t("originSourceTitle"),
                required = "url",
                options = list(collapsed = TRUE),
                properties = list(
                  is_download_link = list(
                    title = t("originSourceIsFullRequestTitle"),
                    type = "boolean",
                    format = "checkbox",
                    default = FALSE
                    ),
                  url = list(
                    title = t("originSourceUrlTitle"),
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
      title = t("licenseTitle"),
      description = t("licenseDesc"),
      options = list(
        collapsed = TRUE
        ),
      properties = list(
        licenses = list(
          type = "array",
          title = t("licenseListTitle"),
          description = t("licenseListDesc"),
          items = list(
            type = "object",
            title = t("licenseItemTitle"),
            options = list(collapsed = TRUE),
            properties = list(
              name = list(
                title = t("licenseName"),
                type = "string"
                ),
              text = list(
                title = t("licenseText"),
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
      title = t("additionalDocTitle"),
      description = t("additionalDocDesc"),
      options = list(
        collapsed = TRUE
        ),
      properties = list(
        references = list(
          type = "array",
          title = t("additionalDocItemsTitle"),
          description = t("additionalDocItemsDesc"),
          items = list(
            type = "object",
            title = t("additionalDocItemTitle"),
            options = list(collapsed = TRUE),
            properties = list(
              url = list(
                title =t("additionalDocItemUrl"), 
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
      title = t("dataIntegrityTitle"),
      description = t("dataIntegrityDesc"),
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
