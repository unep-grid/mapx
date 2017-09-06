#
# Map-x (c) unepgrid 2017-present
#

#
# UI for the tabs : views, tools and settings 
#

tagList(
  div(
    class="left-column transparent shadow tabs-main tab-layers",
    id="tabLayers",
    mxSource("src/ui/tab_views.R")
    ),
  div(
    class="left-column transparent shadow tabs-main tab-tools mx-hide",
    id="tabTools",
    mxSource("src/ui/tab_tools.R")
    ),
  div(
    class="left-column transparent shadow tabs-main tab-settings mx-hide",
    id="tabSettings",
    mxSource("src/ui/tab_settings.R")
    )
  )









