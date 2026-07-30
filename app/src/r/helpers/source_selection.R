#' Validate the vector source summary produced by the R compatibility layer.
#'
#' @param sourceData Summary returned by reactLayerSummary.
#' @param layer Selected source identifier.
#' @param attribute Selected source attribute.
#' @param geomType Selected geometry type.
#' @return A single logical value.
#' @export
mxSourceSummaryIsValid <- function(
  sourceData,
  layer,
  attribute,
  geomType
) {
  if (!is.list(sourceData)) {
    return(FALSE)
  }

  variableType <- sourceData[["variableType"]]

  isTRUE(
    identical(sourceData[["layerName"]], layer) &&
      identical(sourceData[["variableName"]], attribute) &&
      identical(sourceData[["geomType"]], geomType) &&
      is.character(variableType) &&
      length(variableType) == 1 &&
      !is.na(variableType) &&
      nzchar(variableType) &&
      is.character(geomType) &&
      length(geomType) == 1 &&
      !is.na(geomType) &&
      nzchar(geomType) &&
      !identical(geomType, "empty")
  )
}

#' Validate the optional vector mask summary.
#'
#' @param sourceDataMask Summary returned by reactLayerMaskSummary.
#' @param layerMask Selected mask source identifier.
#' @param useMask Whether the mask is enabled.
#' @return A single logical value.
#' @export
mxSourceMaskSummaryIsValid <- function(
  sourceDataMask,
  layerMask,
  useMask
) {
  if (!isTRUE(useMask)) {
    return(TRUE)
  }

  isTRUE(
    is.list(sourceDataMask) &&
      is.character(layerMask) &&
      length(layerMask) == 1 &&
      !is.na(layerMask) &&
      nzchar(layerMask) &&
      identical(sourceDataMask[["layerMaskName"]], layerMask)
  )
}
