#
# React list of collections
#
reactIpInfo <- reactive({
   data <- input$clientIpData
   if(noDataCheck(data)){
     data <- list()
   }
   data
})

reactIp <- reactive({
  reactIpInfo()$ip
})
