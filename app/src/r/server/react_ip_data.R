#
# React list of collections
#
reactIpInfo <- reactive({
   data <- input$clientIpData
   if(isEmpty(data)){
     data <- list()
   }
   data
})

reactIp <- reactive({
  reactIpInfo()$ip
})
