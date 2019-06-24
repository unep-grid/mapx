
#' Fetch json data from API
#'
#' @param route {Character} route. E.g. '/get/views'
#' @param listParam {List} Query param. E.g. list(idUser=1,idProject="MX-TEST")
#' @return Data {List}
#'
mxApiFetch <- function(route,listParam){
  data <- list()

  tryCatch({
    host <-  .get(config,c("api","host")) 
    port <- .get(config,c("api","port"))
    param <- mxListToQueryStringParam(listParam)
    url <- "http://" + host + ":" + port + route + '?' + param
    data <- fromJSON(url,simplifyDataFrame=FALSE)
    if(!noDataCheck(data) && data$type == "error" ){
      stop("no Data")
    }
  },
  error = function(cond){ data <- list()}
  )

  return(data)

}



#' Get URL query param from a list
#'
#' @param data {List} List of param
#' @return {Character} Character string with url param. 
#'
mxListToQueryStringParam <- function(data){
  str <- ""
  for(i in 1:length(data)){
    n <- names(data[i])
    v <- data[[i]]
    str <- str + n + '=' + v + '&'
  }

  str
}
