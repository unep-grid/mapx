#tagList (
  #tags$div(
    #class="left-column transparent width-60",
    #tags$div(class="left-column-inner push-top",
            #tags$button(
        #class="btn btn-circle",
        #onClick="mx.util.tabEnable('tabs-main','tab-layers')",
        #`data-lang_key`="btn_tab_views",
        #`data-lang_as-tooltip`=TRUE,
        #icon("list")
        #),
      #tags$button(
        #class="btn btn-circle",
        #onClick="mx.util.tabEnable('tabs-main','tab-tools')",
        #`data-lang_key`="btn_tab_tools",
        #`data-lang_as-tooltip`=TRUE,
        #icon("cogs")
        #),
      #tags$button(
        #class="btn btn-circle",
        #onClick="mx.util.tabEnable('tabs-main','tab-settings')",
        #`data-lang_key`="btn_tab_settings",
        #`data-lang_as-tooltip`=TRUE,
        #icon("sliders")
        #)
      #),
    #tags$div(class="left-column-inner push-bottom",
      #actionButton(
        #inputId="btnLogin",
        #label="",
        #icon = icon("sign-in"),
        #class="btn btn-circle",
        #`data-lang_key`="btn_login",
        #`data-lang_as-tooltip`=TRUE
        #),
      #actionButton(
        #inputId="btnCountry",
        #label="",
        #icon = icon("globe"),
        #class="btn btn-circle",
        #`data-lang_key`="btn_country",
        #`data-lang_as-tooltip`=TRUE
        #),
      #actionButton(
        #inputId="btnLanguage",
        #label="",
        #icon = icon("language"),
        #class="btn btn-circle",
        #`data-lang_key`="btn_language",
        #`data-lang_as-tooltip`=TRUE
        #),
      #tags$button(
        #id="btnToggleFullScreen",
        #class="btn btn-circle",
        #icon("expand"),
        #`data-lang_key`="btn_fullscreen",
        #`data-lang_as-tooltip`=TRUE,
        #onClick="toggleFullScreen('btnToggleFullScreen')" 
        #),
      #mxUiColorSwitch(
        #id="switchUiColor",
        #class1="black",
        #class2="white",
        #`data-lang_key`="btn_switchui",
        #`data-lang_as-tooltip`=TRUE
        #)
      #)
    #)
  #)


