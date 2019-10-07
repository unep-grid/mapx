#
# Test if current logged user is guest
#
isGuestUser <- reactive({
   a <-  .get(reactUser,c("data","email"))
   b <-  .get(config,c("mail","guest"))   
   if(noDataCheck(a)||noDataCheck(b)) stop("User can't be identified")
   return(a == b)
})

#
# Get user role
#
getUserRole <- reactive({

  mxDebugMsg("get user roles")

  roles <- list()
  idProject <- reactData$project
  idUser <- reactUser$data$id
  
  roles <- mxDbGetProjectUserRoles(idUser,idProject)

 return(roles)


})


