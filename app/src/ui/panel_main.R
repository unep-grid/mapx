#
# Map-x (c) unepgrid 2017-present
#


#
# UI for the tabs : views, tools and settings 
#
div(
  class="mx-panels-container",
  div(
    class="mx-panel-left mx-panel-views transparent shadow mx-hide-start",
    mxSource("src/ui/panel_views.R")
    ),
  div(
    class="mx-panel-left mx-panel-tools transparent shadow mx-hide",
    mxSource("src/ui/panel_tools.R")
    ),
  div(
    class="mx-panel-left mx-panel-settings transparent shadow mx-hide",
    mxSource("src/ui/panel_settings.R")
    ),
  div(
    class="mx-panel-right mx-events-off",
    div(
      class="mx-panel-dashboards",
      div(
        class="mx-panel-dashboards-scroll mx-events-on",
        id="mxDashboards"
        )
      )
    )
  )

