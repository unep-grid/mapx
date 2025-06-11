#' Create PostgreSQL-compatible JSON from R list
#'
#' Converts an R list to a JSON string that can be safely stored in PostgreSQL
#' by removing problematic control characters that may cause database issues.
#'
#' @param listInput A list object to convert to PostgreSQL-compatible JSON
#' @return A character string containing sanitized JSON suitable for database storage
#' @details
#' This function performs the following operations:
#' \itemize{
#'   \item Removes names from unnamed lists to prevent empty object notation
#'   \item Converts list to JSON with auto-unboxing enabled
#'   \item Strips control characters (ASCII 1-8, 11-12, 14-31, 127) that can cause PostgreSQL issues
#'   \item Replaces problematic characters with spaces
#' }
#' @examples
#' # Basic usage
#' my_list <- list(name = "John", age = 30, active = TRUE)
#' json_string <- mxToJsonForDbParam(my_list)
#'
#' # With unnamed list
#' unnamed_list <- list("apple", "banana", "cherry")
#' json_array <- mxToJsonForDbParam(unnamed_list)
#' @export
mxToJsonForDbParam <- function(listInput) {
  if (isEmpty(names(listInput))) {
    #
    # Force names = null to avoid names = character(0),
    # which translate in '{}' with toJSON
    #
    names(listInput) <- NULL
  }
  jsonlite::toJSON(listInput, auto_unbox = TRUE, simplifyVector = FALSE) %>%
    gsub("[\x09\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", .) %>%
    as.character()
}

#' Encrypt or decrypt data using postgres pg_sym_encrypt
#'
#'
#'
#' @param data vector, list or data.frame to encrypt or decrypt
#' @param ungroup boolean : ungroup the data and apply the encryption on individual item.
#' @param key Encryption key
#' @return encrypted data as list
#' @export
mxDbEncrypt <- function(data, ungroup = FALSE, key = NULL) {
  if (is.null(key)) {
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  if (any(c("list", "json") %in% class(data))) {
    if (ungroup) {
      data <- sapply(data, mxToJsonForDbParam)
    } else {
      data <- mxToJsonForDbParam(data)
    }
  }

  q <- "SELECT mx_encrypt($1, $2) as encrypted"

  res <- mxDbGetQuery(q, params = list(data, key))

  return(res$encrypted)
}



mxDbDecrypt <- function(data = NULL, key = NULL) {
  if (is.null(key)) {
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  out <- NULL

  tryCatch(
    {
      if (is.null(data) ||
        !all(sapply(data, length) > 0) ||
        !all(sapply(data, is.character)) ||
        # hex chain
        !all(sapply(data, nchar) %% 2 == 0)) {
        return(out)
      }

      q <- "SELECT mx_decrypt($1, $2) as decrypted"
      res <- mxDbGetQuery(q, params = list(data, key))

      value <- res$decrypted

      isJSON <- jsonlite::validate(value)

      if (!isJSON) {
        return(value)
      }

      return(fromJSON(value, simplifyVector = TRUE))
    },
    error = function(e) {
      mxDebugMsg(sprintf("Failed to decrypt value. Additional message: %s", e$message))
    }
  )

  return(out)
}
