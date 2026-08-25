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
    data <- fromJSON(strData,
      simplifyDataFrame = asDataFrame,
      simplifyVector = FALSE 
    )

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
#' @param shutdownOnError {Logical} Preserve the legacy behavior of stopping
#'   the Shiny process when the API transport is unavailable.
#' @return Data {List}
#'
mxApiPost <- function(route, listParam, shutdownOnError = TRUE) {
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
      out$status <- req$status
    },
    error = function(e) {
      message <- sprintf("mxApiPost: API issue. Details: %s", e$message)
      if (isTRUE(shutdownOnError)) {
        mxKillProcess(message)
      } else {
        stop(message)
      }
    }
  )

  return(out)
}


#' Apply an authenticated source revision through the MapX API.
#'
#' @param method One of metadata, settings, or delete.
#' @param idSource Source identifier.
#' @param changes Method-specific values.
#' @param idUser Authenticated user identifier.
#' @param token Authenticated user token.
#' @return Successful API response.
mxApiReviseSource <- function(method, idSource, changes, idUser, token) {
  route <- .get(config, c("api", "routes", "postSourceRevise"))
  result <- mxApiPost(
    route = route,
    listParam = list(
      method = method,
      idSource = idSource,
      changes = changes,
      idUser = idUser,
      token = token
    ),
    shutdownOnError = FALSE
  )

  status <- .get(result, "status", 0)
  if (status < 200 || status >= 300 || !isTRUE(result$ok)) {
    message <- .get(
      result,
      "message",
      .get(result, "error", "Source revision failed")
    )
    stop(message)
  }

  result
}

#' Create an RT/CC view and its metadata-only source atomically.
mxApiCreateExternalMetadataView <- function(
  idProject,
  idUser,
  token,
  viewType,
  title,
  language
) {
  route <- .get(
    config,
    c("api", "routes", "postExternalMetadataViewCreate")
  )
  result <- mxApiPost(
    route = route,
    listParam = list(
      idProject = idProject,
      idUser = idUser,
      token = token,
      viewType = viewType,
      title = title,
      language = language
    ),
    shutdownOnError = FALSE
  )
  status <- .get(result, "status", 0)
  if (status < 200 || status >= 300 || !isTRUE(result$ok)) {
    stop(.get(result, "message", "External metadata view creation failed"))
  }
  result$view
}

#' Delete a view and any unshared dedicated external metadata through the API.
mxApiDeleteView <- function(idProject, idUser, token, idView) {
  route <- .get(config, c("api", "routes", "postViewDelete"))
  result <- mxApiPost(
    route = route,
    listParam = list(
      idProject = idProject,
      idUser = idUser,
      token = token,
      idView = idView
    ),
    shutdownOnError = FALSE
  )
  status <- .get(result, "status", 0)
  if (status < 200 || status >= 300 || !isTRUE(result$ok)) {
    stop(.get(result, "message", "View deletion failed"))
  }
  result
}

#' Validate an optional external metadata selection through the API.
mxApiValidateExternalMetadataSelection <- function(
  idProject,
  idUser,
  idSource = NULL,
  idView = NULL,
  token = NULL
) {
  if (isEmpty(idSource)) {
    return(TRUE)
  }
  route <- .get(
    config,
    c("api", "routes", "getExternalMetadataSelectionValidate")
  )
  result <- mxApiFetch(route, list(
    idProject = idProject,
    idUser = idUser,
    idSource = idSource,
    idView = idView,
    token = token
  ))
  isTRUE(result$valid)
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

#' Validate a small vector source selection against API-side session roles.
#' @export
mxApiValidateSourceSelection <- function(
  idProject,
  idUser,
  idSources,
  idView = NULL,
  token = NULL
) {
  result <- mxApiFetch("/get/sources/selection/validate", list(
    idProject = idProject,
    idUser = idUser,
    idSources = idSources,
    idView = idView,
    token = token
  ))
  return(isTRUE(result$valid))
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
