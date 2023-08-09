

#' Create new project
#'
#' @param session Shiny session object.
#' @export
mxProjectAdd <- function(
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxProjectAdd",
    list(
      update = runif(1)
    )
  )
}




#' Edit source request
#'
#' @param idTable Id table
#' @param session Shiny session object.
#' @export
mxEditTable <- function(
  idTable = NULL,
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxEditTable",
    list(
      update = runif(1),
      id_table = idTable
    )
  )
}

#' Open the uploader
#'
#' @param session Shiny session object.
#' @export
mxUploader <- function(
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxUploader",
    list(
      update = runif(1)
    )
  )
}


#' Edit source select list modal
#'
#' @param session Shiny session object.
#' @export
mxShowSelectSourceEdit <- function(
  id = NULL,
  update = runif(1),
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxShowSelectSourceEdit",
    list(
      update = update,
      id = id
    )
  )
}




#' Geometry tool request
#'
#' @param idTable Id table
#' @param session Shiny session object.
#' @export
mxGeomTools <- function(
  idTable = NULL,
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxGeomTools",
    list(
      id_table = idTable
    )
  )
}


#' Update / Rebuild geoserver request
#'
#' @param recalcStyle Also recalc styles / save new view version
#' @param session Shiny session object.
#' @export
mxGeoserverRebuild <- function(
  recalcStyle = FALSE,
  session = shiny:::getDefaultReactiveDomain()
) {
  session$sendCustomMessage(
    type = "mxGeoserverRebuild",
    list(
      recalcStyle = isTRUE(recalcStyle)
    )
  )
}


#' Set user id
#' @param userData {list} list of user data such as id, email, nickname
#' @export
mxUpdateSettings <- function(settings, session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxUpdateSettings", settings)
}




#' Toggle disabling of given button, based on its id.
#'
#' Action or other button can be disabled using the attribute "disabled". This function can update a button state using this method.
#'
#' @param id Id of the button.
#' @param session Shiny session object.
#' @param disable State of the button
#' @export
mxToggleButton <- function(id, disable = TRUE, warning = FALSE, session = shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    disable = disable,
    warning = warning
  )
  session$sendCustomMessage(
    type = "mxButtonToggle",
    res
  )
}

#' Alter checkbox input
#'
#'
#' @param id Id of the input.
#' @param disable Disabled
#' @param checked Checked
#' @param session Shiny session object.
#' @export
mxUpdateCheckboxInput <- function(id, disabled = NULL, checked = NULL, session = shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    disabled = disabled,
    checked = checked
  )
  session$sendCustomMessage(
    type = "mxUpdateCheckboxInput",
    res
  )
}


#' Send a message to js console
#' @param {character} text Text to send
#' @session {reactive} Shiny reactive object
#' @export
mxDebugToJs <- function(text, session = getDefaultReactiveDomain()) {
  if (!noDataCheck(session)) {
    res <- session$sendCustomMessage(
      type = "mxJsDebugMsg",
      list(
        date = Sys.time(),
        msg = text
      )
    )
  } else {
    mxDebugMsg(text)
  }
}


#' Toggle disabling of given button, based on its id.
#'
#' Action or other button can be disabled using the attribute "disabled". This function can update a button state using this method.
#'
#' @param id Id of the button.
#' @param session Shiny session object.
#' @param disable State of the button
#' @export
mxActionButtonState <- function(id, disable = FALSE, warning = FALSE, session = shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    disable = disable,
    warning = warning
  )
  session$sendCustomMessage(
    type = "mxSetButonState",
    res
  )
}


#' Control visbility of elements
#'
#' Display or hide element by id, without removing element AND without having element's space empty in UI. This function add or remove mx-hide class to the element.
#'
#' @param session Shiny session
#' @param id Id of element to enable/disable
#' @param enable Boolean. Enable or not.
#' @export
mxUiHide <- function(id = NULL, class = NULL, disable = TRUE, hide = TRUE, hideClass = "mx-hide", session = shiny:::getDefaultReactiveDomain()) {
  out <- jsonlite::toJSON(list(
    id = id,
    class = class,
    hide = hide,
    disable = disable,
    hideClass = hideClass
  ), auto_unbox = T)


  session$sendCustomMessage(
    type = "mxUiHide",
    out
  )
}

#' remove element by class or id
#' @param session default shiny session
#' @param class class name to remove
#' @param id id to remove
#' @export
mxRemoveEl <- function(session = getDefaultReactiveDomain(), class = NULL, id = NULL) {
  if (is.null(class) && is.null(id)) {
    return()
  }

  sel <- ifelse(
    is.null(class),
    paste0("#", id),
    paste0(".", class)
  )

  res <- list(
    element = sel
  )

  session$sendCustomMessage(
    type = "mxRemoveEl",
    res
  )
}



#' Update text by id
#'
#' Search for given id and update content.
#'
#' @param session Shiny session
#' @param id Id of the element
#' @param text New text
#' @export
mxUpdateText <- function(id, text = NULL, ui = NULL, addId = FALSE, session = shiny:::getDefaultReactiveDomain()) {
  if (is.null(text) && is.null(ui)) {
    return(NULL)
  } else {
    if (is.null(ui)) {
      textb64 <- mxEncode(text)
      val <- list(
        id = id,
        txt = textb64,
        addId = addId
      )
      session$sendCustomMessage(
        type = "mxUpdateText",
        val
      )
    } else {
      session$output[[id]] <- renderUI(ui)
    }
  }
}


#' Update value by id
#'
#' Search for given id and update value.
#'
#' @param session Shiny session
#' @param id Id of the element
#' @param  value New text value
#' @export
mxUpdateValue <- function(id, value, session = shiny:::getDefaultReactiveDomain()) {
  if (is.null(value) || is.null(id)) {
    return()
  } else {
    res <- list(
      id = id,
      val = value
    )
    session$sendCustomMessage(
      type = "mxUpdateValue",
      res
    )
  }
}

#' Convert list to html, client side
#'
#' Search for given id and update value.
#'
#' @param session Shiny session
#' @param id Id of the element
#' @param  data List to convert
#' @export
mxJsonToHtml <- function(id, data, session = shiny:::getDefaultReactiveDomain()) {
  if (is.null(data) || is.null(id)) {
    return()
  } else {
    session$sendCustomMessage(
      type = "mxJsonToHtml",
      list(
        id = id,
        data = jsonlite::toJSON(data, auto_unbox = T)
      )
    )
  }
}


#' Save named list of value into cookie
#'
#'
#' @param session Shiny session object. By default: default reactive domain.
#' @param cookie Named list holding paired cookie value. e.g. (list(whoAteTheCat="Alf"))
#' @param expireDays Integer of days for the cookie expiration
#' @param read Boolean. Read written cookie
#' @return NULL
#' @export
mxSetCookie <- function(
  cookie = NULL,
  expireDays = NULL,
  deleteAll = FALSE,
  reloadPage = FALSE,
  session = getDefaultReactiveDomain()
) {
  cmd <- list()
  cmd$domain <- session$url_hostname
  cmd$path <- session$url_pathname
  cmd$deleteAll <- deleteAll
  cmd$cookie <- cookie
  cmd$reload <- reloadPage

  cmd$expiresInSec <- expireDays * 86400

  session$sendCustomMessage(
    type = "mxSetCookie",
    cmd
  )
}

#' Progress bar controller
#' @param id id of the bar
#' @param percent Integer progress percent
#' @param enable Boolean progress bar enable
#' @param text Character Text of the progress bar
#' @param session Shiny session object
#' @export
mxProgress <- function(id = "default", text = "", percent = 1, enable = TRUE, session = shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    enable = enable,
    text = text,
    percent = percent
  )

  session$sendCustomMessage(
    type = "mxProgress",
    res
  )
}


#' Update selectize input
#' @param {character} id of the input
#' @param {list} List of items. Keys should be the same as the input. eg "list(list('label'='label','value'='test'))"
mxUpdateSelectizeItems <- function(id, items, session = shiny:::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxUpdateSelectizeItems", list(
    id = id,
    items = items
  ))
}


#' Init all selectize input in children elements
#' @param {character} id of the input
mxInitSelectizeAll <- function(id, session = shiny:::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxInitSelectizeAll", list(
    selector = "#" + id,
  ))
}
#' Create a modal window
#' @param id {string} Id of the modal
#' @param close {logical} Ask to close an existing modal
#' @param replace {logical} Ask to replace an existing modal
#' @param title {character|shiny.tag} Optional title
#' @param zIndex {Number} set zIndex
#' @param subtitle {character|shiny.tag} Optional subtitle
#' @param content {character|shiny.tag} Optional content
#' @param buttons {list} Optional ActionButton list
#' @param minHeight {String} Optional min height of the modal window. String. Eg. "500px"
#' @param minWidth {String} Optional min width of the modal window. String. Eg. "500px"
#' @param addBackground {logical} Add a background
#' @param addSelectize {logical} Add selectize
#' @param addBtnMove {logical} Add move buttons
#' @param removeCloseButton {logical} Remove close button
#' @param textCloseButton {character|shiny.tag} Text of the default close button
#' @param session {shiny.session} Default session object
mxModal <- function(
  id = NULL,
  close = F,
  replace = T,
  zIndex = NULL,
  title = NULL,
  subtitle = NULL,
  content = NULL,
  buttons = NULL,
  minHeight = NULL,
  minWidth = NULL,
  addSelectize = NULL,
  addBackground = T,
  addBtnMove = FALSE,
  removeCloseButton = F,
  textCloseButton = "ok",
  session = shiny::getDefaultReactiveDomain()) {
  if (!noDataCheck(buttons) && is.list(buttons)) {
    buttons <- lapply(buttons, function(b) {
      as.character(b)
    })
  }

  session$sendCustomMessage(
    type = "mxModal",
    list(
      id = id,
      replace = as.logical(replace),
      zIndex = as.numeric(zIndex),
      title = as.character(title),
      subtitle = as.character(subtitle),
      textCloseButton = as.character(textCloseButton),
      buttons = as.character(buttons),
      minHeight = as.numeric(minHeight),
      minWidth = as.numeric(minWidth),
      content = as.character(content),
      addBackground = as.logical(addBackground),
      addSelectize = as.logical(addSelectize),
      removeCloseButton = as.logical(removeCloseButton),
      addBtnMove = as.logical(addBtnMove),
      close = as.logical(close)
    )
  )
}

#' Update URL params
#'
#' Update url using a list of key pair values in a list
#'
#' @param data {List} List of key par values. eg. list("x"=2)
#' @param session {Session} Shiny session
mxUpdateQueryParameters <- function(data = list(), session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxSetQueryParametersUpdate", data)
}

#' Validate metadata
#'
#' Update url using a list of key pair values in a list
#'
#' @param metadata {List} Metadata to validate
#' @param session {Session} Shiny session
mxValidateMetadataModal <- function(metadata = list(), session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxValidateMetadataModal", list(
    metadata = metadata
  ))
}

#' Display an flash icon
#' @param icon {Character} Fontawesome icon to display
mxFlashIcon <- function(icon = "cog", text = "", update = runif(1), session = shiny::getDefaultReactiveDomain()) {
  session$sendCustomMessage("mxFlashIcon", list(
    icon = icon
  ))
}

#' Notification binding
#'
#' @param notif {List} notif list with at least msg and type param
#' @param update {Any} Ignore cached request, if any.
#' @param session {Session} Shiny session
#' @return
mxNotify <- function(notif, update = runif(1), session = shiny::getDefaultReactiveDomain()) {
  isList <- is.list(notif)
  hasMsg <- isList && !noDataCheck(notif$message)
  hasType <- isList && !noDataCheck(notif$type)
  hasSession <- !noDataCheck(session)
  if (hasSession && isList && hasMsg && hasType) {
    notif$timestamp <- as.numeric(Sys.time()) * 1000
    session$sendCustomMessage("mxNotify", list(
      update = update,
      notif = notif
    ))
  }
}
