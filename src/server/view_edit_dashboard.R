
observeEvent(input$dashboardEdit_init,{
  mxCatch("dashboard build",{
    view = reactData$viewDataEdited
    language = reactData$language
    dashboard = .get(view,c("data","dashboard"))
    titles = .get(view,c("data","title"))

    t <- function(i=NULL){
      d(id=i,lang=language,dict=config$dict,web=F,asChar=T)
    }

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
                  enum = list("viewFreqTable","layerChange","layerClick","none"),
                  options = list(
                    enum_titles = list(
                      t("view_dashboard_src_view"),
                      t("view_dashboard_src_layerChange"),
                      t("view_dashboard_src_layerClick"),
                      t("view_dashboard_src_none")
                      )
                    )
                  ),
                `width` = list(
                  title = t("view_dashboard_txt_width"),
                  type = "string",
                  enum = list("x50","x1","x2","x3","x4"),
                  options = list(
                    enum_titles = list("50px","150px","300px","450px","600px")
                    )
                  ),
                `height` = list(
                  title = t("view_dashboard_txt_height"),
                  type = "string",
                  enum = list("y50","y1","y2","y3","y4"),
                  options = list(
                    enum_titles = list("50px","150px","300px","450px","600px")
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

    jedSchema(
      id="dashboardEdit",
      schema=sc,
      startVal=dashboard
      )
})
})


#
# Vew style change
#
observeEvent(input$dashboardEdit_values,{

  dashboard <- input$dashboardEdit_values$msg

  if(noDataCheck(dashboard)) return();

  view <- reactData$viewDataEdited
  view <- .set(view,c("data","dashboard"), dashboard)

  mglAddView(
    viewData = view
    )

})

#
# View style save
#
observeEvent(input$btnViewSaveDashboard,{

  mxToggleButton(
    id="btnViewSaveDashboard",
    disable = TRUE
    )

  view <- reactData$viewDataEdited
  country <- reactData$country
  time <- Sys.time()

  if( view[["_edit"]] && view[["type"]] == "vt" ){
    view[["_edit"]] = NULL

    dashboard <- input$dashboardEdit_values$msg

    view <- .set(view, c("date_modified"), time )
    view <- .set(view, c("target"), as.list(.get(view,c("target"))))
    view <- .set(view, c("data", "dashboard"), dashboard)
    view <- .set(view,c("data"), as.list(.get(view,"data")))

    mxDbAddRow(
      data=view,
      table=.get(config,c("pg","tables","views"))
      )

    mglRemoveView(
      idView=view$id
      )

    # edit flag
    view$`_edit` = TRUE 

    # add this as new (empty) source
    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = view,
      render = FALSE,
      country = country
      )
    reactData$updateViewListFetchOnly <- runif(1)
  }

  mxUpdateText(
    id = "modalViewEdit_txt",
    text = sprintf("Saved at %s",time)
    )

  mxToggleButton(
    id="btnViewSaveDashboard",
    disable = FALSE
    )
})


