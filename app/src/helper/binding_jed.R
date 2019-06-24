

#' Shiny bindings for jed
#'
#' Output and render functions for using jed within Shiny  applications and interactive Rmd documents.
#'
#' @param id Id of the editor element
#' @param schema List containing the shcema
#' @param options Options for json editor
#'
#' @name jed-shiny
jedSchema <- function(id, schema, startVal = list(), options = list(), session=shiny::getDefaultReactiveDomain()){
  session$sendCustomMessage(
    type="jedInit",
    list(
      id = id ,
      schema = schema,
      startVal = startVal,
      options = options
      )
    )
}

#' @rdname jed-shiny
#'
#' @export
jedOutput <- function(id){

  session = shiny:::getDefaultReactiveDomain()

  return(
    tags$div(class="jed-container",
      tags$div(id=id,tags$span("Loading schema...")),
      tags$input(
        type="text",
        id=sprintf("%s_init",id),
        class="form-control mx-hide",
        value=runif(1)
        )
      ))
}


#' @rdname jed-shiny
#' @export
jedRemoveDraft <- function(id,idItem,session=shiny::getDefaultReactiveDomain()){
  session$sendCustomMessage(
    type="jedRemoveDraft",
    list(
      id = id,
      idItem = idItem
      )
    )
}

#' @rdname jed-shiny
#' @export 
jedTriggerGetValues <- function(id=NULL,idEvent="info",session=shiny::getDefaultReactiveDomain()){
  session$sendCustomMessage(
    type="jedTriggerGetValues",
    list(
      id = id,
      idEvent = idEvent
      )
    )
}

#' @rdname jed-shiny
#' @export 
jedTriggerGetValidation <- function(id=NULL,idEvent="info",session=shiny::getDefaultReactiveDomain()){
  session$sendCustomMessage(
    type="jedTriggerGetValidation",
    list(
      id = id,
      idEvent = idEvent
      )
    )
}

#' @rdname jed-shiny
#' @export 
jedUpdate <- function(id = NULL, values = list(), session=shiny::getDefaultReactiveDomain() ){

  session$sendCustomMessage(
    type="jedUpdate",
    list(
      id = id,
      val = values 
      )
    )

}
