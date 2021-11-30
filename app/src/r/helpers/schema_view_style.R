mxSchemaViewStyle <- function(
  viewData,
  language = "fr"
  ){

  conf <- mxGetDefaultConfig()

  view <- viewData
  jsonPaint <- .get(conf,c("templates","text","custom_paint"))
  jsonPaintExample <- .get(conf,c("templates","text","custom_paint_example"))
  geomType <- .get(viewData,c("data","geometry","type"))
  isPoint <- geomType == "point"

  if(noDataCheck(view)) return()

  #
  # Keep track of property order
  #
  mxCounter(reset=T)

  #
  # language settings
  #
  l <- language

  # all languages
  ll <- .get(conf,c("languages","codes"))

  #
  # data
  #
  data <- .get(view,c("data"))

  #
  # id
  #
  idView <- .get(view,c("id"))

  #
  # import style
  #
  style <- .get(data,c("style"))

  #
  # shortcut to translate function
  #

  tt = function(id){
    d(id,lang=l,web=F,asChar=T)
  }

  #
  # retrieve default
  #

  variableName <- .get(data,c("attribute","name"))
  variableNames <- .get(data,c("attribute","names"))
  layerName <- .get(data,c("source","layerInfo","name"))
  srcSummary <- mxApiGetSourceSummary(
    idSource = layerName,
    idAttr = variableName
  )

  isContinuous <- identical(
    'continuous',
    .get(srcSummary,
    c(
      'attribute_stat',
      'type'
      )
    )
  )

  if(isContinuous){
    values <- NULL
  }else{
    table <- .get(srcSummary,c('attribute_stat','table'))
    values <- c('all',sapply(table,`[[`,c('value')))
  }

  #
  # sprite settings
  #
  jsonSpritePath <- file.path("src/glyphs/dist/sprites/sprite.json")
  
  # stop if the path is not found
  if(!file.exists(jsonSpritePath)) stop("json path is not found")

  # fetch sprite name
  sprites <- sort(names(jsonlite::fromJSON(jsonSpritePath)))
  #
  # Points : maki-
  # Polygon : t_ & geol_
  #
  spritesPrefix <-  .get(config, c('sprites_prefix'))
  sprites <- sprites[grepl(spritesPrefix[[geomType]],sprites)]



  #
  # style property
  #

  # labels
  labels <- list()

  for(i in ll){
    r <- list(
      list(
        title = tt("schema_style_label"),
        type = "string",
        options = list(
          hidden = i != l
          )
        )
      )
    names(r)<- sprintf("label_%s",i)
    labels <- c(labels,r)
  }

  # value
  if(isContinuous){
    min <- .get(srcSummary,
      c(
        'attribute_stat',
        'min'
      )
    )
    
    max <- .get(srcSummary,
      c(
        'attribute_stat',
        'max'
      )
    )

    value <- list(
      value = list(
        title = tt("schema_style_value_from"),
        type = "number",
        minLength = 0
        # Uncomment to show error message if out of range
        # minimum = min,
        # maximum =  max
      ),
      value_to = list(
        title = tt("schema_style_value_to"),
        type = "number_na",
        default = NA
        # Uncomment to show error message if out of range
        # minimum = min,
        # maximum =  max
      )
    )

  }else{
    value <- list(
      value = list(
        title = tt("schema_style_value"),
        type = "string",
        enum = as.list(values),
        minLength = 0
        )
      )
  }
  # color
  color <- list(
    color = list(
      title = tt("schema_style_color"),
      type = "string",
      format = "color-picker",
      default = "#f1f3d7"
      )
    )

  # opacity
  opacity <-  list(
    opacity = list(
      title = tt("schema_style_opacity"),
      type = "number",
      enum = c(0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1),
      default = 0.7
      )
    )

  # size
  size <- list(
    size = list(
      title = tt("schema_style_size"),
      type = "number",
      default = ifelse(isPoint,7,1)
      )
    )

  # sprite
  sprite <-  list(
    sprite = list(
      title = tt("schema_style_sprite"),
      type = "string",
      enum = c("none",sprites)
      )
    )


  #
  #  set rules list
  # 

  nullsValue <- list(
    value = list(
      title = tt("schema_style_value"),
      type = "string",
      minLength = 0
      )
    )

  nulls <- list(
    nulls = list(
      propertyOrder = 1,
      type = "array",
      format = "table",
      title = tt("schema_style_nulls"),
      options = list(
        disable_array_add = TRUE,
        disable_array_delete = TRUE,
        collapsed = TRUE
        ),
      items = list(
        type = "object",
        title = tt("schema_style_nulls"),
        properties = c(
          nullsValue,
          labels,
          color,
          opacity,
          size,
          sprite
        )
        ),
      default = list(
        list(
          value = NULL,
          label_en = 'No data',
          color = "#A9A9A9",
          opacity = 0.7,
          size = ifelse(isPoint,7,1),
          sprite = ""
        )
      )
    )
  )


  #
  # hide nulls
  #

  hideNulls <- list(
    hideNulls = list(
      propertyOrder = 2,
      title = tt("schema_style_hide_nulls"),
      description = tt("schema_style_hide_nulls_desc"),
      type = "boolean",
      format = "checkbox",
      default  = TRUE
      )
    )




  #
  #  set rules list
  # 
  rules <- list(
    rules = list(
      propertyOrder = 3,
      type = "array",
      format = "tableSourceAutoStyle",
      title = tt("schema_style_rules"),
      items = list(
        type = "object",
        title = tt("schema_style_rule"),
        options = list(
          idView = idView
          ),
        properties = c(
          value,
          labels,
          color,
          opacity,
          size,
          sprite
          )
        )
      )
    )


  #
  # Numeric : Include next value in class 
  # >a  to <=b -> if checked
  # or
  # >=a to < b
  includeUpperBoundInInterval <- list(
    includeUpperBoundInInterval = list(
      propertyOrder = 4,
      title = tt("schema_style_include_upper_bound"),
      description = tt("schema_style_include_upper_bound_desc"),
      type = "boolean",
      format ="checkbox",
      default = TRUE
      )
    )

  ##
  # NOTE: remove items from dictionnary
  ## Exclude min / max as absolute bounds
  ## ( retrieved from source stat )
  #excludeMinMax <- list(
    #excludeMinMax = list(
      #propertyOrder = 4,
      #title = tt("schema_style_exclude_min_max"),
      #description = tt("schema_style_exclude_min_max_desc"),
      #type = "boolean",
      #format ="checkbox",
      #default = FALSE
      #)
    #)


  #
  # Reverse layer order
  #
  reverseLayer <- list(
    reverseLayer = list(
      propertyOrder = 5,
      title = tt("schema_style_reverse_order"),
      description = tt("schema_style_reverse_order_desc"),
      type = "boolean",
      format = "checkbox"
      )
    )
  
  showSymbolLabel <- NULL

  if(isPoint){
    showSymbolLabel <- list(
      showSymbolLabel = list(
        propertyOrder = 6,
        title = tt("schema_style_show_symbol_label"),
        description = tt("schema_style_show_symbol_label_desc"),
        type = "boolean",
        format = "checkbox"
      )
    )
  }


  #
  # Zoom based changes
  #
  sizeFactorZoomMax <- list(
    sizeFactorZoomMax = list(
      title = tt("schema_style_size_zoom_max"),
      description = tt("schema_style_size_zoom_max_desc"),
      type = "number",
      default = 0
      )
    )

  sizeFactorZoomMin <- list(
    sizeFactorZoomMin = list(
      title = tt("schema_style_size_zoom_min"),
      description = tt("schema_style_size_zoom_min_desc"),
      type = "number",
      default = 0
      )
    )

  sizeFactorZoomExponent <- list(
    sizeFactorZoomExponent = list(
      title = tt("schema_style_size_zoom_exponent"),
      description = tt("schema_style_size_zoom_exponent_desc"),
      type = "number",
      default = 1
      )
    )

  zoomMin <- list(
    zoomMin = list(
      title = tt("schema_style_zoom_min"),
      description = tt("schema_style_zoom_min_desc"),
      type = "number",
      default = 0
      )
    )

  zoomMax <- list(
    zoomMax = list(
      title = tt("schema_style_zoom_max"),
      description = tt("schema_style_zoom_max_desc"),
      type = "number",
      default = 22
      )
    )


  zoomConfig = list(
    zoomConfig = list (
      #type = "object",
      propertyOrder = 7,
      title = tt("schema_style_config_zoom"),
      options = list(
        collapsed = TRUE
        ),
      properties = c(
        zoomMin,
        zoomMax,
        sizeFactorZoomMax,
        sizeFactorZoomMin,
        sizeFactorZoomExponent
        )
      )
    )


  #
  # set paint
  #

  htmlHelp = as.character(
    tags$div(
      tags$p(
        sprintf("
          This editor can set and overwrite rules values.
          Rules are still used for legend.
          Current secondary variables are : zoom;  %1$s
          ",
          paste(variableNames,collapse="; ")
          )
        ),
      mxFold(content=tags$code(jsonPaintExample),labelText="Example")
      )
    )

  custom = list(
    custom = list (
      type = "object",
      propertyOrder = 8,
      title = tt("custom_style"),
      options = list(
        collapsed = TRUE
        ),
      properties = c(
        json = list(
          list(
            title = tt("custom_style_edit"),
            options = list(
              language = "javascript",
              editor = "ace",
              htmlHelp = htmlHelp
              ),
            type = "string",
            format = "textarea",
            default = jsonPaint
            )
          )
        )
      )
    )

  #
  # Legend title
  #
  titleLegend = list(
    titleLegend = mxSchemaMultiLingualInput(
      language = l,
      keyTitle="schema_style_title_legend",
      default = list(en="Legend"),
      type="string",
      propertyOrder = 9
      )
    )

  #
  # main properties
  #
  properties <- c(
    nulls,
    rules,
    if(isPoint) zoomConfig,
    if(isContinuous) includeUpperBoundInInterval,
    #if(isContinuous) excludeMinMax,
    reverseLayer,
    showSymbolLabel,
    hideNulls,
    titleLegend,
    custom
  )
  #
  # schema skeleton
  #
  schema <- list(
    title = tt("view"),
    type = "object",
    properties = properties
    )

  return(schema)
}



