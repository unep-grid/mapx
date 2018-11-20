

#' Set filter based on a list of rules
#' @param id Map id
#' @param layerId Layer id
#' @param filter Filter operator
#' @export
mglSetFilter <- function( id, layerId, filter, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglSetFilter",
    list(
      id = id,
      idView = layerId,
      filter = filter
      )
    )
}

#' Update all source metadata of loaded views
#' @param overwrite {logical} Overwrite existing meta
#' @export
mglUpdateAllViewsSourceMetadata <- function(overwrite=TRUE,session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglUpdateAllViewsSourceMetadata",
    overwrite
    )
}

#' Get overlap result
#' @param opt {List} list of option : idTextResult, layers, countries, method
#' @export
mglGetOverlapAnalysis <- function(opt,session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglGetOverlapAnalysis",
    opt
    )
}

#' Set legend html template
#' @param template {character} Dot.js compatible template for displaying legend
#' @export
mglSetLegendTemplate <- function( template, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglSetLegendTemplate",
    list(
      template = template
      )
    )
}

#' Reset map, view and dashboards
#' @param idMap {character} map id
#' @export
mglReset <- function( idMap, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglReset",
    list(
      idMap = idMap
      )
    )
}

#' Reset map, view and dashboards
#' @param idMap {character} map id
#' @export
mglHandlerDownloadVectorSource <- function( config, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglHandlerDownloadVectorSource",config);
}


#' Set user id
#' @param userData {list} list of user data such as id, email, nickname
#' @export
mglSetUserData <- function( userData, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglSetUserData",userData)
}

#' Get client localForage object 
#' @param idStore localforage store id
#' @param idKey Id of the object
#' @param idInput Id to trigger when the operation is completed
mglGetLocalForageData <- function(idStore,idKey,idInput,session=shiny::getDefaultReactiveDomain()){
  session$sendCustomMessage("mglGetLocalForageData",
    list(
      idInput = idInput,
      idKey = idKey,
      idStore = idStore
      )
    )
}




#' Remove geojson from view list and geojson  db
#' @param id {character} map id
#' @param idView {character} geojson view id
#' @export
mglRemoveView <- function( id=NULL, idView, session=shiny::getDefaultReactiveDomain()) {
  
  if(is.null(id)) id = .get(config,c("map","id"))

  session$sendCustomMessage("mglRemoveView",
    list(
      id = id,
      idView = idView
      )
    )
}

#' Send view list to js
#' @param viewsList {list} List of view to save
#' @param id {character} Id of the map to associate views
#' @param viewsCompact {boolean} For compact views list (ask remote server for full view)
#' @param project {character} Project code
#' @param resetViews {boolean} remove old views and replace them by those one
#' @param idViewsList {character} Id of the view list where to put views
#' @param idViewsListContainer {character} Id of the view list container
#' @note mgl init has already saved idViewsList and idViewsListContainer. Duplicate ? 
#' @export
mglSetSourcesFromViews <- function(viewsList, id=NULL, project=NULL, resetViews=FALSE, viewsCompact=FALSE, idViewsList=NULL, idViewsListContainer=NULL, render=TRUE, session=shiny::getDefaultReactiveDomain()) {

  conf <- mxGetDefaultConfig()

  if(noDataCheck(id)){
    id <- conf[[c("map","id")]]
  }

  if(noDataCheck(idViewsList)){
    idViewsList <- conf[[c("map","idViewsList")]]
  }

  if(noDataCheck(idViewsListContainer)){
    idViewsListContainer <- conf[[c("map","idViewsListContainer")]]
  }


  session$sendCustomMessage("mglSetSourcesFromViews",list(
      id = id,
      viewsList = viewsList,
      idViewsList = idViewsList,
      idViewsListContainer = idViewsListContainer,
      render = render,
      project = project,
      viewsCompact = viewsCompact,
      resetViews =resetViews
      ))

}


#' Render view list
#' @param id {character} map id
#' @export
mglRenderViewsList <- function(id=NULL, session=shiny::getDefaultReactiveDomain()){

  if(noDataCheck(id))   id <- config[["map"]][["id"]]

  session$sendCustomMessage("mglRenderViewsList",list(
      id = id
      ))
}


#' Keep all maps position in sync
#' @param enabled Boolean
#' @export
mglSyncAllMaps <- function( enabled=FALSE,  session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglSyncAllMaps",
    list(
      enabled = enabled
      )
    )
}

#' Init map
#' @param {list} config
#' @note 
#'
#' id = map id. Id used in map element and mgl.data.id and map.id 
#' language 2 letter language code
#' lat : initial lattitude in degrees 
#' lng : initial logontitude 
#' zoom : initial zoom 
#' paths : named list containing aths to resource (theme, style, sprite , ..)
#' idViewsList : id of the element containing the view list
#' idViewsListContainer : id of the view list parent element
#' token : mapbox token,
#' languages : list of available languages
#' projects: list of availble project code
#' templateViewList : full html template to generate view list with {using dot.js}
#' templateViewPopup : full html template to generate popup (using dot.js)
#' templateViewLegend : full thml template to generate legend (using dot.js)
#' templateViewStory : full html template to generate story map (using dot.js)
#' 
#' @export 
mglInit <- function( config, session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglInit",
    jsonlite::toJSON(
      config,
      keep_vec_names=FALSE,
      auto_unbox=TRUE,
      null="null"
      )
    )
}


#' Fly to location
#' @param id map id
#' @param mapPosition List of options for destination position parameters
#' @param {Reactive} session Shiny session
#' @export
mglFlyTo <- function( id=NULL, mapPosition, session=shiny::getDefaultReactiveDomain()) {

  stopifnot(!noDataCheck(id))

  session$sendCustomMessage("mglFlyTo",list(
      id = id,
      param =  mapPosition
      )
    )
}

#' Set label language
#' @param id Map id
#' @param language two letter language ex. en, fr, ru, es
#' @param labelLayer Name of the layer that contains the label text to display
#' @export
mglSetLanguage <- function( id=NULL, language="en", labelLayer="country-label", session=shiny::getDefaultReactiveDomain()){

  stopifnot(!noDataCheck(id))

  session$sendCustomMessage("mglSetLanguage",
    list(
      id = id,
      language = substr(language,0,2),
      layerId = labelLayer
      )
    )
}


#' Add sources
#' @param id Map id
#' @param sources named list that contain mapbox source. 
#' @export
mglAddSources <- function( id = NULL, sources, session=shiny::getDefaultReactiveDomain() ){

  if(noDataCheck(id)){
    id <- .get(config,c("map","id"))
  }

  session$sendCustomMessage("mglAddSources",
    list(
      id = id,
      sources = sources
      )
    )
}


#' Add view 
#' @param id Map id
#' @param viewData View list
#' @param idViewsList id of the ui element for displaying list of view
#' @export
mglAddView <- function( id=NULL, viewData, idViewsList=NULL,  session=shiny::getDefaultReactiveDomain() ){
  
  conf <- mxGetDefaultConfig()

  if(noDataCheck(id)){
    id <- conf[["map"]][["id"]]
  }

  if(noDataCheck(idViewsList)){
    idViewsList <- conf[["map"]][["idViewsList"]]
  }

  session$sendCustomMessage("mglAddView",
    list(
      id = id,
      viewData = viewData,
      idViewsList = idViewsList
      )
    )
}


#' Add a new layer
#' @param id Map id
#' @param before Layer name before wich to put this new layer
#' @param options Layer description : e.g. list(id="test",type="fill","source"="test_source",paint=list(`fill-color`="#F00"))
mglAddLayer <- function( id, before=NULL, options, session=shiny::getDefaultReactiveDomain()){

  stopifnot(is.list(options))

  session$sendCustomMessage("mglAddLayer",
    list(
      id = id,
      before = before,
      layer = options
      )
    )

}

#' Add source and layer generated by schema 
#' @param id
#' @param style
#' @param before
mglAddAutoLayer <- function(id=NULL, style=NULL, before=NULL, session=shiny::getDefaultReactiveDomain()){

  stopifnot(!noDataCheck(id))
  stopifnot(is.list(style))
  stopifnot(is.list(style$sources))

  session$sendCustomMessage("mglAddAutoLayer",
    list(
      id = id,
      style = style,
      before = before
      )
    )

}

#' Live preview story map
#' @param id Map id
#' @param view View data
#' @param save Save data in local storage client side
#' @param edit Enable view edition 
#' @param close Close the current story
#' @param session Shiny session object
mglReadStory <- function(id=NULL,view=list(),save=TRUE,edit=TRUE,close=FALSE, session=shiny::getDefaultReactiveDomain()){

  if(noDataCheck(id)){
    id <- .get(config,c("map","id"))
  }

  session$sendCustomMessage("mglReadStory",
    list(
      id = id,
      view = view,
      save = save,
      edit = edit,
      close = close
      )
    )
}






