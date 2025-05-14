#' Set filter based on a list of rules
#' @param id Map id
#' @param layerId Layer id
#' @param filter Filter operator
#' @export
mglSetFilter <- function(id, layerId, filter, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglSetFilter",
    list(
      id = id,
      idView = layerId,
      filter = filter
    )
  )
}


#' Set filter based on a list of rules
#' @param id {Character } Map id
#' @param countrieses {List} List of countries
#' @param idLayer {Character} country layer id
#' @export
mglSetHighlightedCountries <- function(id, countries, idLayer = "country-code", session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglSetHighlightedCountries",
    list(
      id = id,
      idLayer = idLayer,
      countries = countries
    )
  )
}



#' Update all view badges, and linked metadata if needed
#' @param opt {List} list of options
#' @param idProject {Character} Id of the project
#' @export
mglGetProjectViewsState <- function(opt = list(), session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglGetProjectViewsState",
    opt
  )
}

#' Set project
#' @param idProject {Character} Id of the project
#' @export
mglUpdateProject <- function(idProject = config$project$default, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglUpdateProject", list(
    idProject = idProject
  ))
}

#' Update all view badges, and linked metadata if needed
#' @param opt {List} list of option : forceUpadateMeta : force update of the metadata
#' @export
mglUpdateViewsBadges <- function(opt, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglUpdateViewsBadges",
    opt
  )
}

#' Get overlap result
#' @param opt {List} list of option : idTextResult, layers, countries, method
#' @export
mglGetOverlapAnalysis <- function(opt, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglGetOverlapAnalysis",
    opt
  )
}

#' Get overlap result
#' @param opt {List} list of option : idSource, idForm, useCache, autoCorrect
#' @export
mglGetValidateSourceGeom <- function(opt, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglGetValidateSourceGeom",
    opt
  )
}

#' Get overlap result
#' @param opt {List} list of option : idSource, idView, binsNumber, binsMethod, etc..
#' @export
mglGetSourceStatModal <- function(opt, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglGetSourceStatModal",
    opt
  )
}


#' Set legend html template
#' @param template {character} Dot.js compatible template for displaying legend
#' @export
mglSetLegendTemplate <- function(template, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglSetLegendTemplate",
    list(
      template = template
    )
  )
}

#' Reset map, view and dashboards
#' @param idMap {character} map id
#' @export
mglReset <- function(idMap, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglReset",
    list(
      idMap = idMap
    )
  )
}

#' Reset map, view and dashboards
#' @param idMap {character} map id
#' @export
mglHandlerDownloadVectorSource <- function(config, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglHandlerDownloadVectorSource", config)
}



#' Get client localForage object
#' @param idStore localforage store id
#' @param idKey Id of the object
#' @param idInput Id to trigger when the operation is completed
mglGetLocalForageData <- function(idStore, idKey, idInput, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglGetLocalForageData",
    list(
      idInput = idInput,
      idKey = idKey,
      idStore = idStore
    )
  )
}


#' Close all currently activated views
#'
mglViewsCloseAll <- function(session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglViewsCloseAll",
    list()
  )
}



#' Remove view
#' @param idView {character} geojson view id
#' @export
mglRemoveView <- function(idView = NULL, session = shiny::getDefaultReactiveDomain()) {
  if (is.null(idView)) {
    return()
  }

  session$sendCustomMessage(
    "mglRemoveView",
    list(
      idView = idView
    )
  )
}

#' Update views list
#'
#' Trigger an update or send new view list, possibly compact.
#'
#' @param id {character} Id of the map to associate views
#' @param viewsList {list} Optional list of views.
#' @param render {logical} Render views lsit
#' @param useQueryFilters {boolean} Use views query filters
#' @param project {character} Project code
#' @param resetViews {boolean} Removes old views
#' @export
mglUpdateViewsList <- function(
  id = NULL,
  viewsList = NULL,
  render = TRUE,
  useQueryFilters = TRUE,
  project = NULL,
  resetViews = FALSE,
  session = shiny::getDefaultReactiveDomain()) {
  conf <- mxGetDefaultConfig()

  if (isEmpty(id)) {
    id <- conf[[c("map", "id")]]
  }

  session$sendCustomMessage("mglUpdateViewsList", list(
    id = id,
    viewsList = viewsList,
    render = render,
    useQueryFilters = useQueryFilters,
    project = project,
    resetViews = resetViews
  ))
}


#' Render view list
#' @param id {character} map id
#' @export
mglRenderViewsList <- function(id = NULL, session = shiny::getDefaultReactiveDomain()) {
  if (isEmpty(id)) id <- config[["map"]][["id"]]

  session$sendCustomMessage("mglRenderViewsList", list(
    id = id
  ))
}


#' Keep all maps position in sync
#' @param enabled Boolean
#' @export
mglSyncAllMaps <- function(enabled = FALSE, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglSyncAllMaps",
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
mglInit <- function(config, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage(
    "mglInit",
    jsonlite::toJSON(
      config,
      keep_vec_names = FALSE,
      auto_unbox = TRUE,
      null = "null"
    )
  )
}


#' Fly to location
#' @param id map id
#' @param mapPosition List of options for destination position parameters
#' @param {Reactive} session Shiny session
#' @export
mglSetMapPos <- function(id = NULL, mapPosition, session = shiny::getDefaultReactiveDomain()) {
  stopifnot(isNotEmpty(id))

  session$sendCustomMessage("mglSetMapPos", list(
    id = id,
    param = mapPosition
  ))
}

#' Set map projection
#' @param id map id
#' @param name  Projection name
#' @param center  Center
#' @param parallels  Parallels
#' @param origin  Origin name for debugging
#' @param {Reactive} session Shiny session
#' @export
mglSetMapProjection <- function(
  id = NULL,
  name = config$projections$ids,
  center = list(0, 0),
  parallels = list(0, 0),
  session = shiny::getDefaultReactiveDomain(),
  origin = "server"
) {
  session$sendCustomMessage("mglSetMapProjection", list(
    id = id,
    name = name,
    center = center,
    parallels = parallels,
    origin = origin
  ))
}


#' Set theme
#' @param theme Theme id or theme object
#' @param {Reactive} session Shiny session
#' @export
mglSetTheme <- function(
  theme = NULL,
  session = shiny::getDefaultReactiveDomain()
) {
  if (isEmpty(theme)) {
    return()
  }
  session$sendCustomMessage("mglSetTheme", list(
    theme = theme
  ))
}




#' Set label language
#' @param id Map id
#' @param language two letter language ex. en, fr, ru, es
#' @param labelLayer Name of the layer that contains the label text to display
#' @export
mglSetLanguage <- function(id = NULL, language = "en", labelLayer = "country-label", session = shiny::getDefaultReactiveDomain()) {
  stopifnot(isNotEmpty(id))

  session$sendCustomMessage(
    "mglSetLanguage",
    list(
      id = id,
      language = substr(language, 0, 2),
      layerId = labelLayer
    )
  )
}


#' Add sources
#' @param id Map id
#' @param sources named list that contain mapbox source.
#' @export
mglAddSources <- function(id = NULL, sources, session = shiny::getDefaultReactiveDomain()) {
  if (isEmpty(id)) {
    id <- .get(config, c("map", "id"))
  }

  session$sendCustomMessage(
    "mglAddSources",
    list(
      id = id,
      sources = sources
    )
  )
}


#' Update view
#' @param id Map id
#' @param viewData View list
#' @export
mglUpdateView <- function(viewData, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mglUpdateView", viewData)
}

#' Add a new layer
#' @param id Map id
#' @param before Layer name before wich to put this new layer
#' @param options Layer description : e.g. list(id="test",type="fill","source"="test_source",paint=list(`fill-color`="#F00"))
mglAddLayer <- function(id, before = NULL, options, session = shiny::getDefaultReactiveDomain()) {
  stopifnot(is.list(options))

  session$sendCustomMessage(
    "mglAddLayer",
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
mglAddAutoLayer <- function(id = NULL, style = NULL, before = NULL, session = shiny::getDefaultReactiveDomain()) {
  stopifnot(isNotEmpty(id))
  stopifnot(is.list(style))
  stopifnot(is.list(style$sources))

  session$sendCustomMessage(
    "mglAddAutoLayer",
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
mglReadStory <- function(id = NULL, view = list(), save = TRUE, update = TRUE, edit = TRUE, close = FALSE, session = shiny::getDefaultReactiveDomain()) {
  if (isEmpty(id)) {
    id <- .get(config, c("map", "id"))
  }

  session$sendCustomMessage(
    "mglReadStory",
    list(
      id = id,
      view = view,
      save = save,
      edit = edit,
      close = close,
      update = update
    )
  )
}
