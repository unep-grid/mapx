mxSchemaViewStory <- function(view,views,language){

  if(noDataCheck(view)) return()

  #
  # language settings
  #
  l <- language

  # all languages
  ll <- .get(config,c("languages","list"))

  #
  # shortcut to translate function
  #
  tt = function(id){
   d(id,lang=l,web=F,asChar=T)
  }




  #
  # Get view list and titles
  #
  views <- views[sapply(views,function(x){x$type}) %in% c("vt","rt")] # don't use story map 

  viewListId <- sapply(views,function(x){
    return(x[["id"]])
});

  viewListTitles <- sapply(views,function(x){
    
   if( "public" %in% x$target ){
      warning = "[private]"
   }else{
     warning = "[public]"
   }

    t = x[[c("data","title",l)]]
    if(noDataCheck(t)){
      for(al in ll){
        if(noDataCheck(t)){
          t = .get(x, c("data","title",al))
        }
      }
    }


    if(noDataCheck(t)) t <- tt("noTitle")
    t = paste( t , warning )
    return(t)
})

  #
  # Multiple associated view object
  #
  stepMapViews <- list(
    type = "array",
    format = "table",
    title = "Views to activate",
    options = list(
      collapsed=TRUE
      ),
    items = list(
      type = "object",
      title = "View",
      properties = list(
        view = list(
          title = "View",
          type = "string",
          minLength = 1,
          enum = as.list(viewListId),
          options = list(
            enum_titles = as.list(viewListTitles)
            )
          )
        )
      )
    )

  #
  # Map position
  #
  stepMapPosition <- list(
    type = "position",
    format = "grid",
    title = tt("schema_story_map_pos"),
    options = list(
      addButtonPos = TRUE,
      idMap = "map_main",
      textButton = tt("schema_story_pos_get"),
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

  #
  # Slides
  #


  # 
  # Text
  #
  slideText <- list(
      type = "object", 
      title = "Text",
      properties = list()
      )
    
  for( i in ll ){
    slideText[[c("properties")]][[i]] <- list(
      type ="string",
      format="medium",
      title = "",
      propertyOrder = 2,
      options = list(
        hidden = i != l
        )
      )
  }
  #
  # Slide classes 
  #
  slideClasses <- list(
    type = "array",
    format = "table",
    title = "Slide classes", 
    items = list(
      type = "object",
      title = "Classe",
      properties = list(
        name = list(
          type = "string",
          enum = c("card","image-cover","shadow","half-vertical-center","half-horizontal-center","half-right","half-left","half-top","half-bottom","cube-face")
          )
        )
      )
    )

  #
  # Slide background color
  #
  slideColorBg <- list(
    title = "Background color",
    type = "string",
    format = "color",
    default = "#ffffff"
    )

  #
  # Slide background color
  #
  slideScroll <- list(
    title = "Allow scroll",
    type = "boolean",
    format = "checkbox"
  )
  #
  # Slide background opacity
  #
  slideOpacityBg <- list(
    title = "Background opacity",
    type = "number",
    minimum = 0,
    maximum = 1,
    default = 0.2
    )

  #
  # Slide text color
  #
  slideColorText <- list(
    title = "Text color",
    type = "string",
    format = "color",
    default = "#000000"
    )

 #
  # Slide text size
  #
  slideSizeText <- list(
    title = "Text size percent",
    type = "number",
    min = 0,
    default = 100
    )


  # 
  # Slide effect
  #
  slideEffects = list(
    type = "array",
    format = "table", 
    title = "Effects", 
    items = list(
      type = "object", 
      title = "Effect", 
      properties = list(
        s = list(
          title = "Start", 
          type = "number",
          default = 0L, 
          minimum = -100L,
          maximum = 100L
          ), 
        e = list(
          title = "End",
          type = "number",
          default = 100L,
          minimum = -100L,
          maximum = 100L
          ),
        o = list(
          title = "Offset",
          type = "number",
          default = 0L,
          minimum = -100L,
          maximum = 100L
          ),
        f = list(
          title = "Factor",
          type = "number",
          default = 1
          ),
        t = list(
          type = "integer",
          title = "Type", 
          default = 0L, 
          enum = 0:7,
          options = list(
            enum_titles = c(
              "none",
              "translateX",
              "translateY",
              "translateZ",
              "rotateX",
              "rotateY",
              "rotateZ",
              "scale"
              )
            )
          )
        )
      )
    )

  #
  # All slide config
  #
  stepSlide <- list(
    type="array",
    title="Slides",
    items = list(
      type = "object",
      title = "Slide",
      properties = list(
        scroll_enable = slideScroll,
        html = slideText,
        classes = slideClasses,
        color_fg = slideColorText,
        color_bg = slideColorBg,
        opacity_bg = slideOpacityBg,
        size_text = slideSizeText,
        effects = slideEffects
        )
      )
    )

  stepConfig = list(
    type = "object",
    title = "Step",
    options = list(
      collapsed=TRUE
      ),
    properties = list(
      position = stepMapPosition,
      views = stepMapViews,
      slides = stepSlide
      )
    )



  #
  # Final schema
  #
  main = list(
    title = "Story",
    type = "object", 
    properties = list(
      steps = list(
        type = "array", 
        title = "Steps", 
        items = stepConfig
        )
      )
    )


  return(main)

}
