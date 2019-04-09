#
# Map-x (c) unepgrid 2017-present
#

#
# No script tag
#

# Set no script if javascript is missong
tags$noscript(
  tags$p("Please enable JavaScript to use MapX"),
  tags$style(
    type="text/css",
    ".mx .left-column {display:none}"
    )
  )
