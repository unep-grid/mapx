healthCheck <- function() {
  now <- Sys.time()
  ok <- mxDbPoolIsValid()
  timing <- Sys.time() - now
  httpResponse(
    status = ifelse(ok, 200L, 500L),
    content_type = "application/json",
    content = sprintf(
      '{"status": "%1$s", "timing": %2$.3f}',
      ifelse(ok, "ok", "error"),
      timing
    )
  )
}

ui <- function(req) {
  http_method <- req$REQUEST_METHOD
  path_info <- req$PATH_INFO

  response <- switch(http_method,
    GET = switch(path_info,
      #
      # Main app
      #
      "/" = htmlTemplate("./www/index.html"),
      #
      # Static app - no session
      #
      "/static.html" = htmlTemplate("./www/static.html"),
      #
      # Health check
      #
      "/health" = healthCheck(),
      NULL
    ),
    #
    # POST method could be added here
    #
    NULL
  )

  return(response)
}
attr(ui, "http_methods_supported") <- c("GET", "POST")
