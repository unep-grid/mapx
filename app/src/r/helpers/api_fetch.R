#' Build API URL
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return {Character} API URL
#'
mxApiUrl <- function(route, listParam = NULL, public = FALSE, protocol = "http") {
  if (isEmpty(route)) {
    stop("missing route")
  }

  host <- ifelse(public,
    .get(config, c("api", "host_public")),
    .get(config, c("api", "host"))
  )
  port <- ifelse(public,
    .get(config, c("api", "port_public")),
    .get(config, c("api", "port"))
  )

  if (isNotEmpty(listParam)) {
    param <- paste0("?", mxListToQueryStringParam(listParam))
  } else {
    param <- ""
  }

  url <- paste0(protocol, "://", host, ":", port, route, param)

  return(url)
}



#' Fetch json data from API
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @param asDataFrame {Logical} Return a data.frame
#' @return Data {List}
#'
mxApiFetch <- function(route, listParam = NULL, asDataFrame = FALSE, debug = FALSE) {
  data <- list()
  mxCatch("Api Fetch", {
    url <- mxApiUrl(route, listParam)

    if (isTRUE(debug)) {
      diff <- mxTimeDiff(sprintf("API FETCH %s", route))
    }

    response <- curl_fetch_memory(url)
    strData <- rawToChar(response$content)

    if (isTRUE(debug)) {
      mxTimeDiff(diff)
    }

    if (isEmpty(strData)) {
      warning("API fetch, empty data for", route, listParam)
      return(data)
    }

    #
    # ⚠️   default is `simplifyVector=TRUE` : 
    #     - arrays will be converted as vector. 
    #     - ["a"] in DB -> character("a") in R -> "a" in DB after save 
    #       with auto_unbox=TRUE 
    #    If simplifyVector=FALSE : 
    #     - ["a"] in DB -> list("a") in R -> "a" in DB 
    #     - but then ALL vector operations in R are no more possible. 
    # 
    data <- fromJSON(strData, simplifyDataFrame = asDataFrame)


    if (isNotEmpty(data) && isTRUE(data$type == "error")) {
      stop(data$message)
    }
  })
  return(data)
}



#' Get URL query param from a list
#'
#' @param data {List} List of param
#' @return {Character} Character string with url param.
#'
mxListToQueryStringParam <- function(data) {
  str <- ""
  enc <- htmltools::urlEncodePath
  for (i in 1:length(data)) {
    n <- names(data[i])
    v <- data[[i]]
    str <- str + n + "=" + enc(paste(v, collapse = ",")) + "&"
  }
  str
}


#' CURL wrapper for mapx api post request
#'
#' @param route {Character} route. E.g. '/post/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return Data {List}
#'
mxApiPost <- function(route, listParam) {
  out <- list()
  tryCatch(
    {
      data <- toJSON(listParam, auto_unbox = T)
      host <- .get(config, c("api", "host"))
      port <- .get(config, c("api", "port"))
      url <- "http://" + host + ":" + port + route
      h <- new_handle(copypostfields = data)

      handle_setheaders(h,
        "Content-Type" = "application/json",
        "Cache-Control" = "no-cache",
        "Host" = host
      )

      req <- curl_fetch_memory(url, handle = h)
      cnt <- rawToChar(req$content)

      if (jsonlite:::validate(cnt)) {
        out <- fromJSON(cnt)
      } else {
        out <- list(msg = cnt)
      }
      out$status = req$status
    },
    error = function(e) {
      mxKillProcess(sprintf("mxApiFetch: api issue, shut down. Details: %s", e$message))
    }
  )

  return(out)
}


#' Get all public views.
# @note : probably better to use mxApiGetViews with includeAllPublic
#'
#'
mxApiGetViewsAllPublicProject <- function(
  idUser,
  idProject,
  idProjectExclude,
  filterViewsByRoleMax,
  token,
  language = c("en"),
  types = c("vt", "cc", "rt"),
  keys = c("id")
) {
  route <- .get(config, c("api", "routes", "getViewsListGlobalPublic"))
  res <- mxApiFetch(route, list(
    idUser = idUser,
    idProject = idProject,
    idProjectExclude = idProjectExclude,
    filterViewsByRoleMax = filterViewsByRoleMax, ,
    token = token,
    language = language,
    selectKeys = keys,
    types = c("vt", "cc", "rt")
  ))

  return(res$views)
}

#' Get views
#'
mxApiGetViews <- function(
  idUser = NULL,
  idViews = NULL,
  idProject = .get(config, c("project", "default")),
  token = "",
  collections = NULL,
  collectionsSelectOperator = "ANY",
  filterViewsByRoleMax,
  keys = "*",
  types = c("vt", "sm", "cc", "rt"),
  includeAllPublic = FALSE,
  language = "en"
) {
  route <- .get(config, c("api", "routes", "getViewsListByProject"))
  res <- mxApiFetch(route, list(
    token = token,
    idProject = idProject,
    idUser = idUser,
    selectKeys = keys,
    idViews = idViews,
    language = language,
    includeAllPublic = includeAllPublic,
    collections = collections,
    collectionsSelectOperator = collectionsSelectOperator,
    types = types
  ))
  return(res$views)
}




#' Get table of layer for one project, for given role or userid
#' @export
mxApiGetSourceTable <- function(
  idProject,
  idUser,
  language = "en",
  idSources = list(),
  types = c("vector", "raster", "tabular", "join"),
  editable = FALSE,
  readable = FALSE,
  add_global = FALSE,
  token = NULL,
  add_views = FALSE,
  exclude_empty_join = FALSE
) {
  params <- list(
    idProject = idProject,
    idUser = idUser,
    language = language,
    idSources = idSources,
    types = types,
    editable = editable,
    readable = readable,
    add_global = add_global,
    token = token,
    add_views = add_views,
    exclude_empty_join = exclude_empty_join
  )

  data <- mxApiFetch("/get/sources/list/user", params, asDataFrame = TRUE)

  return(data)
}

#' Get source summary.
#' @export
mxApiGetSourceSummary <- function(
  idView = NULL,
  timestamp = NULL,
  idSource = NULL,
  idAttr = NULL,
  useCache = TRUE,
  binsMethod = "jenks",
  binsNumber = 5,
  maxRowsCount = 1e6,
  stats = list(),
  nullValue = NULL
) {
  params <- mget(ls())
  route <- .get(config, c("api", "routes", "getSourceSummary"))
  data <- mxApiFetch(route, params, debug = TRUE)
  return(data)
}
#' Get layer geom types
#' @param table {character} Layer name
#' @param geomColumn {character} Geometry column name
#' @export
mxApiGetSourceSummaryGeom <- function(table) {
  sourceSummary <- mxApiGetSourceSummary(
    idSource = table,
    stats = list("geom"),
    useCache = FALSE # debug only
  )
  types <- list(type = character(0), count = numeric(0))
  typesDf <- as.data.frame(types)
  geomList <- .get(sourceSummary, c("geom_type_table"), types)

  for (item in geomList) {
    typesDf <- rbind(typesDf, as.data.frame(item))
  }

  names(typesDf) <- c("geom_type", "count")

  return(typesDf)
}
