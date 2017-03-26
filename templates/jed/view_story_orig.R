
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
  # def
  #
  def <- view[[c("data","definition")]]

  #
  # import story
  #
  #story <- def[["story"]]

  #
  # Get view list and titles
  #
  views <- views[!sapply(views,function(x){x$type}) %in% "sm"] # don't use story map 
  viewListId <- sapply(views,function(x){return(x[["id"]])});
  viewListTitles <- sapply(views,function(x){return(x[[c("data","title",l)]])})


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
  views <- list(
    views = list(
      type = "array",
      format = "table",
      title = "Views to activate",
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

#  # 
  ## Step title in config's languages
  ##
  #stepTitle <- list(
    #title = list(
      #type = "object", 
      #format = "grid",
      #title = d("schema_story_step_title",l),
      #properties=list()
      #)
    #)

  #for( i in ll ){
    #stepTitle[[c("title","properties")]][[i]] <- list(
      #type="string",
      #title="",
      #propertyOrder=1,
      #options = list(
        #hidden = i != l
        #)
      #)
  #}


  # 
  # Step title in config's languages
  #
  stepText <- list(
    text = list(
      type = "object", 
      format = "grid",
      title = d("schema_story_step_text",l),
      properties=list()
      )
    )

  for( i in ll ){
    stepText[[c("text","properties")]][[i]] <- list(
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
  position =  list(
    type = "position",
    format = "grid",
    title = d("schema_story_map_pos",l),
    options = list(
      addButtonPos = TRUE,
      idMap = "map_main",
      textButton = d("schema_story_pos_get",l)
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


  stepTextPosition <- list(
    positionText = list(
      title = d("schema_story_text_pos",l),
      type = "string",
      enum = list("left","center","right"),
      enum_titles = list(d("left",l),d("center",l),d("right",l))
      )
    )

  schema =  list(
    title=d("schema_story_title",l),
    type="object",
    properties=list(
      author=list(
        type="string",
        title=d("schema_story_author",l)
        ),
      organisation=list(
        type="string",
        title=d("schema_story_org",l)
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
            stepText,
            stepTextPosition,
            stepMapPosition,
            views
            )
          )
        )
      )
    ) 

  return(schema)
}


