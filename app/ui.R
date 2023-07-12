ui <- function(req) {

  if (identical(req$REQUEST_METHOD, "GET") && identical(req$PATH_INFO, "/")) {
    return(htmlTemplate("./www/index.html"))
  }

  if (identical(req$REQUEST_METHOD, "POST") && identical(req$PATH_INFO, "/health")) {
    ok <- mxDbPoolIsValid()

    httpResponse(
      status = ifelse(ok, 200L, 500L),
      content_type = "application/json",
      content = sprintf('{"status": "%s"}', ifelse(ok, "ok", "error"))
    )
  }
}
attr(ui, "http_methods_supported") <- c("GET", "POST")
