#' Validate date
#'
#' @param {Date|string} d Date to test
#' @return {Logical}
mxIsDate <- function(d) {
  valid <- TRUE
  tryCatch(as.Date(d), error = function(e) {
    valid <<- FALSE
  })
  return(valid)
}


#' Force quit the app
#' -> last resort solution in case of failing db con.
#' -> same bahaviour as node.js api
#'
#' @param {Character} msg Message to print
#'
mxKillProcess <- function(msg) {
  #
  # Aggressive quit
  # stop() can be intercepted
  # quit() doesn't seem to work within shiny context
  #
  mxDebugMsg(msg)
  system(sprintf("kill %s", Sys.getpid()))
}


#' Clean role from query with partial match
#' @param {Character} role Role name
#' @return {Character} matched role or "any"
mxQueryRoleParser <- function(role = "any", default = NULL) {
  out <- default
  if (isNotEmpty(role)) {
    role <- tolower(role)
    roles <- c("publisher", "admin", "member", "public")
    roleMatch <- roles[pmatch(role, roles)]
    if (isNotEmpty(roleMatch)) out <- roleMatch
  }
  return(out)
}

#' Clean title from query with partial match
#' @param {Character} role Role name
#' @return {Character} matched role or "any"
mxQueryTitleParser <- function(title = "", default = NULL) {
  out <- default
  if (isNotEmpty(title)) {
    out <- title
  }
  return(out)
}

#' Check if user id is in the root group
#' @param {Integer} idUser user id
#' @return {Logical} is root
mxIsUserRoot <- function(idUser) {
  return(idUser %in% .get(config, c("root_mode", "members")))
}

#' Check if user id is in the dev group
#' @param {Integer} idUser user id
#' @return {Logical} is dev
mxIsUserDev <- function(idUser) {
  return(idUser %in% .get(config, c("dev", "members")))
}

#' Is a source ok to be edited ?
#'
#' @param {Character} idSource  Source id
#' @return {Logical}
mxIsValidSourceEdit <- function(idSource) {
  maxRows <- 1e5 # Should match client + api server
  maxCols <- 200 # Shoudl match client + api server

  if (!mxDbExistsTable(idSource)) {
    return(FALSE)
  }
  dim <- mxDbGetLayerDimensions(idSource)
  valid <- dim$nrow <= maxRows && dim$ncol <= maxCols
  return(valid)
}




#' Add or update views from story steps to view dependencies
#' @param {List} story list
#' @param {List} view list
#' @param {List} views compact list
mxUpdateStoryViews <- function(story, view, allViews) {
  #
  # Retrieve and store data for all views used in story.
  #
  views <- list()
  allViews <- unlist(allViews)

  #
  # All views id extracted from the story
  #
  viewsStory <- lapply(story$steps, function(s) {
    lapply(s$views, function(v) {
      v
    })
  })

  # Final view list
  viewsId <- unique(unlist(viewsStory))
  viewsId <- as.list(viewsId)

  # If there is at least on views used, get views object.
  if (isNotEmpty(viewsId)) {
    views <- unique(allViews[sapply(allViews, function(v) {
      v %in% viewsId
    })])
  }

  #
  # Save local views from story, if any
  #
  view <- .set(view, c("data", "views"), as.list(views))
  return(view)
}


#' Load external ui file value in shiny app
#'
#' Shortcut to load external shiny ui file
#'
#' @param files Path to the file(s)
#' @param base Path enclosing folder path. Default = "./"
#' @export
mxSource <- function(files = "", base = ".", env = .GlobalEnv) {
  if (length(files) > 1) {
    for (f in files) {
      file <- normalizePath(file.path(base, f))
      source(file, local = env)$value
    }
  } else {
    file <- normalizePath(file.path(base, files))
    source(file, local = env)$value
  }
}


##' Source additional server files
##' @param files Vector of files to source
##' @export
# mxSourceSrv <- function(files=NULL){

# conf <- mxGetDefaultConfig()
# if(isEmpty(files)) return;

# for(f in files){
# source(file.path(conf[["srvPath"]],f), local=parent.frame())
# }

# }




#' Get md5 of a file or R object
#' @param f File or Object
#' @return md5 sum
#' @export
mxMd5 <- function(f) {
  fileOk <- !"try-error" %in% class(try(file.exists(f), silent = T))
  if (fileOk) fileOk <- file.exists(f)
  digest::digest(f, serialize = TRUE, file = fileOk)
}

#' Deparse a list from a json file path
#' @param path {string} Path to the json file
#' @export
mxJsonToListSource <- function(path) {
  paste(deparse(mxJsonToList(path), control = NULL), collapse = "\n")
}



#' Simple counter
#' @param id Id of the counter
#' @param reset Boolean Should the function reset the counter ?
mxCounter <- function(id, reset = F) {
  if (!exists("mxCounters") || reset) {
    mxCounters <<- list()
  }
  if (!reset) {
    if (isEmpty(mxCounters[[id]])) {
      mxCounters[[id]] <<- 1
    } else {
      mxCounters[[id]] <<- mxCounters[[id]] + 1
    }
    mxCounters[[id]]
  }
}


#' Create multilingual object of input in json schema
#' @param format {Character} Schema input format
#' @param default {List} Default list
#' @param keyTitle {Character} Translation key of the title
#' @param titlePrefix {Character}
#' @param keyCounter {Character|Numeric} Id of the counter to set
#' @param propertyOrder {Numeric} If counter id is not provided, set the property order using this value
#' @param type {Character} Input type
#' @param collapsed {Boolean} Collapse state of the object
#' @param language {Character} Two letter code of language for labels
#' @param languages {Character} Vector of languages code
#' @param languagesRequired {Character} Vector of languages code where value isrequired
#' @param languagesHidden {Character} Vector of languages code where editor is hidden
#' @param languagesReadOnly {Character} Vector of languages code where editor is visible, but not editable
#' @param dict {Data.frame} Dictionarry to use
#' @param minLength {Integer} minimum length of the string
#' @param maxLength {Interger} maximum length of the string
#' @param strict {Boolean} If not strict (default) minLength is ignored for non-required language
#' @param options {List} List of option given to the json editor client side
mxSchemaMultiLingualInput <- function(
  format = NULL,
  default = list(),
  keyTitle = "",
  titlePrefix = "",
  keyCounter = "b",
  propertyOrder = 0,
  type = "string",
  collapsed = TRUE,
  language = "en",
  languages = .get(config, c("languages", "codes")),
  languagesRequired = c("en"),
  languagesHidden = c(),
  languagesReadOnly = c(),
  dict = NULL,
  minLength = 0,
  maxLength = 1e6,
  strict = FALSE,
  options = list()
) {
  if (isEmpty(language)) {
    language <- get("language", envir = parent.frame())
  }

  if (isEmpty(dict)) {
    dict <- dynGet("dict", ifnotfound = config$dict)
  }

  if (isEmpty(dict)) {
    dict <- config$dict
  }

  if (isEmpty(languagesHidden)) {
    languagesHidden <- languages[!languages %in% language]
  }

  if (nchar(titlePrefix) > 0) {
    titlePrefix <- paste(toupper(titlePrefix), ":")
  }

  prop <- lapply(languages, function(x) {
    required <- x %in% languagesRequired
    opt <- options
    #
    # Required ?
    #
    if (required) {
      minLength <- 1
    }
    #
    # Strict
    #
    if (!required && !strict) {
      minLength <- 0
    }
    #
    # Hidden ?
    #
    opt$readOnly <- isTRUE(x %in% languagesReadOnly)
    opt$hidden <- isTRUE(x %in% languagesHidden && !x %in% languagesRequired)

    #
    # Output entry
    #
    list(
      title = sprintf(
        "%1$s (%2$s%3$s)",
        d(keyTitle, lang = x, dict = dict, web = F),
        d(x, lang = language, dict = dict, web = F),
        ifelse(opt$readOnly, ", read only", "")
      ),
      type = type,
      format = format,
      options = opt,
      minLength = minLength,
      maxLength = maxLength,
      default = .get(default, c(x), default = "")
    )
  })
  names(prop) <- languages

  propOrder <- ifelse(isEmpty(keyCounter), mxCounter(keyCounter), propertyOrder)


  list(
    propertyOrder = propOrder,
    title = paste(titlePrefix, d(keyTitle, lang = language, dict = dict, web = F)),
    # type = "object",
    options = list(collapsed = collapsed),
    properties = prop
  )
}




#' Create attribute description object based on multilingual input
#' @param format {Character} Schema input format
#' @param keyTitle {Character} Translation key of the title
#' @param keyCounter {Character|Numeric} Id of the counter to set
#' @param type {Character} Input type
#' @param collapsed {Boolean} Collapse state of the object
#' @param attributes {Character} Vector of attributes names
#' @param dict {List} Dictionnary object. Default is "config$dictionaries$main"
mxSchemaAttributeInput <- function(
  language = "en",
  format = NULL,
  keyTitle = "",
  keyCounter = "attr",
  type = "string",
  collapsed = TRUE,
  attributes = c(),
  minLength = 1,
  maxLength = 30,
  dict
) {
  prop <- lapply(attributes, function(x) {
    mxSchemaMultiLingualInput(
      language = language,
      keyTitle = keyTitle,
      titlePrefix = x,
      keyCounter = keyCounter,
      type = type,
      format = format,
      default = list("en" = x),
      dict = dict,
      minLength = minLength,
      maxLength = maxLength
    )
  })

  names(prop) <- attributes
  return(prop)
}


#' Check for "empty" value
#'
#' Empty values = NULL or, depending of storage mode
#' - data.frame : empty is 0 row
#' - list : empty is length of 0 at first level or second level
#' - vector (without list) : empty is length of 0 OR first value in "config$defaultNoDatas" OR first value is NA or first value as character length of 0
#'
#' @param val object to check : data.frame, list or vector (non list).
#' @param debug Boolean : Should the function return timing ?.
#' @return Boolean TRUE if empty
#' @export
isEmpty <- function(val = NULL, debug = FALSE) {
  noDatas <- config$noData

  res <- isTRUE(
    is.null(val)
  ) ||
    isTRUE(
      #
      # data.frame:
      #
      isTRUE(
        is.data.frame(val) &&
          # - No row
          nrow(val) == 0
      ) ||
        #
        # list, one of:
        # - length 0
        # - all 'noData'
        #
        isTRUE(
          !is.data.frame(val) &&
            is.list(val) &&
            (
              length(val) == 0 ||
                all(sapply(val, isEmpty))
            )
        ) ||
        #
        # vector one of :
        # - length 0
        # - first value is special 'noData' ( other values ignored )
        # - first value is 'na'
        # - first value is length 0
        isTRUE(
          !is.list(val) &&
            is.vector(val) &&
            (
              length(val) == 0 ||
                val[[1]] %in% noDatas ||
                is.na(val[[1]]) ||
                nchar(val[[1]]) == 0)
        )
    )

  return(res)
}

isNotEmpty <- function(...) {
  !isEmpty(...)
}

#' Concatenate text
#' @param x {string} left string or number
#' @param y {string} right string or number
#' @export
"+" <- function(x, y) {
  if (is.character(x) || is.character(y)) {
    return(paste(x, y, sep = ""))
  } else {
    .Primitive("+")(x, y)
  }
}

#' Get default config from global env
#' @export
mxGetDefaultConfig <- function() {
  get("config", envir = .GlobalEnv)
}


#' Set web resource path
mxSetResourcePath <- function(resources) {
  if (is.null(resources)) {
    res <- .get(config, "resources")
  } else {
    res <- resources
  }
  for (i in names(res)) {
    shiny::addResourcePath(i, res[[i]])
  }
}



#' Get country codes list, using selected language for names
#' @param language {Character} Two letter code for language
#' @return list {List} Named list of countries
mxGetCountryList <- function(language = "en", includeWorld = TRUE) {
  out <- list()
  countryTable <- .get(config, c("countries", "table"))[, c("id", language)]
  out <- .get(countryTable, c("id"))
  names(out) <- .get(countryTable, c(language))
  if (!includeWorld) {
    out <- out[!out == "WLD"]
  }
  return(out)
}



#' Replace escaped new line by new line
#'
#' @param {Character} txt Text where to replace escaped new lines
#' @return {Character} Text with new lines
mxUnescapeNewLine <- function(txt) {
  txt <- gsub("\\\\n", "\n", txt)
  txt
}


#' Simple version mxDictTranslate. Just get the entry.
#' @param id {Character} Id from the dict to get
#' @param dict {List} Dictionnary
#' @param language {Character} Language (two letters code)
#' @return Dictionary item
mxDictTranslateSimple <- function(id,
  language = .get(config, c("languages", "codes")),
  dict = .get(config, "dict")
) {
  language <- match.arg(language)
  if (isEmpty(dict)) {
    return(id)
  }
  out <- dict[dict$id == id, c(language, "en")]
  nOut <- nrow(out)
  if (nOut == 0) {
    return(id)
  }
  if (nOut > 1) {
    out <- out[c(1), ]
  }
  str <- out[, c(language)]
  if (isEmpty(str)) {
    return(out[, c("en")])
  }
  return(str)
}

dd <- mxDictTranslateSimple


#' Tranlsation + html tag
#'
#' @param {Character} id Dict id
#' @param {Character} language id
#' @return {shiny.tag}
mxDictTranslateTag <- function(id, language = NULL) {
  tags$span(
    dd(id, language),
    `data-lang_key` = id,
    style = "display:inline-block"
  )
}

#' Tranlsation + html tag with description (_desc suffix)
#'
#' @param {Character} id Dict id
#' @param {Character} language id
#' @return {shiny.tag}
mxDictTranslateTagDesc <- function(id, language = NULL) {
  idDesc <- sprintf("%s_desc", id)
  tags$div(
    tags$span(
      dd(id, language = language),
      `data-lang_key` = id,
      style = "display:block"
    ),
    tags$span(
      style = "display:block",
      dd(idDesc, language = language),
      class = "text-muted",
      `data-lang_key` = idDesc
    )
  )
}
ddesc <- mxDictTranslateTagDesc


#' Get dictionnary entry by key for a given language (translate)
#' @param id {string} Id of element to extract
#' @param lang {string} Two letters code for given language
#' @return Translated value
#' @note
#'    memoisiation test
#'    10 search  on 172'000 entries
#'    for(i in 1:12){config[['dict']]=rbind(config[['dict']],config[['dict']])}
#'    system.time({test = sapply(rep("hello_world",10),function(x){d(x,"fr")})})
#'    before :  0.012 [s]
#'    after : 0.001 [s]
#' @export
mxDictTranslate <- function(
  id = NULL,
  lang = NULL,
  langDefault = "en",
  namedVector = FALSE,
  dict = NULL,
  web = FALSE,
  asChar = FALSE,
  debug = F
) {
  out <- NULL

  # if no dictionary provided, search for one in parent env
  if (isEmpty(dict)) {
    dict <- dynGet("dict", inherits = T)
  }

  # if no dict found, get the default. Else, append default and provided
  if (isEmpty(dict)) {
    dict <- .get(config, "dict")
  } else {
    dict <- rbind(dict, .get(config, "dict"))
  }

  d <- dict

  # if no language, get the default or the first of the language available
  if (isEmpty(lang)) {
    lang <- dynGet("lang", inherits = T)
    if (isEmpty(lang)) {
      lang <- langDefault
      if (isEmpty(lang)) {
        lang <- config[["languages"]][["list"]][[1]]
      }
    }
  }

  # test for missing language
  langExists <- c(lang, langDefault) %in% names(d)
  if (!all(langExists)) stop(sprintf("Language %s not found", c(lang, langDefault)[!langExists]))

  #
  # Start search
  #
  if (is.null(id)) {
    #
    # All id
    #
    if (lang != langDefault) {
      #
      # Output all items for both default and selected language
      #
      out <- d[, c("id", c(langDefault, lang))]
    } else {
      #
      # Output all items for selected language
      #
      out <- d[, c("id", c(lang))]
    }
  } else {
    if (length(id) > 1 || namedVector) {
      #
      # Multiple id
      #
      if (length(lang) != 1) stop("if id > 1, language should be 1")

      sub <- d[d$id %in% id, c("id", lang, langDefault)]

      out <- id
      dat <- vapply(id,
        function(x) {
          # Subset the word in the language and default language
          trads <- d[d$id == as.character(x), c(lang, langDefault)]
          # Get only the selected language
          trad <- trads[, lang]
          # if it's empty, use the default language
          if (isEmpty(trad)) trad <- trads[, langDefault]
          # if it's empty, use the id
          if (isEmpty(trad)) trad <- x
          # If there is multiple match, paste. It should not happen...
          trad <- paste(trad, collapse = "/")
          return(trad)
        },
        character(1),
        USE.NAMES = F
      )

      if (namedVector) {
        names(out) <- dat
      } else {
        out <- dat
      }
    } else {
      #
      # Single id
      #
      out <- d[d$id == id, lang][1]
      if (isEmpty(out)) out <- d[d$id == id, langDefault][1]
      if (isEmpty(out)) out <- id
      if (web) out <- tags$div(out, `data-lang_key` = id, style = "display:inline-block")
      if (asChar) out <- as.character(out)
    }
  }

  return(out)
}
# shortcut
d <- mxDictTranslate


#' Create source named list from layer table
#' @param layerTable {table} table with columns "id", "title", "date_modified"
mxGetSourceNamedList <- function(layerTable) {
  out <- as.list(layerTable$id)
  titles <- layerTable$title
  date <- as.Date(layerTable$date_modified)

  titlesDate <- sprintf("%1$s ( %2$s )", titles, format(date, "%Y-%m-%d"))

  names(out) <- trimws(titlesDate)

  out <- out[order(names(out))]

  return(as.list(out))
}


#' Get title of source using its id
#' @param id {String} Source id
#' @param language {String} Two letter language code
#' @return title string
mxGetTitleFromSourceID <- function(id, language = "en") {
  sql <- "
  SELECT
  data#>>'{\"meta\",\"text\",\"title\",\"" + language + "\"}' as " + language + ",
  data#>>'{\"meta\",\"text\",\"title\",\"en\"}' as en
  FROM mx_sources
  WHERE id ='" + id + "' "

  df <- mxDbGetQuery(sql)
  out <- df[, "en"]
  hasLanguage <- isNotEmpty(df[, language])

  if (hasLanguage) {
    out <- df[, language]
  }

  return(out)
}




#' Translate geom type name
#' @param {data.frame} geomTypes Geometry type data.frame as returned by mxDbGetLayerGeomTypes
#' @param {character} language Language code
mxSetNameGeomType <- function(geomTypeDf, language) {
  geomType <- geomTypeDf$geom_type
  geomCount <- geomTypeDf$count

  geomType <- d(geomType, language, namedVector = TRUE)

  names(geomType) <- sprintf("%1$s ( n= %2$s )", names(geomType), geomCount)

  return(as.list(geomType))
}


#' Recursive search and filter on named list
#' @param li List to evaluate
#' @param column Named field to search on (unique)
#' @param operator Search operator (">","<","==",">=","<=","!=","%in%")
#' @param search Value to search
#' @param filter Named field to keep
#' @return list or named vector if filter is given
#' @export
mxRecursiveSearch <- function(li, column = "", operator = "==", search = "", filter = "") {
  res <- NULL
  stopifnot(operator %in% c(">", "<", "==", ">=", "<=", "!=", "%in%"))
  expr <- paste("li[[column]]", operator, "search")
  if (is.list(li) && length(li) > 0) {
    if (column %in% names(li) && eval(parse(text = expr))) {
      return(li)
    } else {
      val <- lapply(li, function(x) {
        mxRecursiveSearch(
          li = x,
          search = search,
          operator = operator,
          column = column,
          filter = filter
        )
      })
      val <- val[sapply(val, function(x) !is.null(x))]
      if (length(val) > 0) {
        if (is.null(filter) || nchar(filter) == 0) {
          res <- val
        } else {
          res <- unlist(val)
          res <- res[grepl(paste0(filter, collapse = "|"), names(res))]
        }
        return(res)
      }
    }
  }
}


#' Remove extension
#' @param file {string} File name
#' @return file without extension
#' @export
removeExtension <- function(file) {
  if (isEmpty(file)) {
    return("")
  }
  file <- basename(file)
  sub("([^.]*)\\.([[:alnum:]]+$)", "\\1", file)
}


#' Print debug message
#'
#' Print a defaut debug message with date as prefix. NOTE: this function should take a global parameter "debug" and a log file.
#'
#' @param m Message to be printed
#' @return NULL
#' @export
mxDebugMsg <- function(text = "") {
  options(digits.secs = 4)
  cat(sprintf("{ %1$s } %2$s \n", Sys.time(), text))
}


#' Time interval evaluation
#' @param action "start" or "stop" the timer
#' @param timerTitle Title to be displayed in debug message
#' @return
mxTimer <- function(action = c("stop", "start"), timerTitle = "Mapx timer") {
  now <- Sys.time()
  action <- match.arg(action)
  if (isTRUE(!is.null(action) && action == "start")) {
    .mxTimer <<- list(time = now, title = timerTitle)
  } else {
    if (exists(".mxTimer")) {
      diff <- paste(round(difftime(now, .mxTimer$time, units = "secs"), 3))
      mxDebugMsg(paste(.mxTimer$title, diff, "s"))
    }
  }
  return(now)
}


mxTimeDiff <- function(titleOrTimer = "test") {
  dat <- titleOrTimer
  now <- Sys.time()

  if ("mx_timer" %in% class(dat)) {
    diff <- paste(round(difftime(now, dat$start, units = "secs"), 3))
    mxDebugMsg(paste(dat$title, diff, "s"))
    return(diff)
  } else {
    out <- list(
      start = Sys.time(),
      title = dat
    )

    class(out) <- c(class(out), "mx_timer")

    return(out)
  }
}



#' Test for internet connection.
#' The idea is to reach google with a ping and determine if there is a full packet response without loss
#'
#' @param host String. Host name to ping
#' @export
mxCanReach <- function(server = "google.com", port = 80) {
  req <- sprintf(
    "if nc -z %1$s %2$s; then echo '1'; else echo '0';fi;",
    server,
    port
  )

  any(system(req, intern = T) == "1")
}



#' Display a header message in console
#' @param {character} text Text to display
#' @export
mxConsoleText <- function(text = "") {
  nc <- nchar(text)
  lc <- 79 - nc
  mc <- lc %/% 2
  bar <- paste(rep("-", mc), collapse = "")
  out <- paste0(bar, text, bar, "\n", sep = "")
  cat(out)
}




#' Extract stack trace from cond, format it as a data.frame
#'
#' @note  See https://github.com/rstudio/shiny/issues/2096
#' @param cond Cond object
mxGetStackTrace <- function(cond,
  full = getOption("shiny.fullstacktrace", FALSE),
  offset = getOption("shiny.stacktraceoffset", TRUE)) {
  tryCatch(
    {
      should_drop <- !full
      should_strip <- !full
      should_prune <- !full

      stackTraceCalls <- c(
        attr(cond, "deep.stack.trace", exact = TRUE),
        list(attr(cond, "stack.trace", exact = TRUE))
      )

      stackTraceParents <- lapply(stackTraceCalls, attr, which = "parents", exact = TRUE)
      stackTraceCallNames <- lapply(stackTraceCalls, shiny:::getCallNames)
      stackTraceCalls <- lapply(stackTraceCalls, shiny:::offsetSrcrefs, offset = offset)

      # Use dropTrivialFrames logic to remove trailing bits (.handleSimpleError, h)
      if (should_drop) {
        # toKeep is a list of logical vectors, of which elements (stack frames) to keep
        toKeep <- lapply(stackTraceCallNames, shiny:::dropTrivialFrames)
        # We apply the list of logical vector indices to each data structure
        stackTraceCalls <- mapply(stackTraceCalls, FUN = `[`, toKeep, SIMPLIFY = FALSE)
        stackTraceCallNames <- mapply(stackTraceCallNames, FUN = `[`, toKeep, SIMPLIFY = FALSE)
        stackTraceParents <- mapply(stackTraceParents, FUN = `[`, toKeep, SIMPLIFY = FALSE)
      }

      delayedAssign("all_true", {
        # List of logical vectors that are all TRUE, the same shape as
        # stackTraceCallNames. Delay the evaluation so we don't create it unless
        # we need it, but if we need it twice then we don't pay to create it twice.
        lapply(stackTraceCallNames, function(st) {
          rep_len(TRUE, length(st))
        })
      })

      # stripStackTraces and lapply(stackTraceParents, pruneStackTrace) return lists
      # of logical vectors. Use mapply(FUN = `&`) to boolean-and each pair of the
      # logical vectors.
      toShow <- mapply(
        if (should_strip) shiny:::stripStackTraces(stackTraceCallNames) else all_true,
        if (should_prune) lapply(stackTraceParents, shiny:::pruneStackTrace) else all_true,
        FUN = `&`,
        SIMPLIFY = FALSE
      )

      dfs <- mapply(seq_along(stackTraceCalls), rev(stackTraceCalls), rev(stackTraceCallNames), rev(toShow), FUN = function(i, calls, nms, index) {
        st <- data.frame(
          num = rev(which(index)),
          call = rev(nms[index]),
          loc = rev(shiny:::getLocs(calls[index])),
          category = rev(shiny:::getCallCategories(calls[index])),
          stringsAsFactors = FALSE
        )

        if (i != 1) {
          message("From earlier call:")
        }

        if (nrow(st) == 0) {
          message("  [No stack trace available]")
        } else {
          width <- floor(log10(max(st$num))) + 1
          formatted <- paste0(
            "  ",
            formatC(st$num, width = width),
            ": ",
            mapply(paste0(st$call, st$loc), st$category, FUN = function(name, category) {
              if (category == "pkg") {
                crayon::silver(name)
              } else if (category == "user") {
                crayon::blue$bold(name)
              } else {
                crayon::white(name)
              }
            }),
            "\n"
          )
        }
        return(st)
      }, SIMPLIFY = FALSE)
    },
    error = function(c) {
      return(list(
        errInternal = c$message,
        errApp = cond$message
      ))
    }
  )
}

#' Convert data.frame to html table.
#' @param table data.frame
#' @return html table
mxTableToHtml <- function(
  table,
  id = randomString(),
  class = "mx-table",
  classContainer = "mx-table-container"
) {
  tagList(
    tags$div(
      class = classContainer,
      shiny::HTML(
        utils::capture.output(
          print(
            xtable::xtable(as.data.frame(table), html = T),
            type = "html",
            "html.table.attributes" = "class='table " + class + "'",
            sanitize.text.function = identity,
            include.rownames = FALSE
          )
        )
      )
    )
  )
}

mxCatchHandler <- function(type = "error", cond = NULL, session = shiny::getDefaultReactiveDomain()) {
  suppressWarnings({
    options(show.error.locations = TRUE)

    message <- as.character(cond$message)

    sysStack <- mxGetStackTrace(cond)
    isDev <- isTRUE(as.logical(Sys.getenv("MAPX_DEV")))

    if (!exists("cdata") || isEmpty(cdata)) {
      cdata <- "<unkown>"
    }

    if (isEmpty(type)) {
      type <- "<unknown>"
    }
    if (isEmpty(message)) {
      message <- "<no message>"
    }

    sysStackFormated <- as.character(toJSON(sysStack))

    err <- list(
      type = type,
      stack = sysStackFormated,
      message = message,
      time = as.character(Sys.time()),
      cdata = as.character(cdata)
    )

    if (type == "error") {
      #
      # outut user facing message
      #
      if (isNotEmpty(session)) {
        mxModal(
          id = randomString(),
          zIndex = 100000,
          title = "Unexpected issue",
          content = tagList(
            tags$b("Something went wrong :/"),
            tags$p("An unexpected issue happened : our team has received a notification about it. If this keeps happening, you can also post something here:"),
            tags$a(
              href = .get(
                config,
                c("links", "repositoryIssues")
              ),
              target = "_blank",
              .get(
                config,
                c("links", "repositoryIssues")
              )
            ),
            tags$details(
              tags$summary("More info"),
              tags$div(
                tags$span(
                  style = "color:red",
                  message
                ),
                mxTableToHtml(sysStack[[1]])
              )
            )
          )
        )
      }
    }


    template <- .get(config, c("templates", "html", "email_error"))
    content <- mxParseTemplate(template, list(
      TYPE = err$type,
      DATE = err$time,
      CDATA = err$cdata,
      MESSAGE = err$message,
      CALL = err$stack
    ))

    if (isEmpty(content)) content <- ""
    #
    # else send an email
    #
    subject <- paste0("[ mx-issue-", type, " ]")

    if (isDev) {
      mxDebugMsg(message)
      mxDebugMsg(err)
    }

    mxSendMail(
      to = .get(config, c("mail", "admin")),
      subject = subject,
      content = content,
      useNotify = FALSE,
      # If the DB is down, encryption is down
      encrypt = FALSE
    )
  })
}


#' Parse template
#'
#' @param template {Character} Template
#' @param config {List} Named list / key pair value
#' @return parsed template
#' @export
mxParseTemplate <- function(template, config) {
  for (i in names(config)) {
    label <- sprintf("\\{\\{%1$s\\}\\}", i)
    template <- gsub(label, config[[i]], template)
  }
  #' R encode new line as a character. Need the real thing.
  template <- mxUnescapeNewLine(template)
  return(template)
}

#' Check key (without {{}}) in template
#'
#' @param template {Character} Template
#' @param key {Character} Key to search for
#' @return {Logical} key is there
#' @example mxParseTemplateHasKey("hello {you}}", "you") -> true
#' @export
mxParseTemplateHasKey <- function(template, key) {
  grepl(sprintf("\\{\\{%1$s\\}\\}", key), template)
}

mxNewLineToBr <- function(str) {
  gsub("\n|$", "<br>", str)
}

#' Parse template from dict entry
#'
#' @param idTemplate {Character} idTemplate e.g. `saved_at`
#' @param lang {Character} Two letter language code
#' @param config {List} Named list / key pair value
#' @return parsed template
#' @export
mxParseTemplateDict <- function(idTemplate, lang = NULL, config = list()) {
  template <- dd(idTemplate, language = lang)
  mxParseTemplate(
    template,
    config
  )
}

#' Catch errors
#'
#' Catch errors and return alert panel in an existing div id.
#'
#' @param title Title of the alert
#' @param session Shiny session object
#' @param debug Boolean. Return also message as alert.
#' @param panelId Id of the output element
#' @export
mxCatch <- function(
  title,
  expression,
  session = shiny:::getDefaultReactiveDomain(),
  debug = TRUE,
  onError = function() {},
  onWarning = function() {},
  onMessage = function() {}) {
  tryCatch(
    {
      captureStackTraces(eval(expression))
    },
    error = function(e) {
      mxCatchHandler(
        type = "error",
        cond = e
      )

      onError()
    },
    warning = function(e) {
      mxCatchHandler(
        type = "warning",
        cond = e
      )

      onWarning()
    },
    message = function(e) {
      if (debug) {
        mxCatchHandler(
          type = "message",
          cond = e
        )

        onMessage()
      }
    }
  )
}



#' Random string generator
#'
#' Create a random string with optional settings.
#'
#' @param prefix Prefix. Default = NULL
#' @param suffix Suffix. Default = NULL
#' @param n Number of character to include in the random string
#' @param sep Separator for prefix or suffix
#' @param addSymbols Add random symbols
#' @param addLetters Add random letters (upper and lowercase)
#' @param splitIn Split string into chunk, with separator as defined in splitSep
#' @param splitSep Split symbos if splitIn > 1
#' @return  Random string of letters, with prefix and suffix
#' @export
randomString <- function(prefix = NULL, suffix = NULL, n = 15, sep = "_", addSymbols = F, addLetters = T, addLETTERS = F, splitIn = 1, splitSep = "_") {
  prefix <- subPunct(prefix, sep)
  suffix <- subPunct(suffix, sep)
  src <- 0:9

  if (splitIn < 1) splitIn <- 1
  if (isTRUE(addSymbols)) src <- c(src, "$", "?", "=", ")", "(", "/", "&", "%", "*", "+")
  if (isTRUE(addLetters)) src <- c(letters, src)
  if (isTRUE(addLETTERS)) src <- c(LETTERS, src)

  grp <- sort(1:n %% splitIn)

  rStr <- src %>%
    sample(size = n, replace = T) %>%
    split(grp) %>%
    sapply(paste, collapse = "") %>%
    paste(collapse = splitSep)

  c(prefix, rStr, suffix) %>%
    paste(collapse = sep)
}

#' Substitute ponctiation and non-ascii character
#'
#' Take a string and convert to ascii string with optional transliteration ponctuation convertion.
#'
#' @param str String to evaluate
#' @param sep Replace separator
#' @param rmTrailingSep Logical argument : no trailing separator returned
#' @param rmLeadingSep Logical argument : no leading separator returned
#' @param rmDuplicateSep Logical argument : no consecutive separator returned
#' @export
subPunct <- function(str, sep = "_", rmTrailingSep = T, rmLeadingSep = T, rmDuplicateSep = T, useTransliteration = T) {
  # if(useTransliteration){
  # str<-gsub("'",'',iconv(str, to='ASCII//TRANSLIT'))
  # }
  res <- gsub("[[:punct:]]+|[[:blank:]]+", sep, str) # replace punctuation by sep
  res <- gsub("\n", "", res)
  if (rmDuplicateSep) {
    if (nchar(sep) > 0) {
      res <- gsub(paste0("(\\", sep, ")+"), sep, res) # avoid duplicate
    }
  }
  if (rmLeadingSep) {
    if (nchar(sep) > 0) {
      res <- gsub(paste0("^", sep), "", res) # remove trailing sep.
    }
  }
  if (rmTrailingSep) {
    if (nchar(sep) > 0) {
      res <- gsub(paste0(sep, "$"), "", res) # remove trailing sep.
    }
  }
  res
}



#' Set a checkbox button with custom icon.
#'
#' Create a checkbox input with a select icon.
#'
#' @param id Id of the element
#' @param icon Name of the fontawesome icon. E.g. cog, times, wrench
#' @export
mxCheckboxIcon <- function(id, idLabel, icon, display = TRUE) {
  visible <- "display:inline-block"
  if (!display) visible <- "display:none"
  tagList(
    div(
      id = idLabel, class = "checkbox", style = paste(visible, ";float:right;"),
      tags$label(
        tags$input(type = "checkbox", class = "vis-hidden", id = id),
        tags$span(icon(icon))
      )
    )
  )
}


#' encode in base64
#' @param text character string to encode
#' @export
mxEncode <- function(text) {
  jsonlite::base64_enc(charToRaw(as.character(text)))
}
#' decode base64 string
#' @param base64text base64string encoded
#' @export
mxDecode <- function(base64text) {
  rawToChar(jsonlite::base64_dec(base64text))
}



#' Parse key value pair from text
#'
#' Key value text to list
#'
#' @param txt unformated text with key value pair. eg. myKey = myValue
#' @return list of value
#' @export
mxParseListFromText <- function(txt) {
  txt2 <- txt %>%
    strsplit(., "(\n\\s*)", perl = T) %>%
    unlist(.) %>%
    gsub("^\\s*([a-z]+?)\\s*=\\s+(.+?)$", "\\1 = \"\\2\"", .) %>%
    paste(., collapse = ",") %>%
    paste("list(", ., ")") %>%
    parse(text = .) %>%
    eval(.)
  return(txt2)
}


#' Create random secret
#'
#' Get a random string .
#'
#' @param n Number of character
#' @export
mxCreateSecret <- function(n = 20) {
  randomString(20)
}

#' Email munging
#'
#' Make email unreadable by robot
#'
#' @param emails vector or list
#' @return munged emails
mxEmailMunger <- function(emails) {
  sapply(emails, function(e) {
    e <- removeExtension(e)
    e <- strsplit(e, "@")[[1]] %>%
      gsub("\\.", " ", .) %>%
      tools::toTitleCase()
    domain <- toupper(e[[2]])
    name <- e[[1]]
    sprintf("%1$s ( %2$s )", name, domain)
  })
}

#' Check if given email is valid
#' @param email String email address to verify
#' @return named logic vector
#' @export
mxEmailIsValid <- function(email = NULL) {
  res <- FALSE
  if (isNotEmpty(email)) {
    email <- as.character(email)
    tryCatch(
      {
        # regex expression
        # see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email
        regex <- "^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
        # if there is a match, return TRUE
        res <- sapply(email, function(e) {
          isTRUE(grep(regex, x = e, perl = T) == 1)
        })
      },
      error = function(x) {
        return()
      }
    )
  }
  return(res)
}

#' fromJSON wrapper and error handler
#'
#' @param {Character} character string that contain JSON data.
#' @return {List} parsed json or mepty list
mxFromJSON <- function(str) {
  out <- list()
  tryCatch(
    {
      out <- jsonlite::fromJSON(str)
    },
    error = function(err) {
      return()
    }
  )

  return(out)
}

#' String validation
#'
#' Check if a string exists in a vector of string, if there is a duplicate, if contains at least n character, etc.. and update an existing div with a html summary. Return if the string is valid or not.
#'
#' @param textTotest text to test against rules
#' @param existingTexts  Vector of existing text
#' @param idTextValidation Id of the ui element to update (id=example -> uiOutput("example"))
#' @param minChar Minimum character length
#' @param testForDuplicate Boolean test for duplicate.
#' @param testForMinChar Boolean test for minimum number of character
#' @param displayNameInValidation Boolean add text in validation text
#' @return boolean : valid or not
#' @export
mxTextValidation <- function(textToTest, existingTexts, idTextValidation, minChar = 5, testForDuplicate = TRUE, testForMinChar = TRUE, displayNameInValidation = TRUE, existsText = "taken", errorColor = "#FF0000") {
  if (isTRUE(length(textToTest) > 1)) {
    stop("mxTextValidation only validate one input item")
  }

  isValid <- FALSE
  isDuplicate <- FALSE
  isTooShort <- FALSE
  err <- character(0)

  if (testForDuplicate) {
    itemExists <- isTRUE(tolower(textToTest) %in% tolower(unlist(existingTexts)))
  }
  if (testForMinChar) {
    itemTooShort <- isTRUE(nchar(textToTest) < minChar)
  }


  err <- ifelse(itemExists, existsText, character(0))
  err <- c(err, ifelse(itemTooShort, sprintf("too short. Min %s letters", minChar), character(0)))
  err <- na.omit(err)

  if (!displayNameInValidation) {
    textToTest <- ""
  }

  if (length(err) > 0) {
    outTxt <- (sprintf("<b style=\"color:%1$s\">(%2$s)</b> %3$s", errorColor, err, textToTest))
    isValid <- FALSE
  } else {
    outTxt <- (sprintf("<b style=\"color:#00CC00\">(ok)</b> %s", textToTest))
    isValid <- TRUE
  }

  mxUpdateText(id = idTextValidation, text = HTML(outTxt))

  return(isValid)
}



#' Extract value from a list given a path
#' @param listInput Input named list
#' @param path Path inside the list
#' @param flattenList Conversion of the result to vector
#' @param default If nothing found, value returning
#' @return value extracted or NULL
#' @export
mxGetListValue <- function(listInput, path, default = NULL, flattenList = FALSE) {
  tryCatch(
    {
      out <- default
      if ("reactivevalues" %in% class(listInput)) {
        listInput <- reactiveValuesToList(listInput)
      }
      if (!is.list(listInput) || length(listInput) == 0) {
        return(out)
      }
      out <- listInput[[path]]
      if (flattenList && isNotEmpty(out) && is.list(out)) {
        out <- as.list(unlist(out, use.names = F))
      }
      if (isEmpty(out)) {
        out <- default
      }
    },
    error = function(e) {
      # remove error like "no such index at level"
      out <- default
    }
  )
  return(out)
}
.get <- mxGetListValue

#' Set a value of a list element, given a path
#'
#' This function will update a value in a list given a path. If the path does not exist, it will be created.
#' If the function find a non list element before reaching destination, it will stop.
#'
#' @param path vector with name of path element. e.g. `c("a","b","c")`
#' @param value value to update or create
#' @param level starting path level, default is 0
#' @param export
mxSetListValue <- function(listInput, path, value, level = 0) {
  level <- level + 1
  p <- path[c(0:level)]
  #
  # Create parsable expression to acces non existing list element
  #
  liEv <- paste0("listInput", paste0(paste0("[[\"", p, "\"]]", sep = ""), collapse = ""))

  if (is.null(eval(parse(text = liEv)))) {
    #
    # If the element does not exist, it's a list
    #
    liSet <- paste0(liEv, "<-list()")
    eval(parse(text = liSet))
  }
  if (level == length(path)) {
    #
    # We reached destination, set value
    #
    listInput[[p]] <- value
  } else {
    #
    # If we encouter non-list value, stop, it's not expected.
    #
    if (!is.list(listInput[[p]])) stop(sprintf("Not a list at %s", paste(p, collapse = ",")))
    listInput <- mxSetListValue(listInput, path, value, level)
  }
  return(listInput)
}
.set <- mxSetListValue

#' Trim string at given position minus and put ellipsis if needed
#' @param str String to trim if needed
#' @param n Maximum allowed position. If number of character exceed this, a trim will be done
#' @return Trimed string
#' @export
mxShort <- function(str = "", n = 10) {
  stopifnot(n >= 4)
  if (nchar(str) > n) {
    sprintf("%s...", strtrim(str, n - 3))
  } else {
    return(str)
  }
}


#' Remove multiple space or new line char
#' @param {character} string go clean
#' @param {character} rep replacement char
mxCleanString <- function(str, rep = " ") {
  gsub("\\s+", rep, str)
}


#' Fast test file reading
#' @param {character} fileName Name of the text file to read
#' @param {boolean} clean Should the function remove end-of-line char and more-than-one space ?
mxReadText <- function(fileName, clean = FALSE) {
  out <- readChar(fileName, file.info(fileName)$size)

  if (clean) {
    out <- mxCleanString(out)
  }

  return(out)
}



mxButton <- function(inputId, labelId = NULL, class = NULL) {
  class <- paste0(class, collapse = " ")
  tags$button(
    id = inputId,
    type = "button",
    class = sprintf("btn btn-default action-button %s", class),
    `data-lang_key` = labelId
  )
}

#' Label + translation + icon
#'
#'
mxLabel <- function(id, language, icon) {
  div(
    class = "label-icon",
    tagList(
      d(id, language, web = TRUE),
      tags$i(class = sprintf("fa fa-%s", icon))
    )
  )
}


#' User name input
#'
#' Create a username input
#'
#' @param inputId Input id
#' @param label Label to display
#' @export
mxInputUser <- function(
  inputId,
  placeholder = "Text...",
  tabindex = 0,
  autofocus = FALSE,
  class = "form-control"
) {
  elInput <- tags$input(
    id = inputId,
    placeholder = placeholder,
    class = paste("mx-login-input", class),
    value = "",
    autocomplete = "off",
    autocorrect = "off",
    autocapitalize = "off",
    spellcheck = "false",
    tabindex = tabindex,
  )
  if (isTRUE(autofocus)) {
    elInput <- tagAppendAttributes(elInput, autofocus = "autofocus")
  }
  elInput
}





#' Create a bootstrap accordion
#'
#' Create a bootstrap accordion element, based on a named list.
#'
#' @param id Accordion group ID
#' @param style Additional style.
#' @param show Vector of item number. Collapse all item except those in this list. E.g. c(1,5) will open items 1 and 5 by default.
#' @param itemList Nested named list of items, containing title and content items. E.g. list("foo"=list("title"="foo","content"="bar"))
#' @examples
#' mxAccordionGroup(
#'   id = "superTest",
#'   itemList = list(
#'     "a" = list("title" = "superTitle", content = "acontent"),
#'     "b" = list("title" = "bTitle", content = "bContent")
#'   )
#' )
#' @export
mxAccordionGroup <- function(id, style = NULL, show = NULL, itemList) {
  if (is.null(style)) style <- ""
  cnt <- 0
  contentList <- lapply(itemList, function(x) {
    cnt <<- cnt + 1
    ref <- paste0(subPunct(id, "_"), cnt)
    showItem <- ifelse(cnt %in% show, "collapse.in", "collapse")
    stopifnot(is.list(x) || isNotEmpty(x$title) || isNotEmpty(x$content))

    onShow <- ifelse(isEmpty(x$onShow), "", x$onShow)
    onHide <- ifelse(isEmpty(x$onHide), "", x$onHide)

    if (is.null(x$condition)) x$condition <- "true"
    div(
      style = style,
      class = paste("mx-accordion-item", x$class),
      `data-display-if` = x$condition,
      div(
        class = "mx-accordion-header",
        tags$span(
          class = "mx-accordion-title",
          tags$a(
            "data-toggle" = "collapse",
            "data-parent" = paste0("#", id),
            href = paste0("#", ref), x$title
          )
        )
      ),
      div(
        id = ref,
        class = paste("mx-accordion-collapse", showItem),
        div(
          class = "mx-accordion-content",
          x$content
        ),
        tags$script(
          sprintf(
            '
            $("#%1$s").on("show.bs.collapse", function () {
              %2$s
}).on("hide.bs.collapse", function () {
%3$s
    });
            ',
            ref,
            onShow,
            onHide
          )
        )
      )
    )
  })

  return(div(
    class = "mx-accordion-group", id = id,
    contentList
  ))
}
#' Custom file input
#'
#' Default shiny fileInput has no option for customisation. This function allows to fully customize file input using the label tag.
#'
#' @param inputId id of the file input
#' @param label Label for the input
#' @param fileAccept List of accepted file type. Could be extension.
#' @param multiple  Boolean. Allow multiple file to be choosen. Doesn't work on all client.
#' @export
mxFileInput <- function(inputId, label, fileAccept = NULL, multiple = FALSE) {
  inputTag <- tags$input(
    type = "file",
    class = "upload",
    accept = paste(fileAccept, collapse = ","),
    id = inputId,
    name = inputId
  )
  if (multiple) inputTag$attribs$multiple <- "multiple"
  spanTag <- tags$span(label)
  inputClass <- tags$label(
    class = c("btn-browse btn btn-default"),
    id = inputId,
    spanTag,
    inputTag
  )
  tagList(
    inputClass,
    tags$div(
      id = paste(inputId, "_progress", sep = ""),
      class = "progress progress-striped active shiny-file-input-progress",
      tags$div(class = "progress-bar"), tags$label()
    )
  )
}

#' Custom select input
#'
#' Custom empty select input, updated later.
#'
#' @param inputId Element id
#' @param labelId Id of label

mxSelect <- function(
  inputId,
  class = "",
  values = NULL,
  valuesLabels = NULL,
  optionAttr = NULL,
  optionAttrValues = NULL
) {
  attr <- character(1)
  opt <- character(1)
  val <- character(1)

  hasValues <- length(values) > 0
  hasValueLabels <- !is.null(valuesLabels) && length(valuesLabels) == length(values)
  hasAttr <- !is.null(optionAttr)
  hasAttrOpt <- !is.null(optionAttrValues) && length(optionAttrValues) == length(values)

  if (!hasValueLabels) valuesLabels <- values

  if (hasAttr && hasAttrOpt) attr <- sprintf("%1$s=\"%2$s\"", optionAttr, optionAttrValues)

  if (hasValues) val <- sprintf("value=\"%1$s\"", values)

  if (length(valuesLabels) > 0) {
    opt <- sprintf("<option %1$s %2$s >%3$s</option>\n", attr, val, valuesLabels)
  }

  tags$select(
    id = inputId,
    HTML(opt)
  )
}







#' Create button to change ui color
#' @param {string} id Id of the generated button
#' @export
mxUiColorSwitch <- function(id, class1 = "white", class2 = "black", ...) {
  tags$div(
    class = "switchui-button",
    tags$input(type = "checkbox", name = "switchui-color", class = "hidden", id = id, "checked" = FALSE, ...),
    tags$label(class = "btn btn-circle", `for` = id, icon("adjust")),
    tags$script(sprintf(
      "switchUiEnable('%1$s','%2$s','%3$s')",
      id,
      class1,
      class2
    ))
  )
}


#' Create a container without scroolbar
#' @param content html content
#' @export
mxUiNoScroll <- function(content) {
  div(
    class = "no-scrollbar-container no-scrollbar-container-border",
    div(
      class = "no-scrollbar-content",
      content
    )
  )
}

#' Fill with p tags
#' @param n integer number of row
#' @export
fill <- function(n = 1000) {
  lapply(1:n, function(x) {
    tags$p(x)
  })
}


#' Enable fancy scroll inside a mx-grid-container
#' @param HTML content
#' @export
mxScroll <- function(content) {
  tags$ul(
    class = "scrollY mx-grid-row-fill",
    tags$div(
      class = "scrollbarY",
      tags$div(class = "thumb")
    ),
    tags$div(
      class = "viewport",
      tags$div(
        class = "content",
        content
      )
    )
  )
}

#' Fold content
#'
#' Checkbox to fold / toggle visibility of an element. CSS only.
#'
#' @param content {ui}
#' @param labelDictKey {character} label key
#' @param labelText {character} label text
#' @param type {character} fold type : caret or checkbox
#' @param open {boolean} fold open
#' @param classContainer {character} Name of the class for the fold container
#' @param classContent {character} Name of the class for the fold content
#' @param classLabel {character} Name of the class for the label
#' @export
mxFoldOrig <- function(
  content,
  id = NULL,
  labelDictKey = NULL,
  labelText = NULL,
  labelUi = NULL,
  type = "caret",
  open = FALSE,
  classContainer = "fold-container form-group shiny-input-container",
  classContent = "fold-content",
  classLabel = "fold-label",
  classScroll = "mx-scroll-styled") {
  if (isEmpty(id)) id <- randomString()

  foldType <- ifelse(type == "caret", "fold-caret", "fold-check")

  elInput <- tags$input(type = "checkbox", id = id, class = "fold-switch" + " " + foldType)

  if (open) {
    elInput$attribs$checked <- T
  }

  if (isEmpty(labelUi)) {
    label <- tags$label(class = classLabel, `for` = id, `data-lang_key` = labelDictKey, labelText)
  } else {
    label <- tags$label(labelUi, class = classLabel, `for` = id)
  }

  tags$div(
    class = classContainer + " " + foldType,
    elInput,
    label,
    tags$div(
      class = paste(classContent, classScroll),
      content
    )
  )
}
mxFold <- function(
  content,
  labelDictKey = NULL,
  labelText = NULL,
  labelUi = NULL,
  type = "caret",
  open = FALSE) {
  elDetails <- tags$details()

  if (isEmpty(labelUi)) {
    elSummary <- tags$summary(`data-lang_key` = labelDictKey, labelText)
  } else {
    elSummary <- tags$summary(labelUi)
  }

  elDetails <- tagAppendChild(elDetails, elSummary)
  elDetails <- tagAppendChild(elDetails, content)

  if (open) {
    elDetails$attribs$open <- T
  }

  return(elDetails)
}

#' R list to html list
#'
#' Create a html list and apply a class for <ul> and <li>
#'
#' @param listInput list in input
listToHtmlSimple <- function(listInput, lang = "en", dict = config$dict, useFold = TRUE, numberArray = FALSE, maxFold = 2, unboxText = TRUE, valReplace = NULL, maxHeight = NULL) {
  r <- 0
  makeUL <- function(li) {
    r <<- r + 1
    nL <- names(li)
    lL <- length(li)
    UL <- tags$ul(
      class = "list-group mx-scroll-styled",
      style = ifelse(
        isEmpty(maxHeight),
        "",
        sprintf("max-height:%spx", maxHeight)
      )
    )
    if (lL > 0) {
      for (i in 1:lL) {
        name <- nL[[i]]
        if (isEmpty(name)) {
          name <- ifelse(numberArray, i, "")
        }
        # content <- tagList(content, makeLi(li[[i]],name,i))
        LI <- makeLi(li[[i]], name)
        UL <- tagAppendChild(UL, LI)
      }
    }
    r <<- r - 1
    return(UL)
  }

  makeLi <- function(it, ti) {
    ti <- dd(ti, language = lang, dict = dict)

    if (is.list(it) && length(it) > 0 && class(it) != "shiny.tag") {
      classList <- "list-group-item"

      if (useFold && r <= maxFold) {
        content <- mxFold(
          content = makeUL(it),
          labelUi = ti
        )
      } else {
        content <- tags$div(
          tags$b(class = "list-group-title-big", ti),
          tags$div(makeUL(it))
        )
      }

      return(
        tags$li(
          class = classList,
          content
        )
      )
    } else {
      if (isNotEmpty(valReplace) && isNotEmpty(it)) {
        it <- valReplace(it)
      }

      if (unboxText) {
        return(
          tags$div(
            tags$span(class = "list-group-title-small", ti),
            tags$span(it)
          )
        )
      } else {
        return(
          tags$li(
            class = "list-group-item",
            tags$span(class = "list-group-title-small", ti),
            tags$span(it)
          )
        )
      }
    }
  }

  makeUL(listInput)
}




#' Checkbox with custom ui
#'
#' Checkbox with custom ui
#'
#' @param inputId {character} Id of the checkbox
#' @param title {character} Title/Tooltip value
#' @param contentChecked {character} Pseudo element content if checked
#' @param contentUnchecked {character} Pseudo element content if not checked
#' @param class {character} Additional classes
#' @param .. additional tags
#' @export
mxCheckbox <- function(inputId = NULL, ..., onClick = NULL, title = "Toggle", contentChecked = "\\f06e", contentUnchecked = "\\f070", class = "btn btn-default") {
  name <- sprintf(
    "check_%1$s",
    inputId
  )

  classLabel <- sprintf(
    "mx-check-%1$s",
    inputId
  )

  tags$div(
    title = title,
    tags$input(
      onClick = onClick,
      type = "checkbox",
      style = "display:none",
      name = name,
      id = inputId,
      value = "attributes"
    ),
    tags$label(
      class = paste(paste(class, collapse = " "), classLabel),
      `for` = inputId
    ),
    tags$style(
      sprintf(
        "#%1$s ~ .%2$s:before
        {
          font-family:fontawesome;
          content:\"%3$s\";
        }
        #%1$s:checked ~.%2$s:before
        {
          font-family:fontawesome;
          content:\"%4$s\";
        }",
        inputId,
        classLabel,
        contentChecked,
        contentUnchecked
      )
    ),
    tags$div(
      ...
    )
  )
}

#' Simple profanity checker
#' @param {Character} txt String to evaluate
#' @return {Boolean} pass or not
mxProfanityChecker <- function(txt) {
  pass <- TRUE
  words <- .get(config, c("badwords", "words"))

  if (isNotEmpty(txt)) {
    for (dict in words) {
      for (w in dict) {
        n <- nchar(w)
        if (n > 1) {
          if (n < 5) {
            w <- sprintf("\\b%1$s\\b", w)
          }
          if (grepl(w, txt, ignore.case = TRUE)) {
            pass <- FALSE
          }
        }
      }
    }
  }
  return(!isTRUE(pass))
}

mxErrorsToUi <- function(errors = logical(0), warning = logical(0), language = "en") {
  stopifnot(is.logical(errors))
  stopifnot(is.logical(warning))

  errors <- errors[errors]
  warning <- warning[warning]

  errorCode <- names(errors)
  warningCode <- names(warning)

  errorList <- lapply(errorCode, function(e) {
    tags$li(class = "list-group-item mx-error-item", d(e, language))
  })
  warningList <- lapply(warningCode, function(w) {
    tags$li(class = "list-group-item mx-warning-item", d(w, language))
  })

  tags$ul(
    class = "list-group mx-error-list-container",
    errorList,
    warningList
  )
}

mxErrorsLangToUi <- function(errorsList = list(), warningsList = list(0)) {
  errorList <- lapply(errorsList, function(e) {
    tags$li(class = "list-group-item mx-error-item", tags$span("(" + e$language + ")"), d(e$type, e$language))
  })

  warningList <- lapply(warningsList, function(w) {
    tags$li(class = "list-group-item mx-warning-item", tags$span("(" + w$language + ")"), d(w$type, w$language))
  })

  tags$ul(
    class = "list-group mx-error-list-container",
    errorList,
    warningList
  )
}

#' Get app url from session
#'
#' @param session Shiny session
#' @return complete url of the app
mxGetAppUrl <- function(session = shiny::getDefaultReactiveDomain()) {
  urlHost <- session$clientData[["url_hostname"]]
  urlPort <- session$clientData[["url_port"]]
  urlProtocol <- session$clientData[["url_protocol"]]
  urlPort <- ifelse(isNotEmpty(urlPort), sprintf(":%s", urlPort), "")
  return(urlProtocol + "//" + urlHost + urlPort)
}

#' Get project url
#'
#' @param project {Character} id of the project
#' @return {Character} project url
mxGetProjectUrl <- function(project) {
  sprintf("%1$s?project=%2$s", mxGetAppUrl(), project)
}
mxGetProjectLink <- function(project, title) {
  tagList(tags$a(href = mxGetProjectUrl(project), title))
}



#' Create encrypted link for an action
#' @param {Character} id of the action in query parameter
#' @param {List|Character} Parameters of the action.
#' @return {Chracter} The character string of url for this action
mxCreateEncryptedUrlAction <- function(id, value, session = shiny::getDefaultReactiveDomain()) {
  action <- mxDbEncrypt(list(
    id = id,
    data = value,
    timestamp = as.numeric(Sys.time())
  ))
  url <- mxGetAppUrl()


  url <- url + "?action=" + action

  return(url)
}

#' update vt view definition
#' @param {list} view View list
#' @param {list} sourceData List from reactLayerSummary reactive object
#' @param {list} sourceDataMask List from sourceMaskData reactive object
#' @param {list} additionalAttributes List of additional attributes
#' @return view list updated
#' @export
mxUpdateDefViewVt <- function(
  view,
  sourceData = NULL,
  sourceDataMask = NULL,
  additionalAttributes = NULL) {
  #
  # update meta data
  #
  update <- function() {
    layerName <- .get(sourceData, c("layerName"))
    viewData <- .get(view, c("data"))
    meta <- mxDbGetSourceMeta(layerName)


    oldLayer <- .get(viewData, c("source", "layerInfo", "name"))
    newLayer <- .get(sourceData, c("layerName"))
    layerChanged <- !identical(oldLayer, newLayer)

    oldVariable <- .get(viewData, c("attribute", "name"))
    newVariable <- .get(sourceData, c("variableName"))
    variableChanged <- !identical(oldVariable, newVariable)

    #
    # Source info
    #
    sourceInfo <- list(
      type = "vector",
      attribution = as.character(
        tags$a(
          href = .get(meta, c("origin", "homepage", "url")),
          .get(meta, c("text", "title", "en"))
        )
      ),
      layerInfo = list(
        name = .get(sourceData, c("layerName")),
        maskName = .get(sourceDataMask, c("layerMaskName"))
      )
    )
    #
    # Attributes info
    #
    attributesInfo <- list(
      name = .get(sourceData, c("variableName")),
      type = .get(sourceData, c("variableType")),
      names = as.list(
        unique(
          c(
            .get(sourceData, c("variableName"),list()),
            additionalAttributes
          )
        )
      )
    )
    #
    # Geom info
    #
    geomInfo <- list(
      type = .get(sourceData, c("geomType"))
    )

    #
    # Update view data
    #


    viewData <- .set(viewData, c("attribute"), attributesInfo)
    viewData <- .set(viewData, c("source"), sourceInfo)
    viewData <- .set(viewData, c("geometry"), geomInfo)

    #
    # set style default
    #
    style <- .get(viewData, c("style"))

    if (isEmpty(style) || variableChanged || layerChanged) {
      viewData <- .set(viewData, c("style"), list())
    }

    if (geomInfo$type == "lines") {
      viewData <- .set(viewData, c("style", "spriteEnable"), FALSE)
    }

    view <- .set(view, c("data"), viewData)

    return(view)
  }

  view <- update()

  return(view)
}
