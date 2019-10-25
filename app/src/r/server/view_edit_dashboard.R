
observeEvent(input$dashboardEdit_init,{
  mxCatch("dashboard build",{

    mxToggleButton(
      id="btnViewSaveDashboard",
      disable = TRUE
      )

    view = reactData$viewDataEdited
    language = reactData$language
    dashboard = .get(view,c("data","dashboard"))
    widgets = .get(dashboard,c("widgets"))
    titles = .get(view,c("data","title"))
    viewType = .get(view,c('type'))


    t <- function(i=NULL){
      d(id=i,lang=language,dict=config$dict,web=F,asChar=T)
    }

    #
    # Backward compatibility for size
    #
    toDim <- function(dim){

      oldClasses <- list(
        "x50" = 50,
        "x1" = 150,
        "x2" = 300,
        "x3" = 450,
        "x4" = 600,
        "y50" = 50,
        "y1" = 150,
        "y2" = 300,
        "y3" = 450,
        "y4" = 600         
        )

      out <- oldClasses[[dim]] 

      out <- ifelse(noDataCheck(out), dim,out ) 
      out <- ifelse(noDataCheck(out), "100", out) 

      return(out)
    }


    if(length(widgets)>0){

      for(i in 1:length(widgets)){
        widgets[[i]]$height <- toDim(widgets[[i]]$height)
        widgets[[i]]$width <- toDim(widgets[[i]]$width)
      }
      dashboard$widgets <- widgets;
    }

    #
    # Data source according to type
    #
    if(viewType == "vt"){
      srcDataOption = list("viewFreqTable","layerChange","layerClick","none")
      srcDataLabels = list(
        t("view_dashboard_src_view"),
        t("view_dashboard_src_layerChange"),
        t("view_dashboard_src_layerClick"),
        t("view_dashboard_src_none")
        ) 
    }
    if(viewType == "rt"){
      srcDataOption = list("layerClick","none")
      srcDataLabels = list(
        t("view_dashboard_src_layerClick"),
        t("view_dashboard_src_none")
        ) 
    }
    if(viewType == "cc"){
      srcDataOption = list("none")
      srcDataLabels = list(
        t("view_dashboard_src_none")
        ) 
    }
    #
    # Set widget size choices
    #
    
    widgetSizes <- seq(50,600,50)
    widgetSizesValues <- as.list(paste(widgetSizes))
    widgetSizesLabels <- as.list(paste(widgetSizes,"px"))

    sc = list(
      title = t("view_dashboard"), 
      type = "object", 
      properties = 
        list(
          title = mxSchemaMultiLingualInput(
            keyTitle = "view_dashboard_title",
            format = "text",
            default = titles,
            language = language
            ),
          `modules` = list(
            title = t("view_dashboard_txt_which_module"),
            description = t("view_dashboard_txt_desc_module"),
            type = "array",
            uniqueItems = TRUE,
            items = list(
              type = "string",
              enum = list("highcharts","d3","d3-geo","topojson","selectize","nouislider")
              )
            ),
          widgets = list(
            type = "array",
            format = "confirmDelete",
            title=t("view_dashboard_widgets"),
            uniqueItems = FALSE,
            items = list(
              type = "object",
              title = t("view_dashboard_widget"),
              options = list(
                collapsed=TRUE
                ),
              properties = list(
                `source` = list(
                  title = t("view_dashboard_txt_which_data"),
                  type = "string",
                  enum = srcDataOption,
                  options = list(
                    enum_titles = srcDataLabels
                    )
                  ),
                `sourceIgnoreEmpty` = list(
                  title = t("view_dashboard_txt_ignore_empty_data"),
                  type = "boolean",
                  format = "checkbox",
                  default = TRUE
                  ),
                `width` = list(
                  title = t("view_dashboard_txt_width"),
                  type = "string",
                  enum = widgetSizesValues,
                  options = list(
                    enum_titles = widgetSizesLabels
                    )
                  ),
                `height` = list(
                  title = t("view_dashboard_txt_height"),
                  type = "string",
                  enum = widgetSizesValues,
                  options = list(
                    enum_titles = widgetSizesLabels
                    )
                  ),
                `script` = list(
                  title = t("view_dashboard_script"),
                  options = list(
                    language="javascript",
                    editor="ace"
                    ),
                  type = "string",
                  format = "textarea",
                  default =.get(config,c("templates","text","widget_function"))
                  )
                )
              )
            ) 
          )
      )

    viewTimeStamp <- as.numeric(
      as.POSIXct(view$date_modified,format="%Y-%m-%d%tT%T",tz="UTC")
      )

    jedSchema(
      id= "dashboardEdit",
      schema= sc,
      startVal= dashboard,
      options = list(
        draftAutoSaveId = view$id,
        draftAutoSaveDbTimestamp= viewTimeStamp
        )
      )

    mxToggleButton(
      id="btnViewSaveDashboard",
      disable = FALSE
      )
})
})


#
# Vew dashboard change
#
observeEvent(input$btnViewPreviewDashboard,{
  mxToggleButton(
    id="btnViewSaveDashboard",
    disable = FALSE
    )
  mxToggleButton(
    id="btnViewPreviewDashboard",
    disable = TRUE
    )
  jedTriggerGetValues("dashboardEdit","preview")
})

#
# View style save
#
observeEvent(input$btnViewSaveDashboard,{
  mxToggleButton(
    id="btnViewSaveDashboard",
    disable = TRUE
    )
  mxToggleButton(
    id="btnViewPreviewDashboard",
    disable = TRUE
    )
  jedTriggerGetValues("dashboardEdit","save")
})

observeEvent(input$dashboardEdit_values,{

  values <- input$dashboardEdit_values;
  if(noDataCheck(values)) return();

  dashboard <- values$data;
  idEvent <- values$idEvent;
  editor <- reactUser$data$id
  language <- reactData$language
  project <- reactData$project
  view <- reactData$viewDataEdited
  view <- .set(view,c("data","dashboard"), dashboard)
  time <- Sys.time()

  switch(idEvent,
    "preview"= {
      mglUpdateView(view)
    },
    "save"={

      if( view[["_edit"]] && view[["type"]] %in% c('vt','rt','cc') ){
        view[["_edit"]] = NULL

        view <- .set(view, c("date_modified"), time )
        view <- .set(view, c("target"), as.list(.get(view,c("target"))))
        view <- .set(view, c("readers"), as.list(.get(view,c("readers"))))
        view <- .set(view, c("editors"), as.list(.get(view,c("editors"))))
        view <- .set(view, c("data", "dashboard"), dashboard)
        view <- .set(view, c("data"), as.list(.get(view,"data")))
        view <- .set(view, c("editor"),editor)

        mxDbAddRow(
          data=view,
          table=.get(config,c("pg","tables","views"))
          )

        # edit flag
        view$`_edit` = TRUE 

        mglUpdateView(view)

        jedRemoveDraft("dashboardEdit",view$id);

        reactData$updateViewListFetchOnly <- runif(1)
      }

      mxFlashIcon("floppy-o")

      mxUpdateText(
        id = "modalViewEdit_txt",
        text = sprintf(d("saved_at",language),format(time,'%H:%M'))
        )


    })

  mxToggleButton(
    id="btnViewPreviewDashboard",
    disable = FALSE
    )
  mxToggleButton(
    id="btnViewSaveDashboard",
    disable = FALSE
    )

})

