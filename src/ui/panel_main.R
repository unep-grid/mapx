#
# Map-x (c) unepgrid 2017-present
#


#
# UI for the tabs : views, tools and settings 
#
div(
  class="mx-panels",
  div(
    class="mx-panels-main",
    div(
      class="mx-panel mx-panel-left transparent shadow panels-main panel-layers",
      id="tabLayers",
      mxSource("src/ui/panel_views.R")
      ),
    div(
      class="mx-panel mx-panel-left transparent shadow panels-main panel-tools mx-hide",
      id="tabTools",
      mxSource("src/ui/panel_tools.R")
      ),
    div(
      class="mx-panel mx-panel-left transparent shadow panels-main panel-settings mx-hide",
      id="tabSettings",
      mxSource("src/ui/panel_settings.R")
      )
    ),
  div(
    class="mx-panel-bottom mx-panel transparent shadow panel-bottom panel-dashboard mx-hide-back",
    div(
      class="mx-panel-dashboards",
      id="mxDashboards"
      )
    )
  )

