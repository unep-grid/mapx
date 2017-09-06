mxSchemaViewStyle <- function(
  viewData,
  language = "fr"
  ){

  conf <- mxGetDefaultConfig()

  view <- viewData

  if(noDataCheck(view)) return()

  #
  # language settings
  #
  l <- language

  # all languages
  ll <- conf[["languages"]][["list"]]

  #
  # def
  #
  def <- view[[c("data")]]

  #
  # import style
  #
  style <- def[["style"]]

  #
  # shortcut to translate function
  #

  tt = function(id){
   d(id,lang=l,web=F,asChar=T)
  }

  #
  # retrieve default
  #
  #dataDrivenTitles <- names( tt(style$dataDrivenChoice, l, namedVector=T) )
  #dataDrivenChoice <- style$dataDrivenChoice 
  #dataDrivenEnable <- style$dataDrivenEnable 
  #dataDrivenMethod <- style$dataDrivenMethod

  #if(noDataCheck(dataDrivenMethod)) dataDrivenMethod = dataDrivenChoice[[1]]

  variableName <- def[[c("attribute","name")]]
  layerName <- def[[c("source","layerInfo","name")]]

  #
  # Get distinct available value in
  # This is already done during view creation :  view.data.attribute.table
  # NOTE: why do it here again ?
  #
  values <- mxDbGetQuery(sprintf(
      "SELECT DISTINCT(%1$s) from %2$s WHERE %1$s IS NOT NULL ORDER BY %1$s ASC "
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
    conf[["resources"]][["sprites"]],
    "sprite.json"
    )

  # stop if the path is not found
  if(!file.exists(jsonSpritePath)) stop("json path is not found")

  # fetch sprite name
  sprites <- sort(names(jsonlite::fromJSON(jsonSpritePath)))


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
        minLength= 1,
        #minimum = min(values),
        #maximum = max(values),
        default = min(values)
        )
      )

  }else{
    value <- list(
      value = list(
        title = tt("schema_value"),
        type = "string",
        enum = as.list(values),
        minLength = 1
        )
      )
  }
  # color
  color <- list(
    color = list(
      title = tt("schema_color"),
      type = "string",
      format = "color",
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
      #options = list(
      #hidden = ! spriteEnable
      #)
      )
    )

  #
  # Append everything in style
  # 
  rules <- list(
    rules = list(
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

#  #
  ## Additional property
  ##
  #prop <- list(
    #dataDrivenMethod = list(
      #title = tt("schema_method",l),
      #type = "string",
      #enum = as.list(dataDrivenChoice),
      #default = dataDrivenMethod,
      #minLength = ifelse(dataDrivenEnable,1,0),
      #options = list(
        #enum_titles = as.list(dataDrivenTitles),
        #hidden = ! dataDrivenEnable,
        #required =  dataDrivenEnable
        #)
      #)
    #)

  #
  # main properties
  #
  properties <- c(
    #prop,
    rules
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



