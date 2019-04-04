

#' Update epsg code input with handler for epsg.io API 
#' 
#' @param selector {Character} Id or Selector . Example  "#myInput"
#' @param options {List} list of options for the handler. Keys : txtLabelInput, txtSearchPlaceholder, txtButtonSearch
#' @return null
#'
mxEpsgBuildSearchBox <- function( selector, options = list(), session=shiny::getDefaultReactiveDomain()) {
  options$selector <- selector 
  session$sendCustomMessage("mxEpsgBuildSearchBox",options)
}


