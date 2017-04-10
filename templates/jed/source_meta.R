

mxSchemaSourceMeta <- function(language=NULL,rolesTarget="self",attributesNames=c(),extent=list(),title="",abstract=""){

  #
  # 
  # PArtial use of codes from from  https://geo-ide.noaa.gov/wiki/index.php?title=ISO_19115_and_19115-2_CodeList_Dictionaries#MD_GeometricObjectTypeCode


  #
  # Key convention naming
  # boolean : prefix  "is_"
  # date : suffix "_at"
  # 
  #

  dict =  .get(config,c("dictionaries","schemaMetadata"))

  #
  # Counter to keep property in the same order as descibed here 
  #
  mxCounter =  function(id,reset=F){
    if(!exists("mxCounters") || reset ){
      mxCounters <<- list()
    }
    if(!reset){
      if(noDataCheck(mxCounters[[id]])){
        mxCounters[[id]] <<- 1
      }else{
        mxCounters[[id]] <<- mxCounters[[id]] + 1
      }
      mxCounters[[id]]
    }
  }

  mxCounter(reset=T)


  dataIntegrityQuestion = function(keyTitle){ 
    list(
      title = d(keyTitle,dict=dict,lang=language),
      description = d(paste0(keyTitle,"_desc"),dict=dict,lang=language),
      type = "string",
      minlength = 1,
      default = "0",
      enum = c("0",
        "1",
        "2",
        "3"),
      options = list(
        enum_titles = names(d(
            c(
              "dontKnow",
              "no",
              "partial",
              "yes"),
            dict = dict,
            lang = language
            ))
        )
      )
  }

  #
  # Output an object with everly language code as key and text or text area editor
  #
  multiLingualInput = function(format=NULL,default=list(),keyTitle="",titlePrefix="",keyCounter="b",type="string",collapsed=TRUE,languages=unlist(config[["languages"]])){

    if(nchar(titlePrefix)>0){
     titlePrefix = paste(toupper(titlePrefix),":")
    }

    prop = lapply(languages,function(x){
      list(
        title = paste(d(keyTitle,lang=x,dict=dict)," ( ",d(x,lang=language), " )"),
        type = type,
        format = format,
        minLength = ifelse(x=="en",1,0),
        default = .get(default,x)
        )
      })
    names(prop) <- languages
    list(
      propertyOrder = mxCounter(keyCounter),
      title = paste(titlePrefix,d(keyTitle,lang=language,dict=dict)),
      type = "object",
      options = list(collapsed = collapsed),
      properties = prop
      )
  }

  #
  # Attributes constructor output the attribute editor
  #
  
  attributeInput = function(
    format=NULL,
    keyTitle="",
    keyCounter="attr",
    type="string",
    collapsed=TRUE,
    attributes=attributesNames
    ){

    prop = lapply(attributes,function(x){
         multiLingualInput(
          keyTitle = keyTitle,
          titlePrefix = x,
          keyCounter = keyCounter,
          type=type,
          format=format,
          default = list('en'='-')
          )
    })
    
    names(prop) <- attributes
    return(prop)
  }

  #
  # Final object
  #
  out = list(
    title = d("schemaTitle",lang=language,dict=dict),
    description = d("schemaDesc",lang=language,dict=dict),
    type = "object",
    required = list(),
    properties = list(
      text = list(
        propertyOrder = mxCounter("a"),
        type = "object",
        title =  d("textualTitle",lang=language,dict=dict),
        description = d("textualDesc",lang=language,dict=dict),
        options = list(collapsed = TRUE),
        properties = list(
          title = multiLingualInput(
            keyTitle="textualDescTitle",
            default= list(en=title)
            ),
          abstract = multiLingualInput(
            keyTitle="textualDescAbstract",
            default = list(en=abstract),
            type="string",format="textarea"
            ),
          keywords = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            options = list(collapsed = TRUE),
            title = d("textualKeywordTitle",lang=language,dict=dict),
            description = d("textualKeywordDesc",lang=language,dict=dict),
            properties = list(
               keys = list(
                title = d("textualKeywordsTitle",lang=language,dict=dict),
                type = "array",
                format = "table",
                minItems = 1,
                items = list(
                  type = "string",
                  title = d("textualKeywordItemTitle",lang=language,dict=dict)
                  )
                )
              )
            ),
          attributes = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = d("attributesTitle",lang=language,dict=dict),
            description = d("attributesDesc",lang=language,dict=dict), 
            options = list(collapsed = TRUE),
            properties = attributeInput(
                format="textarea",
                keyTitle="attributeDescTitle",
                keyCounter="attr",
                type="string",
                collapsed=TRUE
                )  
            ),
          language = list(
            propertyOrder = mxCounter("b"),
            type = "object",
            title = d("langTitle",lang=language,dict=dict), 
            description = d("langDesc",lang=language,dict=dict),
            options = list(collapsed = TRUE),
            properties = list(
              codes = list(
                type = "array",
                title = d("langListTitle",lang=language,dict=dict),
                description = d("langListDesc",lang=language,dict=dict),
                format = "table",
                items = list(
                  type = "object",
                  options = list(collapsed = TRUE),
                  title = d("langItemTitle",lang=language,dict=dict),
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
        title = d("targetTitle",lang=language,dict=dict),
        description = d("targetDesc",lang=language,dict=dict),
        type = "object",
        options = list(collapsed = TRUE),
        properties = list(
          roles = list(
            title = d("targetRolesTitle",lang=language,dict=dict),
            description = d("targetRolesDesc",lang=language,dict=dict),
            type =  "object",
            options = list(collapsed = TRUE),
            properties = list(
              names = list(
                title = d("targetRolesListTitle",lang=language,dict=dict),
                type = "array",
                format = "table",
                minItems = 1,
                items = list(
                  type = "object",
                  options = list(collapsed = TRUE),
                  properties = list(
                    role = list(
                      title = d("targetRoleItemTitle",lang=language,dict=dict),
                      type = "string",
                      enum =  rolesTarget,
                      default = "self",
                      options = list(
                        enum_titles = names(d(rolesTarget,language))
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
        title = d("temporalTitle",lang=language,dict=dict),
        description = d("temporalDesc",lang=language,dict=dict),
        options = list(collapsed = TRUE),
        properties = list(
          issuance = list(
            type = "object",
            title =  d("temporalIssuanceTitle",lang=language,dict=dict),
            description =  d("temporalIssuanceDesc",lang=language,dict=dict),
            options = list(collapsed=TRUE),
            properties = list(
              periodicity = list(
                title = d("temporalPeriodicity",lang=language,dict=dict),
                description = d("temporalPeriodicityDesc",lang=language,dict=dict),
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
                  names(d(c(     
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
                        ),lang=language,dict=dict)))
                ),
              released_at = list(
                title = d("temporalReleaseTitle",lang=language,dict=dict),
                description = d("temporalReleaseDesc",lang=language,dict=dict),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                #default = format(Sys.Date(),"%Y-%m-%d")
                default = "0001-01-01"
                ),
              modified_at = list(
                title = d("temporalUpdateTitle",lang=language,dict=dict),
                description = d("temporalUpdateDesc",lang=language,dict=dict),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
                )
              )
            ),
          range = list(
            title = d("temporalRangeTitle",lang=language,dict=dict),
            description = d("temporalRangeDesc",lang=language,dict=dict),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              is_timeless = list(
                title = d("temporalRangeTimeless",lang=language,dict=dict),
                type = "boolean",
                format = "checkbox"
                ),
              start_at = list(
                title = d("temporalRangeStart",lang=language,dict=dict),
                type = "string",
                format = "date",
                pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                default = "0001-01-01"
                ),
              end_at = list(
                title = d("temporalRangeEnd",lang=language,dict=dict),
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
        title = d("spatialTitle",lang=language,dict=dict),
        description = d("spatialDesc",lang=language,dict=dict),
        options = list(collapsed = TRUE),
        properties = list(
          crs = list(
            title = d("spatialSrsTitle",lang=language,dict=dict),
            description = d("spatialSrsDesc",lang=language,dict=dict),
            type = "object",
            format = "table",
            options = list(collapsed = TRUE),
            properties = list(
              code = list(
                title = d("spatialSrsCode",lang=language,dict=dict),
                type = "string",
                default = "EPSG:4326"
                ),
              url = list(
                title = d("spatialSrsDescUrl",lang=language,dict=dict),
                type = "string",
                default = "http://spatialreference.org/ref/epsg/4326/"
                )
              )
            ),
          bbox = list(
            title = d("spatialBbxTitle",lang=language,dict=dict),
            description = d("spatialBbxDesc",lang=language,dict=dict),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              lng_min = list(
                title = d("spatialBbxLngMin",lang=language,dict=dict),
                type = "number",
                minimum = -180,
                maximum = 180,
                default = .get(extent,"lng1")
                ),
              lng_max = list(
                title = d("spatialBbxLngMax",lang=language,dict=dict),
                type = "number",
                minumum = -180,
                maximum = 180,
                default = .get(extent,"lng2")
                ),
              lat_min = list(
                title = d("spatialBbxLatMin",lang=language,dict=dict),
                type = "number",
                minumum = -90,
                maximum = 90,
                default = .get(extent,"lat1") 
                ),
              lat_max = list(
                title = d("spatialBbxLatMax",lang=language,dict=dict),
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
      title = d("contactTitle",lang=language,dict=dict),
      description = d("contactDesc",lang=language,dict=dict),
      options = list(collapsed = TRUE),
      properties = list(
        contacts = list(
          title = d("contactListTitle",lang=language,dict=dict),
          type = "array",
          items = list(
            title = d("contactItemTitle",lang=language,dict=dict),
            type = "object",
            options = list(collapsed = TRUE),
            properties = list(
              "function" = list(
                type = "string",
                title = d("contactFunction",lang=language,dict=dict),
                description = d("contactFunctionDesc",lang=language,dict=dict)
                ),
              name = list(
                title = d("contactName",lang=language,dict=dict),
                type = "string"
                ),
              address = list(
                title = d("contactAddress",lang=language,dict=dict),
                type = "string"
                ),
              email = list(
                title = d("contactEmail",lang=language,dict=dict),
                type = "string")
              )
            )
          )
        )
      ),
    origin = list(
      propertyOrder = mxCounter("a"),
      title = d("originTitle",lang=language,dict=dict),
      description = d("originDesc",lang=language,dict=dict),
      options = list(collapsed = TRUE),
      type = "object",
      properties = list(
        homepage = list(
          type = "object",
          title = d("originHomepageTitle",lang=language,dict=dict),
          description = d("originHomepageDesc",lang=language,dict=dict),
          options = list(collapsed = TRUE),
          properties =list(
            url = list(
              title = d("originHomepageItemTitle",lang=language,dict=dict),
              type = "string",
              format = "uri"
              )
            )
          ),
        `source` = list(
          type = "object",
          options = list(collapsed = TRUE),
          title = d("originSourcesTitle",lang=language,dict=dict),
          description = d("originSourcesDesc",lang=language,dict=dict),
          properties = list(
            urls = list(
              type = "array",
              title = d("originSourcesList",lang=language,dict=dict),
              minItems = 1,
              uniqueItems = TRUE,
              items = list(
                type = "object",
                title = d("originSourceTitle",lang=language,dict=dict),
                required = "url",
                options = list(collapsed = TRUE),
                properties = list(
                  is_download_link = list(
                    title = d("originSourceIsFullRequestTitle",lang=language,dict=dict),
                    type = "boolean",
                    format = "checkbox",
                    default = FALSE
                    ),
                  url = list(
                    title = d("originSourceUrlTitle",lang=language,dict=dict),
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
      title = d("licenseTitle",lang=language,dict=dict),
      description = d("licenseDesc",lang=language,dict=dict),
      options = list(
        collapsed = TRUE
        ),
      properties = list(
        licenses = list(
          type = "array",
          title = d("licenseListTitle",lang=language,dict=dict),
          description = d("licenseListDesc",lang=language,dict=dict),
          items = list(
            type = "object",
            title = d("licenseItemTitle",lang=language,dict=dict),
            options = list(collapsed = TRUE),
            properties = list(
              name = list(
                title = d("licenseName",lang=language,dict=dict),
                type = "string"
                ),
              text = list(
                title = d("licenseText",lang=language,dict=dict),
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
      title = d("additionalDocTitle",lang=language,dict=dict),
      description = d("additionalDocDesc",lang=language,dict=dict),
      options = list(
        collapsed = TRUE
        ),
      properties = list(
        references = list(
          type = "array",
          title = d("additionalDocItemsTitle",lang=language,dict=dict),
          description = d("additionalDocItemsDesc",lang=language,dict=dict),
          items = list(
            type = "object",
            title = d("additionalDocItemTitle",lang=language,dict=dict),
            options = list(collapsed = TRUE),
            properties = list(
              url = list(
                title =d("additionalDocItemUrl",lang=language,dict=dict), 
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
      title = d("dataIntegrityTitle",lang=language,dict=dict),
      description = d("dataIntegrityDesc",lang=language,dict=dict),
      type = "object",
      options = list(collapsed = TRUE),
      properties = list(
        "di_1_1" = dataIntegrityQuestion("di_1_1"),
        "di_1_2" = dataIntegrityQuestion("di_1_2"), 
        "di_1_3" = dataIntegrityQuestion("di_1_3"),
        "di_1_4" = dataIntegrityQuestion("di_1_4"),
        "di_2_1" = dataIntegrityQuestion("di_2_1"),
        "di_2_2" = dataIntegrityQuestion("di_2_2"),
        "di_2_3" = dataIntegrityQuestion("di_2_3"),
        "di_2_4" = dataIntegrityQuestion("di_2_4"),
        "di_3_1" = dataIntegrityQuestion("di_3_1"),
        "di_3_2" = dataIntegrityQuestion("di_3_2"),
        "di_3_3" = dataIntegrityQuestion("di_3_3"),
        "di_3_4" = dataIntegrityQuestion("di_3_4"),
        "di_4_1" = dataIntegrityQuestion("di_4_1"),
        "di_4_2" = dataIntegrityQuestion("di_4_2"),
        "di_4_3" = dataIntegrityQuestion("di_4_3"),
        "di_4_4" = dataIntegrityQuestion("di_4_4")
        )
      )
    )
  )

  #fOut = tempfile()
  #write(toJSON(out),fOut)
  #mxDebugMsg(fOut)


  return(out)
}
