#' Build API URL
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return {Character} API URL
#'
mxApiUrl <- function(route, listParam = NULL, public = FALSE, protocol = "http") {
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
mxApiFetch <- function(route, listParam = NULL, asDataFrame = FALSE) {
  data <- list()
  mxCatch("Api Fetch", {
    url <- mxApiUrl(route, listParam)
    data <- fromJSON(url, simplifyDataFrame = asDataFrame)

    if (isTRUE(!noDataCheck(data)) && isTRUE(data$type == "error")) {
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
    },
    error = function(e) {
      mxKillProcess(sprintf("mxApiFetch: api issue, shut down. Details: %s", e$message))
    }
  )

  return(out)
}

mxApiGetViewsAllPublicProject <- function(
  idUser,
  idProject,
  idProjectExclude,
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
    token = token,
    language = language,
    selectKeys = keys,
    types = c("vt", "cc", "rt")
  ))

  return(res$views)
}


mxApiGetViews <- function(
  idUser = NULL,
  idViews = NULL,
  idProject = .get(config, c("project", "default")),
  token = "",
  collections = NULL,
  collectionsSelectOperator = "ANY",
  keys = "*",
  types = c("vt", "sm", "cc", "rt"),
  allProjects = FALSE,
  allReaders = FALSE,
  rolesInProject = list(public = T, member = F, publisher = F, admin = F),
  filterViewsByRoleMax = "admin",
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
    collections = collections,
    types = types
  ))
  return(res$views)
}

mxApiGetSourceSummary <- function(
  idView = NULL,
  idSource = NULL,
  idAttr = NULL
) {
  route <- .get(config, c("api", "routes", "getSourceSummary"))
  res <- mxApiFetch(route, list(
    idSource = idSource,
    idView = idView,
    idAttr = idAttr
  ))
  return(res)
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
  add_views = FALSE
) {
  config <- list(
    idProject = idProject,
    idUser = idUser,
    language = language,
    idSources = idSources,
    types = types,
    editable = editable,
    readable = readable,
    add_global = add_global,
    token = token,
    add_views = add_views
  )

  data <- mxApiFetch("/get/sources/list/user", config, asDataFrame = TRUE)
  
  return(data)
}
