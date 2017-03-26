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
  
  shiny::addResourcePath("jed",system.file("www", package="jed"))

  tagList(
  singleton(
    tagList(
      tags$head(
        tags$script(src = "jed/jsoneditor/jsoneditor.min.js"),
        tags$script(src = "jed/jed/jed.js"),
        tags$script(src = "jed/medium/medium-editor.min.js"),
        tags$script(src = "jed/jed/jed-medium-file-dragging.js"),
        tags$link(rel="stylesheet",type="text/css",href="jed/jed/jed.css"),
        tags$link(rel="stylesheet",type="text/css",href="jed/medium/medium-editor.min.css"),
        tags$link(rel="stylesheet",type="text/css",href="jed/jed/jed-medium-flat.css")
        )
      )
    ),
  tags$div(class="jed-container",
    tags$div(id=id),
    tags$input(
      type="number",
      id=sprintf("%s_init",id),
      class="form-control mx-hide",
      value=runif(1)
      )
    )
  )
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
