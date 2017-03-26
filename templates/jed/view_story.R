
mxSchemaViewStory <- function(view,views,language){

  conf <- mxGetDefaultConfig()

  if(noDataCheck(view)) return()

  #
  # language settings
  #
  l <- language

  # all languages
  ll <- conf[["languages"]][["list"]]

  #
  # Get view list and titles
  #
  views <- views[!sapply(views,function(x){x$type}) %in% "sm"] # don't use story map 
  viewListId <- sapply(views,function(x){return(x[["id"]])});
  viewListTitles <- sapply(views,function(x){
    t = x[[c("data","title",l)]]
    if(noDataCheck(t)){
      for(al in ll){
        if(noDataCheck(t)){
          t = x[[c("data","title",al)]]
        }
      }
    }
    if(noDataCheck(t)) t <- d("noTitle",l)
    return(t)
})


  #
  # Set view schema
  #
  view <- list(
    title="View",
    type="string",
    minLength=1,
    enum=as.list(viewListId),
    options = list(
      enum_titles = as.list(viewListTitles)
      )
    )

  #
  # Filters
  #
  filter = list(
    title="Filter",
    type="string"
    )

  #
  # Multiple associated view object
  #
  stepMapViews <- list(
    views = list(
      type = "array",
      format = "table",
      title = "Views to activate",
      options = list(
        collapsed=TRUE
        ),
      items = list(
        type = "object",
        title = "view",
        properties = list(
          view = view,
          filter = filter
          )
        )
      )
    )
  # 
  # Step title in config's languages
  #
  stepText <- list(
    html = list(
      options = list(
        collapsed=TRUE
        ),
      type = "object", 
      title = d("schema_story_step_text",l),
      properties=list()
      )
    )

  for( i in ll ){
    stepText[[c("html","properties")]][[i]] <- list(
      type="texteditor",
      title = "",
      propertyOrder=2,
      options = list(
        hidden = i != l
        )
      )
  }



  #
  # center, bearing, pitch and zoom
  #

stepMapPosition <- list(
   mapPosition =  list(
    type = "position",
    format = "grid",
    title = d("schema_story_map_pos",l),
    options = list(
      addButtonPos = TRUE,
      idMap = "map_main",
      textButton = d("schema_story_pos_get",l),
      collapsed = TRUE
    ),
    properties = list(
      z = list(
        type="number",
        minimum=0,
        maximum=22
        ),
      lat = list(
        type="number",
        minimum=-90,
        maximum=90
        ),
      lng = list(
        type="number",
        minimum=-180,
        maximum=180
        ),
      pitch = list(
        type="number",
        minimum=0,
        maximum=60
        ),
      bearing = list(
        type = "number"
        )
      )
    )    
  )

  stepSlidePositionX <- list(
      title = d("schema_story_slide_pos_x",l),
      type = "string",
      enum = list("left","center","right","default"),
      enum_titles = list(d("left",l),d("center",l),d("right",l),d("default",l))
    )

  stepSlidePositionZ <- list(
      title = d("schema_story_slide_pos_z",l),
      type = "number",
      minimum = 0,
      maximum = 10,
      default = 1
    )

  stepSlideSpeedRatio <- list(
      title = d("schema_story_slide_speed",l),
      type = "number",
      minimum = -10,
      maximum = 10,
      default = 1
    )

  stepSlideColorBg <- list(
      title = d("schema_story_slide_color_bg",l),
      type = "string",
      format = "color",
      default = "#ffffff"
    )

  stepSlideOpacityBg <- list(
      title = d("schema_story_slide_opacity_bg",l),
      type = "number",
      minimum = 0,
      maximum = 1,
      default = 0.2
    )

  stepSlideColorFg <- list(
      title = d("schema_story_slide_color_fg",l),
      type = "string",
      format = "color",
      default = "#000000"
    )

  stepSlideConfig <- list(
    config = list(
      type = "object",
      options = list(
        collapsed=TRUE
        ),
      title = d("schema_story_slide_config"),
      properties = list(
        position_z_index = stepSlidePositionZ,
        position_x_class = stepSlidePositionX,
        speed_ratio = stepSlideSpeedRatio,
        color_fg = stepSlideColorFg,
        color_bg = stepSlideColorBg,
        opacity_bg = stepSlideOpacityBg
        )
      )
    )


  stepSlides <- list(
    slides = list(
    type="array",
    title=d("schema_story_slides",l),
    items=list(
      type="object",
      options = list(
        collapsed=TRUE
        ),
      title = d("schema_story_slide",l),
      properties=c(
        stepText,
        stepSlideConfig
        )
      )
    )
    )

  schema =  list(
    title=d("schema_story_title",l),
    type="object",
    properties=list(
      author = list(
        type = "string",
        title = d("schema_story_author",l)
        ),
      meta=list(
        type="string",
        title=d("schema_story_meta",l)
        ),
      steps=list(
        type="array",
        title=d("schema_story_steps",l),
        description=d("schema_story_steps_title",l),
        items=list(
          type="object",
        options = list(
          collapsed=TRUE
          ),
          title = d("schema_story_step",l),
          properties=c(
            stepSlides,             
            stepMapViews,
            stepMapPosition
            )
          )
        )
      )
    ) 

  return(schema)
}


