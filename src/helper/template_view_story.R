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


  viewListId <- sapply(views, function(v){
    return(v$id)
}) 

  viewListTitles <- sapply(views, function(v){

    title = v$`_title`;

    if(noDataCheck(title)) title = v$id;
    target = ifelse("public" %in% v$target," (public)"," (private)") 

    return( "("+v$country + ") " + title + target)
}) 

  mxCounter(reset=T)

  #
  # Multiple associated view object
  #
  stepMapViews <- list(
    type = "array",
    format = "table",
    title = "Views to activate",
    options = list(
      collapsed = TRUE,
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE
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
            enum_titles = as.list(viewListTitles),
            selectize_options = list(
              dropdownParent = "body"
              )
            )
          )
        )
      )
    )

  #
  # Map position
  #
  stepMapPosition <- list(
    type = "object",
    format = "position",
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
        ),
      n = list(
        type = "number"
        ),
      s = list(
        type = "number"
        ),
      e = list(
        type = "number"
        ),
      w = list(
        type = "number"
        )
      )
    )

  #
  # Slides
  #


  # 
  # Text / html
  #

  slideText <- mxSchemaMultiLingualInput(
    format = "textarea",
    options = list(
      #editor = "ace",
      #language ="html",
      #addLiveEditBtn = TRUE,
      #selectorLiveEdit = ".mx-story"
      ),
    language =  l,
    languagesRequired = c("en"),
    languagesHidden = ll[!ll%in%l],
    languagesReadOnly = ll[!ll%in%l],
    keyTitle = d("content",web=F),
    dict = config$dict
    )

  #
  # Slide classes 
  #
  slideClasses <- list(
    type = "array",
    format = "table",
    title = "Slide classes", 
    options =  list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE
      ),
    items = list(
      type = "object",
      title = "Classe",
      properties = list(
        name = list(
          type = "string",
          enum = c(
            "card",
            "image-cover",
            "shadow",
            "text-center",
            "text-left",
            "text-right",
            "titles-center",
            "half-vertical-center",
            "half-horizontal-center",
            "half-right",
            "half-left",
            "half-top",
            "half-bottom",
            "cube-face"
            )
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
    title = "Allow scrolling",
    description = "If the slide content goes outside the container, a scrollbar will be displayed.",
    type = "boolean",
    format = "checkbox",
    defaut = TRUE
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
    title = "Base text size in pixels",
    type = "number",
    min = 0,
    default = 40
    )

  # 
  # Slide effect
  #
  slideEffects = list(
    type = "array",
    format = "confirmDelete",
    title = "Effects", 
    options = list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE,
      collapsed = TRUE
      ),
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

  slideName = list(
    type ="string",
    title ="Slide name"
    )

  #
  # All slide config
  #
  stepSlide <- list(
    type="array",
    format = "confirmDelete",
    options = list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE,
      collapsed = TRUE
      ),
    title="Slides",
    items = list(
      type = "object",
      title = "Slide",
      headerTemplate = "{{ i1 }}. {{ self.name }} ",
      properties = list(
        color_fg = slideColorText,
        color_bg = slideColorBg,
        opacity_bg = slideOpacityBg,
        size_text = slideSizeText,
        effects = slideEffects,
        scroll_enable = slideScroll,
        classes = slideClasses,
        html = slideText,
        name = slideName
        )
      ),
    options = list(
      collapsed = TRUE
      )          
    )



  #
  # Map animation
  #
  animDuration <- list(
    title = "Animation duration [ms]",
     description = "Change the total animation duration",
    type = "number",
    min = 0,
    default = 1000
    )
  
  animPathMethod <- list(
    title = "Trajectory method",
     description = "Set the traveling method of the camera during the animation",
    type = "string",
    enum = list("flyTo","easeTo","jumpTo","fitBounds"),
    default = "jumpTo",
    options = list(
        enum_titles = list(
          "Fly to ( follow a flight path ) ",
          "Ease to ( follow a linear path ) ",
          "Jump to ( move directly to the position )",
          "Fit bounds ( Fit exactly the saved extend )"
          )
      )
    )

  animFunction = list(
    title = "Animation function",
     description = "Change the default animation function. Ease the start and/or end of the animation.",
    type =  "string",
    enum =  list("easeIn","easeOut","easeInOut")
    )

  animFunctionPower = list(
     title = "Animation function exponent",
     description = "Change the default function exponent. This will amplify or reduce the rate of the easing.",
     type =  "number",
     min = 0,
     max = 10,
     default =1
    )

  stepMapAnimation <- list(
    type = "object",
    title = "Map animation",
    properties = list(
      duration = animDuration,
      method = animPathMethod,
      easing = animFunction,
      easing_power = animFunctionPower
      ),
    options = list(
      collapsed = TRUE
      )
    )


  autoplayTimeout <- list(
    title = "timeout [ms]",
    description = "Waiting time before going to the next step.",
    type = "number",
    min = 0,
    default = 1000
    )

  autoplayTransition <- list(
    title = "transition [ms]",
    description = "Duration of the transition between steps.",
    type = "number",
    min = 0,
    default = 1000
    )

  autoplayAnimFunction = list(
    title = "Animation function",
    description = "Change the default animation function. Ease the start and/or end of the animation.",
    type =  "string",
    enum =  list("easeIn","easeOut","easeInOut")
    )

  autoplayAnimFunctionPower = list(
    title = "Animation function exponent",
    description = "Change the default function exponent. This will amplify or reduce the rate of the easing.",
    type =  "number",
    min = 0,
    max = 10,
    default =1
    )

  stepAutoplay <- list(
    type = "object",
    title = "Autoplay settings",
    properties = list(
      timeout = autoplayTimeout,
      duration = autoplayTransition,
      easing = autoplayAnimFunction,
      easing_power = autoplayAnimFunctionPower
      ),
    options = list(
      collapsed = TRUE
      )
    )

  stepName = list(
    type ="string",
    title ="Step name"
    )

  stepConfig = list(
    type = "object",
    title = "Step",
    headerTemplate = "{{ i1 }}. {{ self.name }}",
    options = list(
      collapsed = TRUE
      ),
    properties = list(
      slides = stepSlide,
      views = stepMapViews,
      position = stepMapPosition,
      animation = stepMapAnimation,
      autoplay = stepAutoplay,
      name = stepName
      )
    )


  #
  # Settings page resolution
  #
  settingsPageClass = list(
    type = "string",
    title = "Screen resolution",
    minLength = 1,
    description = "Base resolution of the page during a story map. It will automatically scale to fit the screen and preserve content formating",
    enum = list(
      "mx-story-screen-240p",
      "mx-story-screen-360p",
      "mx-story-screen-480p",
      "mx-story-screen-720p",
      "mx-story-screen-1080p",
      "mx-story-screen-1440p"
      ),
    options = list(
      enum_titles = list(
        "240p (16:9)",
        "360p (16:9)",
        "480p (16:9)",
        "720p (16:9)",
        "1080p (16:9)",
        "1440p (16:9)"
        )
      ),
    default = "mx-story-screen-720p"
    )

  #
  # Final schema
  #
  main = list(
    title = "Story",
    type = "object", 
    properties = list(
      settings = list(
        type = "object",
        title = "Settings",
        options = list(
          collapsed = TRUE
          ),
        properties = list(
          class_wrapper = settingsPageClass
          )
        ),
      steps = list(
        type = "array", 
        options = list(
          disable_array_delete_all_rows = TRUE,
          disable_array_delete_last_row = TRUE,
          collapsed = TRUE
          ),
        format = "confirmDelete",
        title = "Steps", 
        items = stepConfig
        )
      )
    )


  return(main)

}
