#
# If no JS, display a message, hide  div with id content
#
tags$noscript(
  tags$h2("Please enable JavaScript to use map-x"),
  tags$style(
    type="text/css",
    ".mx .left-column {display:none}"
    )
  )
