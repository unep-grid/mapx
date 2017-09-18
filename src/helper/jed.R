

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

  mxDebugMsg(id);


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
        type="number",
        id=sprintf("%s_init",id),
        class="form-control mx-hide",
        value=runif(1)
        )
      ))
}



#' @rdname jed-shiny
#' @export 
jedGetValues <- function(id=NULL,session=shiny::getDefaultReactiveDomain()){
    session$input[[sprintf("%s_values",id)]]
}
#' @rdname jed-shiny
#' @export 
jedGetIssues <- function(id=NULL,session=shiny::getDefaultReactiveDomain()){
    session$input[[sprintf("%s_issues",id)]]
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
