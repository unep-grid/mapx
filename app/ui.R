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

route_request <- function(http_method, path_info, protocol) {
  # Redirect images
  if (grepl("^/userdata/", path_info)) {
    new_path <- mxApiUrl(path_info, NULL, public = TRUE, protocol)
    return(httpResponse(
      status = 301L,
      headers = list("Location" = new_path),
      content_type = "text/plain",
      content = paste0("Redirecting to ", new_path)
    ))
  }

  # Main app
  if (http_method == "GET" && path_info == "/") {
    return(htmlTemplate("./www/index.html"))
  }

  # Static app - no session
  if (http_method == "GET" && path_info == "/static.html") {
    return(htmlTemplate("./www/static.html"))
  }

  # Health check
  if (http_method == "GET" && path_info == "/health") {
    return(healthCheck())
  }

  # Fall through: path not found
  return(httpResponse(
    status = 404L,
    content_type = "text/plain",
    content = "Not Found"
  ))
}

ui <- function(req) {
  http_method <- req$REQUEST_METHOD
  path_info <- req$PATH_INFO
  protocol <- req$HTTP_X_FORWARDED_PROTO
  response <- route_request(http_method, path_info, protocol)

  return(response)
}
attr(ui, "http_methods_supported") <- c("GET", "POST")
