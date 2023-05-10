#
# Context specific reactive values
#
reactUser <- reactiveValues()
reactData <- reactiveValues()
reactChain <- reactiveValues()


#' Reactive callback chaining technique
#'
#' @param id {Character} ReactData item id. eg. reactData[[showProjectsList]]
#' @param message {Character} Message to pass
#' @param type {Character} Type of callback, used to identify a specific action
#' @param callback {Function} Callback to call
#' @param data {List} Additinal data (list)
#' @param value {Character} Additional value
reactChainCallback <- function(id, message = "", type = "", callback = NULL, data = list(), value = NULL) {
  config <- list(
    time = Sys.time(),
    message = message,
    data = data,
    type = type,
    callback = callback,
    value = value
  )
  class(config) <- "react_chain_callback"

  reactChain[[id]] <- config
}

#' Reactive callback chain handler
#'
#' @param data {List} Input config list
#' @param expr {Expression} Handler
reactChainCallbackHandler <- function(data, type, expr) {

  stopifnot(class(data) == "react_chain_callback")
  if (data$type != type) {
    return()
  }
  eval(
    expr,
    envir = parent.frame()
  )
}
