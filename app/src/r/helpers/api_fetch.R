
#' Fetch json data from API
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return Data {List}
#'
mxApiFetch <- function(route,listParam){
  data <- list()

  host <-  .get(config,c("api","host")) 
  port <- .get(config,c("api","port"))
  param <- mxListToQueryStringParam(listParam)
  url <- "http://" + host + ":" + port + route + '?' + param
  data <- fromJSON(url,simplifyDataFrame=FALSE)
  if(isTRUE(!noDataCheck(data)) && isTRUE(data$type == "error")){
    stop(data$msg)
  }

  return(data)

}



#' Get URL query param from a list
#'
#' @param data {List} List of param
#' @return {Character} Character string with url param. 
#'
mxListToQueryStringParam <- function(data){
  str <- ""
  enc = htmltools::urlEncodePath;
  for(i in 1:length(data)){
    n <- names(data[i])
    v <- data[[i]]
    str <- str + n + '=' + enc(paste(v,collapse=',')) + '&'
  }

  str
}


#' CURL wrapper for mapx api post request
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return Data {List}
#'
mxApiPost <- function(route,listParam){
  out <- list()
  data <- toJSON(listParam,auto_unbox=T)
  host <-  .get(config,c("api","host")) 
  port <- .get(config,c("api","port"))
  url <- "http://" + host + ":" + port + route
  h <- new_handle(copypostfields = data)

  handle_setheaders(h,
    "Content-Type" = "application/json",
    "Cache-Control" = "no-cache",
    "Host" = host 
    )

  req <- curl_fetch_memory(url, handle = h)

  out <- fromJSON(rawToChar(req$content))

  return(out)

}

mxApiGetViewsAllPublicProject <- function(
  idUser,
  idProject, 
  idProjectExclude,
  token,
  language = c('en'),
  types = c('vt','cc','rt'),
  keys = c("id")
  ){

  route <- .get(config,c('api','routes','getViewsListGlobalPublic'))
  res <- mxApiFetch(route,list(
      idUser = idUser,
      idProject = idProject,
      idProjectExclude = idProjectExclude,
      token = token,
      language = language,
      selectKeys = keys,
      types = c('vt','cc','rt')
      ))

  return(res$views)

}


mxApiGetViews <-  function(
  idUser = NULL,
  idViews = NULL,
  idProject = .get(config,c("project","default")),
  token = "",
  collections = NULL, 
  collectionsSelectOperator = "ANY",
  keys = '*',
  types = c('vt','sm','cc','rt'),
  allProjects = FALSE,
  allReaders = FALSE,
  rolesInProject = list( public = T, member = F,publisher = F, admin = F), 
  filterViewsByRoleMax = "admin",
  language = "en"
  ){
  route <- .get(config,c('api','routes','getViewsListByProject'))
  res <- mxApiFetch(route,list(
      token = token,
      idProject = idProject,
      idUser = idUser,
      selectKeys = keys,
      idViews = idViews,
      collections = collections,
      types = types
      )
    )

  return(res$views)
}



