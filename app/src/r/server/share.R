# 
# 
# observeEvent(input$btnIframeBuilder,{
#   reactData$showShareManager <- list(update=runif(1))
# })
# 
# 
# observeEvent(reactData$showShareManager,{
#   mxCatch("Share : build modal",{
# 
#     data <- reactData$showShareManager 
# 
#     hasDataList <- typeof(data) == "list"
#     hasViews <- hasDataList  && !noDataCheck(data$views)
#     isStory <- hasDataList && isTRUE(data$isStory)
#     project <- reactData$project
#     language <- reactData$language
#     userData <- reactUser$data
#     idUser <- userData$id
#     viewsToShare <- ifelse(noDataCheck(data$views),"", data$views) 
#     collections <- reactCollections()
#     viewsList <- reactViewsListProject()
# 
#     if(noDataCheck(collections)) collections <- list()
# 
#     #
#     # Translation
#     #
#     tt <- function(id){mxDictTranslateTag(id,language=language)}
#     ttd <- function(id){mxDictTranslateTagDesc(id,language=language)}
#   
#     #
#     # Share URL block
#     #
#     ui <- tagList(
#       tags$h3(tt("share_link_title")),
#       tags$small(tt("share_mode_warn")),
#       #
#       # URL string
#       #
#       div(
#         class="input-group",
#         style ="margin-bottom:10px",
#         textInput(
#           "txtShareBuilt",
#           label = NULL,
#           value = ""
#           ),
#         tags$input(
#           type="text",
#           class="mx-hide-here",
#           id = "txtShareLink",
#           label = NULL,
#           value = ""
#           ),
#         tags$span(
#           class="input-group-btn",   
#           tags$button(
#             id = "btnCopyShareLink",
#             class = "form-control btn-square btn-black",
#             tags$i(class="fa fa-clipboard"),
#             onclick="mx.helpers.copyText('txtShareBuilt')"
#           )
#           ),
#         tags$span(
#           class="input-group-btn",   
#           tags$button(
#             id = "btnTwitterShareLink",
#             class = "form-control btn-square btn-black ",
#             onclick="mx.helpers.shareTwitter('txtShareLink')",
#             tags$i(class="fa fa-twitter")
#           )
#         )
#         ),
#       #
#       # Options
#       #
#       tagList(
#         #
#         # Conditional option panel
#         #
#         checkboxInput('checkShareOptions',
#           label = tt('share_options'),
#           value = !hasViews
#           ),
#         conditionalPanel('input.checkShareOptions',
#           wellPanel(
#             style="max-height:300px;overflow:auto",
#             tagList(
#               #
#               # Language
#               #
#               selectizeInput(
#                 "selectShareLanguage",
#                 label = tt('btn_language'),
#                 choices = config$languages$list,
#                 multiple = FALSE,
#                 selected = language,
#                 ),
#               #
#               # Static mode
#               #
#               checkboxInput("checkShareStatic",
#                 label = ttd("share_mode_static_label"),
#                 value = TRUE
#                 ),
#               #
#               # Views to share
#               #
#               checkboxInput("checkShareViews",
#                 label = ttd("share_views_check_label"),
#                 value = TRUE
#                 ),
#               conditionalPanel(
#                 condition = "input.checkShareViews",
#                 tagList(
#                   selectizeInput(
#                     "selectShareViews",
#                     label = tt('share_views_select'),
#                     choices = viewsList,
#                     multiple = TRUE,
#                     selected = viewsToShare,
#                     options = list(
#                       sortField = "label",
#                       plugins = list(
#                         "remove_button",
#                         "drag_drop"
#                       )
#                     )
#                   )
#                 )
#                 ),
#               #
#               # Zoom to views in static mode
#               #
#               conditionalPanel(
#                 condition = 'input.checkShareStatic',
#                 tagList(
#                   checkboxInput("checkShareZoomToViews",
#                     label = ttd("share_views_zoom_label"),
#                     value = TRUE
#                   )
#                 )
#                 ),
#               #
#               # App options
#               #
#               conditionalPanel(
#                 condition = "!input.checkShareStatic",
#                 tagList(
#                   #
#                   # Views to open
#                   #
#                   checkboxInput("checkShareViewsOpen",
#                     label = ttd("share_views_open_check_label"),
#                     value = TRUE
#                     ),
#                   conditionalPanel(
#                     condition = "input.checkShareViewsOpen",
#                     selectizeInput(
#                       "selectShareViewsOpen",
#                       label = NULL,
#                       choices = viewsList,
#                       multiple = TRUE,
#                       selected = viewsToShare,
#                       options = list(
#                         sortField = "label",
#                         plugins = list("remove_button")
#                       )
#                     )
#                     ),
#                   #
#                   # Views collections
#                   #
#                   checkboxInput("checkShareCollections",
#                     label = ttd("share_collections_check_label")
#                     ),
#                   conditionalPanel(
#                     condition = "input.checkShareCollections",
#                     tagList(
#                       selectizeInput(
#                         "selectShareCollections",
#                         label = NULL,
#                         choices = collections,
#                         multiple = TRUE,
#                         selected = query$collections,
#                         options = list(
#                           sortField = "label",
#                           plugins = list("remove_button")
#                         )
#                         ),
#                       wellPanel(
#                         radioButtons("checkShareCollectionOperator",
#                           label = tt("share_collections_check_operator_label"),
#                           choiceValues = c('ALL','ANY'),
#                           choiceNames = c(
#                             dd('share_collections_check_operator_all',language),                     
#                             dd('share_collections_check_operator_any',language)
#                           )
#                         )
#                       )
#                     )
#                     ),
#                   #
#                   # Ignore/hide categories
#                   #
#                   checkboxInput("checkHideCategory",
#                     label = ttd('share_category_hide')
#                     ),
#                   #
#                   # Set filter activated
#                   #
#                   checkboxInput("checkFilterActivated",
#                     label = ttd('share_filter_activated')
#                   )
#                 )
#                 ),
#               #
#               # Map position
#               #
#               checkboxInput("checkShareMapPosition",
#                 label = ttd("share_map_pos_check_label")
#                 ),
#               conditionalPanel(
#                 condition = "input.checkShareMapPosition",
#                 jedOutput("shareMapPosition")
#                 ),
#               #
#               # Iframe
#               #
#               checkboxInput("checkShareIframe",
#                 label = ttd('share_iframe_check_label')
#               )
#             )
#           )
#         )
#       )
#     )
# 
#     #
#     # Build modal
#     #
#     mxModal(
#       id = "modalShare",
#       title = tt('share_manager_title'),
#       content = ui,
#       addSelectize = TRUE,
#       #
#       # Background must be off to change
#       # map position
#       #
#       addBackground = FALSE 
#       )
# 
# })
# })
# 
# 
# #
# # Build URL
# #
# observe({
# 
#   mxCatch("Share : build url",{
#     data <- reactData$showShareManager 
#     hasDataList <- typeof(data) == "list"
#     hasViews <- hasDataList  && !noDataCheck(data$views)
# 
#     if(!hasDataList){
#       return();
#     }
#     urlHost <- session$clientData[["url_hostname"]]  
#     urlPort <- session$clientData[["url_port"]] 
#     urlProtocol <- session$clientData[["url_protocol"]]
#     urlPort <- ifelse(!noDataCheck(urlPort),sprintf(":%s",urlPort),"") 
# 
#     #
#     # Init strings
#     #
#     first <- TRUE
#     mode <- ""
#     collections <- ""
#     views <- ""
#     viewsOpen <- ""
#     mapPosition <- ""
#     zoomToViews <- ""
#     hideCategory <- ""
#     filterActivated <- ""
#     inMapPosition <- .get(input$shareMapPosition_values,c('data'),list())
# 
#     inCollections <- paste(input$selectShareCollections,collapse=",")
#     inViews <- paste(input$selectShareViews,collapse=",")
#     inViewsOpen <- paste(input$selectShareViewsOpen,collapse=",")
#     inLanguage <- input$selectShareLanguage
#     #
#     # Build request
#     #
#     data <- reactData$showShareManager
#     addIframe <- isTRUE(input$checkShareIframe)
#     addStaticMode <- isTRUE(input$checkShareStatic)
#     addCollections <- isTRUE(input$checkShareCollections)
#     addCollectionsAll <- isTRUE(input$checkShareCollectionOperator == 'ALL')
#     addViews <- isTRUE(input$checkShareViews)
#     addZoomToExtent <- isTRUE(input$checkShareZoomToViews)
#     addViewsOpen <- isTRUE(input$checkShareViewsOpen)
#     addMapPosition <- isTRUE(input$checkShareMapPosition)
#     addHideCategory <- !addStaticMode && isTRUE(input$checkHideCategory)
#     addFilterActivated <- !addStaticMode && isTRUE(input$checkFilterActivated)
# 
#     isolate({
#       project <- sprintf("project=%s&", reactData$project)
# 
# 
#       if(addStaticMode){
#         mode <- "/static.html?"
#         project <- ""
#       }else{
#         mode <- "?"
#       }
# 
#       if(addMapPosition){
#         mapPositionIssues <- .get(input$shareMapPosition_issues,c('data'),list())
#         if(length(mapPositionIssues) <- 0){
#           addMapPosition <- FALSE
#         }
#       }
# 
#       #
#       # Initial map position
#       #
#       if(addMapPosition) mapPosition <- sprintf("lat=%1$s&lng=%2$s&z=%3$s&",
#         inMapPosition$lat,
#         inMapPosition$lng,
#         inMapPosition$z
#         )
# 
#       #
#       # Zoom to views extent
#       #
#       if(addStaticMode && addZoomToExtent){
#         zoomToViews = "zoomToViews=true&"
#       }
#       
#       #
#       # Views
#       # 
#       if(addViews) views <- sprintf("views=%s&",inViews)
# 
# 
# 
#       #
#       # App mode
#       #
#       if(!addStaticMode){
# 
#         #
#         # Views to open
#         #
#         if(addViewsOpen) viewsOpen <- sprintf("viewsOpen=%s&",inViewsOpen)
# 
#         #
#         # Collections
#         #
#         if(addCollections){
#           selector <- ifelse(addCollectionsAll,'ALL','ANY')
#           collections <- sprintf("collections=%1$s&collectionsSelectOperator=%2$s&", 
#             inCollections,
#             selector
#             )
#         }
#       }
#       #
#       # Language
#       #
#       strLanguage = sprintf("language=%s&", inLanguage)
# 
#       #
#       # Category
#       #
#       if(addHideCategory) hideCategory <- "viewsListFlatMode=true&"
#       
#       #
#       # Filter activated
#       #
#       if(addFilterActivated) filterActivated <- "viewsListFilterActivated=true&"
# 
#       #
#       # Compose URL
#       #
#       urlBuilt <- ""
#       url <- urlProtocol + "//" + urlHost + urlPort + mode + project + 
#         collections + 
#         views + 
#         viewsOpen + 
#         zoomToViews +
#         mapPosition +
#         hideCategory +
#         strLanguage +
#         filterActivated
# 
#       #
#       # Build iframe
#       #
#       if(addIframe){
#         urlBuilt <- sprintf("<iframe width='800' height='500' src='%1$s' frameborder='0' allowfullscreen></iframe>",url)
#       }else{
#         urlBuilt <- url
#       }
# 
#       #
#       # Hide twitter button if the output is an iframe
#       #
#       mxToggleButton(id="btnTwitterShareLink",disable=isTRUE(addIframe))
# 
# 
#       updateTextAreaInput(
#         session=shiny::getDefaultReactiveDomain(),
#         inputId="txtShareLink",
#         value=url
#         )
#       updateTextAreaInput(
#         session=shiny::getDefaultReactiveDomain(),
#         inputId="txtShareBuilt",
#         value=urlBuilt
#         )
#     })
# })
# })
# 
# 
# #
# # Map position handler
# #
# observeEvent(input$shareMapPosition_init,{
# 
#   mxCatch("Share : handle map position",{
#     language <- reactData$language 
#     tt <- function(id){dd(id,lang=language)}
# 
#     project <- reactData$project
#     projectData <- mxDbGetProjectData(project)
#     mapPosition <- .get(projectData,c("map_position"))
# 
#     schema <- list(
#       type = "object",
#       format = "position",
#       title = tt("share_map_pos_set"),
#       options = list(
#         addButtonPos = TRUE,
#         idMap = "map_main",
#         textButton = tt("share_map_pos_get"),
#         collapsed = TRUE
#         ),
#       properties = list(
#         z = list(
#           title = tt("map_zoom"),
#           type = "number",
#           minimum = 0,
#           maximum = 22
#           ),
#         lat = list(
#           title = tt("map_latitude_center"),
#           type="number",
#           minimum=-90,
#           maximum=90
#           ),
#         lng = list(
#           title = tt("map_longitude_center"),
#           type="number",
#           minimum=-180,
#           maximum=180
#           )
#         )
#       )
#     jedSchema(
#       id = "shareMapPosition",
#       schema = schema,
#       startVal = mapPosition,
#       options = list(
#         getValidationOnChange = TRUE,
#         getValuesOnChange = TRUE
#         )
#       )
# })
# })
# 
# 
