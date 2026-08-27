library(testthat)

source(testthat::test_path(
  "..",
  "..",
  "src",
  "r",
  "helpers",
  "binding_source_browser.R"
))
source(testthat::test_path(
  "..",
  "..",
  "src",
  "r",
  "helpers",
  "binding_mx.R"
))

test_that("mxSourcePickerInput creates a configured custom element", {
  picker <- mxSourcePickerInput(
    inputId = "sourceMain",
    label = "Main source",
    value = "mx_vector_a_b_c_d_e",
    options = list(acceptedTypes = c("vector", "join")),
    excludeInputId = "sourceMask"
  )
  config <- jsonlite::fromJSON(picker$attribs[["data-config"]])

  expect_equal(picker$name, "mx-source-picker")
  expect_equal(picker$attribs$id, "sourceMain")
  expect_equal(picker$attribs[["data-shiny-input"]], "sourceMain")
  expect_equal(picker$attribs[["data-exclude-source-input"]], "sourceMask")
  expect_equal(config$label, "Main source")
  expect_equal(config$value, "mx_vector_a_b_c_d_e")
  expect_equal(config$acceptedTypes, c("vector", "join"))
})

test_that("mxSourcePickerInput rejects invalid interface values", {
  expect_error(
    mxSourcePickerInput("", "Source"),
    "`inputId` must be a non-empty character scalar",
    fixed = TRUE
  )
  expect_error(
    mxSourcePickerInput("source", "Source", options = "vector"),
    "`options` must be a list",
    fixed = TRUE
  )
})

test_that("source metadata edit requests are distinct", {
  set.seed(1)
  first <- mxSourceMetadataEditRequest("mx_extern_a_b_c_d_e")
  second <- mxSourceMetadataEditRequest("mx_extern_a_b_c_d_e")

  expect_equal(first$idSource, "mx_extern_a_b_c_d_e")
  expect_equal(second$idSource, first$idSource)
  expect_false(identical(second$update, first$update))
})

test_that("source picker refresh sends a targeted presentation update", {
  messages <- list()
  session <- list(
    sendCustomMessage = function(type, message) {
      messages[[type]] <<- message
    }
  )

  mxSourcePickerRefresh("mx_extern_a_b_c_d_e", session = session)

  expect_equal(
    messages[["mx-source-picker-refresh"]],
    list(idSource = "mx_extern_a_b_c_d_e")
  )
})

test_that("source edit picker preserves a single accepted type as an array", {
  messages <- list()
  session <- list(
    sendCustomMessage = function(type, message) {
      messages[[type]] <<- message
    }
  )

  mxShowSelectSourceEdit(
    id = "selectSourceLayerForManage",
    acceptedTypes = "vector",
    update = 42,
    session = session
  )

  expect_equal(
    messages[["mxShowSelectSourceEdit"]],
    list(
      update = 42,
      id = "selectSourceLayerForManage",
      acceptedTypes = list("vector")
    )
  )
})
