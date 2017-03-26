#
# Client 
#

#
# set ressouce path
#
mxSetResourcePath(config[["resources"]])

#
# main ui frame
#
tagList(
  mxSource("ui/header.R"),
  tags$body(class="switchui full-page white",
      tags$div(id="cookies",class="shinyCookies"),
      mxSource("ui/modals.R"),
      mxSource("ui/bar_main.R"),
      mxSource("ui/map.R")
    )
  )

