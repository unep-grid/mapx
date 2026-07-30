library(testthat)

source(testthat::test_path(
  "..",
  "..",
  "src",
  "r",
  "helpers",
  "source_selection.R"
))

validSummary <- list(
  layerName = "mx_vector_a_b_c_d_e",
  variableName = "population",
  variableType = "number",
  geomType = "polygons"
)

test_that("a complete matching source summary is accepted", {
  expect_true(mxSourceSummaryIsValid(
    sourceData = validSummary,
    layer = "mx_vector_a_b_c_d_e",
    attribute = "population",
    geomType = "polygons"
  ))
})

test_that("empty, incomplete, or stale source summaries are rejected", {
  expect_false(mxSourceSummaryIsValid(
    list(),
    "mx_vector_a_b_c_d_e",
    "population",
    "polygons"
  ))
  expect_false(mxSourceSummaryIsValid(
    within(validSummary, layerName <- "mx_vector_f_g_h_i_j"),
    "mx_vector_a_b_c_d_e",
    "population",
    "polygons"
  ))
  expect_false(mxSourceSummaryIsValid(
    within(validSummary, variableType <- NULL),
    "mx_vector_a_b_c_d_e",
    "population",
    "polygons"
  ))
  expect_false(mxSourceSummaryIsValid(
    within(validSummary, geomType <- "empty"),
    "mx_vector_a_b_c_d_e",
    "population",
    "empty"
  ))
})

test_that("mask summaries are required only when the mask is enabled", {
  expect_true(mxSourceMaskSummaryIsValid(list(), NULL, FALSE))
  expect_true(mxSourceMaskSummaryIsValid(
    list(layerMaskName = "mx_vector_f_g_h_i_j"),
    "mx_vector_f_g_h_i_j",
    TRUE
  ))
  expect_false(mxSourceMaskSummaryIsValid(
    list(),
    "mx_vector_f_g_h_i_j",
    TRUE
  ))
  expect_false(mxSourceMaskSummaryIsValid(
    list(layerMaskName = "mx_vector_k_l_m_n_o"),
    "mx_vector_f_g_h_i_j",
    TRUE
  ))
})
