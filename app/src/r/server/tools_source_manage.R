# Thin compatibility bridge retained for the Shiny toolbar and SDK resolver.
observeEvent(input$btnEditSourceSettings, {
  mglOpenSourceSettings()
})

# Keep the legacy views list synchronized until its owner is migrated.
observeEvent(input$mx_client_source_settings_changed, {
  reactData$updateViewsList <- runif(1)
})
