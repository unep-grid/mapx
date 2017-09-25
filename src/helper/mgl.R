

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
#' @param country {character} Country iso3 code
#' @param idViewsList {character} Id of the view list where to put views
#' @param idViewsListContainer {character} Id of the view list container
#' @note mgl init has already saved idViewsList and idViewsListContainer. Duplicate ? 
#' @export
mglSetSourcesFromViews <- function(viewsList, id=NULL, country=NULL, idViewsList=NULL, idViewsListContainer=NULL, render=TRUE, session=shiny::getDefaultReactiveDomain()) {

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
      country = country
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
#' countries : list of availble country code
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
#' @param zoom Final zoom value. If -1, we retrieve current zoom.
#' @param lat Centering the map on this lat
#' @param lng Centering the map on this lng
#' @param speed Speed of flight
#' @export
mglFlyTo <- function( id=NULL, lat=0, lng=0, speed=1, zoom=-1, session=shiny::getDefaultReactiveDomain()) {

  stopifnot(!noDataCheck(id))

  session$sendCustomMessage("mglFlyTo",
    list(
      id = id,
      center = c(lng,lat),
      speed = speed,
      zoom = zoom
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
#' @param view View object
#' @param session Shiny session object
mglReadStory <- function(id=NULL,view=list(), session=shiny::getDefaultReactiveDomain()){

  if(noDataCheck(id)){
    id <- .get(config,c("map","id"))
  }

  session$sendCustomMessage("mglReadStory",
    list(
      id = id,
      view = view,
      save = TRUE
      )
    )
}






