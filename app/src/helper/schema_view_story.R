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

  viewsProjNames <- paste(d('view_project_short',language),names(views[[1]]))
  viewsExtNames <- paste(d('view_external_short',language),names(views[[2]]))
  viewListTitles <- unlist(c(viewsProjNames,viewsExtNames))
  viewListId <- as.list(c(views[[1]],views[[2]]))
  names(viewListId) <- NULL
  viewListId <- unlist(viewListId)


  mxCounter(reset=T)

  #
  # Multiple associated view object
  #
  stepMapViews <- list(
    type = "array",
    #format = "table",
    title = tt("schema_story_views_activate"),
    options = list(
      collapsed = TRUE,
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE
      ),
    items = list(
      type = "object",
      title = tt("view"),
      properties = list(
        view = list(
          title = tt("view"),
          type = "string",
          minLength = 1,
          enum = viewListId,
          options = list(
            enum_titles = viewListTitles,
            selectize_options = list(
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
        title=tt("map_zoom"),
        type="number",
        minimum=0,
        maximum=22
        ),
      lat = list(
        title=tt("map_latitude_center"),
        type="number",
        minimum=-90,
        maximum=90
        ),
      lng = list(
        title=tt("map_longitude_center"),
        type="number",
        minimum=-180,
        maximum=180
        ),
      pitch = list(
        title=tt("map_pitch"),
        type="number",
        minimum=0,
        maximum=60
        ),
      bearing = list(
        title=tt("map_bearing"),
        type = "number"
        ),
      n = list(
        title=tt("map_north_max"),
        type = "number"
        ),
      s = list(
        title=tt("map_south_max"),
        type = "number"
        ),
      e = list(
        title=tt("map_east_max"),
        type = "number"
        ),
      w = list(
        title=tt("map_west_max"),
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
    #keyTitle = d("content",web=F),
    keyTitle = tt("content"),
    dict = config$dict
    )

  #
  # Slide classes 
  #
  slideClasses <- list(
    type = "array",
    format = "table",
    title = tt("schema_story_slide_classes"), 
    options =  list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE
      ),
    items = list(
      type = "object",
      title = tt("schema_class"),
      properties = list(
        name = list(
          title = tt("schema_story_slide_classes_name"), 
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
    title = tt("schema_story_slide_color_bg"),
    type = "string",
    format = "color",
    default = "#ffffff"
    )

  #
  # Slide background color
  #
  slideScroll <- list(
    title = tt("schema_story_slide_allow_scroll"),
    description = tt("schema_story_slide_allow_scroll_desc"),
    type = "boolean",
    format = "checkbox",
    defaut = TRUE
  )
  #
  # Slide background opacity
  #
  slideOpacityBg <- list(
    title = tt("schema_story_slide_opacity_bg"),
    type = "number",
    minimum = 0,
    maximum = 1,
    default = 0.2
    )

  #
  # Slide text color
  #
  slideColorText <- list(
    title = tt("schema_story_slide_color_fg"),
    type = "string",
    format = "color",
    default = "#000000"
    )

 #
  # Slide text size
  #
  slideSizeText <- list(
    title = tt("schema_story_slide_base_txt_size_px"),
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
    title = tt("schema_story_slide_effects"), 
    options = list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE,
      collapsed = TRUE
      ),
    items = list(
      type = "object", 
      title = tt("schema_story_slide_effects"), 
      properties = list(
        s = list(
          title = tt("schema_story_slide_effect_start"), 
          type = "number",
          default = 0L, 
          minimum = -100L,
          maximum = 100L
          ), 
        e = list(
          title = tt("schema_story_slide_effect_end"),
          type = "number",
          default = 100L,
          minimum = -100L,
          maximum = 100L
          ),
        o = list(
          title = tt("schema_story_slide_effect_offset"),
          type = "number",
          default = 0L,
          minimum = -100L,
          maximum = 100L
          ),
        f = list(
          title = tt("schema_story_slide_effect_factor"),
          type = "number",
          default = 1
          ),
        t = list(
          type = "integer",
          title = tt("schema_story_slide_effect_type"), 
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
    type = "string",
    title = tt("schema_story_slide_name")
    )

  #
  # All slide config
  #
  stepSlide <- list(
    type = "array",
    format = "confirmDelete",
    options = list(
      disable_array_delete_all_rows = TRUE,
      disable_array_delete_last_row = TRUE,
      collapsed = TRUE
      ),
    title = tt("schema_story_slides"),
    items = list(
      type = "object",
      title = tt("schema_story_slide"),
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
    title = tt("schema_story_map_anim_duration"),
     description = tt("schema_story_map_anim_duration_desc"),
    type = "number",
    min = 0,
    default = 1000
    )
  
  animPathMethod <- list(
    title = tt("schema_story_map_anim_traj_method"),
     description = tt("schema_story_map_anim_traj_method_desc"),
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
    title = tt("schema_story_map_anim_fun"),
     description = tt("schema_story_map_anim_fun_desc"),
    type =  "string",
    enum =  list("easeIn","easeOut","easeInOut")
    )

  animFunctionPower = list(
     title = tt("schema_story_map_anim_fun_exp"),
     description = tt("schema_story_map_anim_fun_exp_desc"),
     type =  "number",
     min = 0,
     max = 10,
     default =1
    )

  stepMapAnimation <- list(
    type = "object",
    title = tt("schema_story_map_anim"),
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

  #
  # autoplay
  #
  autoplayTimeout <- list(
    title = tt("schema_story_autoplay_timeout"),
    description = tt("schema_story_autoplay_timeout_desc"),
    type = "number",
    min = 0,
    default = 1000
    )

  autoplayTransition <- list(
    title = tt("schema_story_autoplay_transition"),
    description = tt("schema_story_autoplay_transition_desc"),
    type = "number",
    min = 0,
    default = 1000
    )

  autoplayAnimFunction = list(
    title = tt("schema_story_map_anim_fun"),
    description = tt("schema_story_map_anim_fun_desc"),
    type =  "string",
    enum =  list("easeIn","easeOut","easeInOut")
    )

  autoplayAnimFunctionPower = list(
    title = tt("schema_story_map_anim_fun_exp"),
    description = tt("schema_story_map_anim_fun_exp_desc"),
    type =  "number",
    min = 0,
    max = 10,
    default =1
    )

  stepAutoplay <- list(
    type = "object",
    title = tt("schema_story_autoplay"),
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
    type = "string",
    title = tt("schema_story_step_name")
    )

  stepConfig = list(
    type = "object",
    title = tt("schema_story_step"),
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
    title = tt("schema_story_screen_res"),
    minLength = 1,
    description = tt("schema_story_screen_res_desc"),
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
    title = tt("schema_story_title"),
    type = "object", 
    properties = list(
      settings = list(
        type = "object",
        title = tt("schema_story_settings"),
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
        title = tt("schema_story_steps"), 
        items = stepConfig
        )
      )
    )


  return(main)

}
