mxSchemaViewStyle <- function(
  viewData,
  language = "fr"
  ){

  conf <- mxGetDefaultConfig()

  view <- viewData
  jsonPaint <- .get(conf,c("templates","text","custom_paint"))
  jsonPaintExample <- .get(conf,c("templates","text","custom_paint_example"))

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
  ll <- .get(conf,c("languages","list"))

  #
  # data
  #
  data <- .get(view,c("data"))

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
  
  #
  # Get distinct available value in
  # This is already done during view creation :  view.data.attribute.table
  # NOTE: why do it here again ?
  #
  values <- mxDbGetQuery(sprintf(
      "SELECT DISTINCT(\"%1$s\") from %2$s WHERE \"%1$s\" IS NOT NULL ORDER BY \"%1$s\" ASC "
      ,variableName
      ,layerName
      )
    )[,variableName[[1]]]

  #
  # If this not numeric, add "all" keyword for global styling
  #
  isNumeric <- is.numeric(values)
  if(!isNumeric){
    values <- c("all",values)
  }

  #
  # sprite settings
  #
  jsonSpritePath <- file.path(
    .get(conf,c("resources","sprites")),
    "sprite.json"
    )

  # stop if the path is not found
  if(!file.exists(jsonSpritePath)) stop("json path is not found")

  # fetch sprite name
  sprites <- sort(names(jsonlite::fromJSON(jsonSpritePath)))

  #
  # Legend title
  #
  titleLegend = list(
    titleLegend = mxSchemaMultiLingualInput(
      language = l,
      keyTitle="style_title_legend",
      default = list(en="Legend"),
      type="string",
      propertyOrder = 5
      )
    )



  #
  # style property
  #

  # labels
  labels <- list()

  for(i in ll){
    r <- list(
      list(
        title = tt("schema_label"),
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
  if(isNumeric){

    value <- list(
      value = list(
        title = tt("schema_value"),
        type = "number",
        minLength = 0
        )
      )

  }else{
    value <- list(
      value = list(
        title = tt("schema_value"),
        type = "string",
        enum = as.list(values),
        minLength = 0
        )
      )
  }
  # color
  color <- list(
    color = list(
      title = tt("schema_color"),
      type = "string",
      format = "color-picker",
      default = "#f1f3d7"
      )
    )

  # opacity
  opacity <-  list(
    opacity = list(
      title = tt("schema_opacity"),
      type = "number",
      enum = c(0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1),
      default = 0.3
      )
    )

  # size
  size <- list(
    size = list(
      title = tt("schema_size"),
      type = "number",
      default = 1
      )
    )

  # sprite
  sprite <-  list(
    sprite = list(
      title = tt("schema_sprite"),
      type = "string",
      enum = c("none",sprites)
      )
    )

  #
  #  set rules list
  # 
  rules <- list(
    rules = list(
      propertyOrder = 1,
      type = "array",
      format = "table",
      title = tt("schema_rules"),
      items = list(
        type = "object",
        title = tt("schema_rule"),
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
  # Reverse layer order
  #

  reverseLayer <- list(
    reverseLayer = list(
       propertyOrder = 2,
       title = tt("style_reverse_order"),
       description = tt("style_reverse_order_desc"),
       type = "boolean",
       format = "checkbox"
      )
    )
  #
  #  set rules list
  # 

  nullsValue <- list(
    value = list(
      title = tt("schema_value"),
      type = "string",
      minLength = 0
      )
    )

  nulls <- list(
    nulls = list(
      propertyOrder = 3,
      type = "array",
      format = "table",
      title = tt("schema_nulls"),
      options = list(
        disable_array_add = TRUE,
        disable_array_delete = TRUE,
        collapsed = TRUE
        ),
      items = list(
        type = "object",
        title = tt("schema_nulls"),
        properties = c(
          nullsValue,
          labels,
          color,
          opacity,
          size,
          sprite
          )
        ),
        default = list(list(value=NULL,labels=list("en"="NO DATA"),color="#000",opacity=1,size=1,sprite=""))
      )
    )


  #
  # hide nulls
  #

  hideNulls <- list(
    hideNulls = list(
       propertyOrder = 4,
       title = tt("style_hide_nulls"),
       description = tt("style_hide_nulls_desc"),
       type = "boolean",
       format = "checkbox"
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
      propertyOrder = 6,
      title = "Custom style",
      options = list(
        collapsed = TRUE
        ),
      properties = c(
        json = list(
          list(
            title = "Custom style",
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
  # main properties
  #
  properties <- c(
    rules,
    nulls,
    reverseLayer,
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



