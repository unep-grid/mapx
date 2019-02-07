

#' Build WMS generator client side 
#' 
#' @param options {List} list of options for the handler: selectorTileInput, selectorLegendInput, selectorMetaInput, sercices;
#' @return null
#'
mxWmsBuildQueryUi <- function( options = list(), session=shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxWmsBuildQueryUi",options);
}
