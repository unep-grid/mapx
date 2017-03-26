
#
# Final bar main
#


tagList(
  div(
    class="left-column transparent shadow tabs-main tab-layers",
    id="tabLayers",
    mxSource("ui/tab_views.R")
    ),
  div(
    class="left-column transparent shadow tabs-main tab-tools mx-hide",
    id="tabTools",
    mxSource("ui/tab_tools.R")
    ),
  div(
    class="left-column transparent shadow tabs-main tab-settings mx-hide",
    id="tabSettings",
    mxSource("ui/tab_settings.R")
    )
  )









