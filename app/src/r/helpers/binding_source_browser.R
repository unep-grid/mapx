#' Create a source picker input
#'
#' The picker is a Web Component. Its JavaScript compatibility bridge forwards
#' typed change events to Shiny under `inputId`.
#'
#' @param inputId Shiny input identifier.
#' @param label Field label.
#' @param value Initially selected source identifier(s).
#' @param options Source browser configuration.
#' @param excludeInputId Optional picker input whose selection must be excluded.
#' @return An `htmltools` tag.
#' @export
mxSourcePickerInput <- function(
  inputId,
  label,
  value = NULL,
  options = list(),
  excludeInputId = NULL
) {
  validateId <- function(value, name) {
    if (
      !is.character(value) ||
        length(value) != 1 ||
        is.na(value) ||
        !nzchar(value)
    ) {
      stop(sprintf("`%s` must be a non-empty character scalar", name))
    }
  }

  validateId(inputId, "inputId")
  if (!is.null(excludeInputId)) {
    validateId(excludeInputId, "excludeInputId")
  }
  if (!is.list(options)) {
    stop("`options` must be a list")
  }

  config <- utils::modifyList(
    options,
    list(value = value, label = label),
    keep.null = TRUE
  )
  attributes <- list(
    id = inputId,
    `data-shiny-input` = inputId,
    `data-config` = jsonlite::toJSON(
      config,
      auto_unbox = TRUE,
      null = "null"
    )
  )
  if (!is.null(excludeInputId)) {
    attributes[["data-exclude-source-input"]] <- excludeInputId
  }

  htmltools::tag("mx-source-picker", attributes)
}
