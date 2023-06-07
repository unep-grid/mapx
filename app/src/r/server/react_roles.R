#
# Test if current logged user is guest
#
isGuestUser <- reactive({
  a <- .get(reactUser, c("data", "email"))
  b <- .get(config, c("mail", "guest"))

  if (noDataCheck(a) || noDataCheck(b)) stop("User can't be identified")
  return(identical(a, b))
})

#
# Get user role
#
getUserRole <- reactive({
  roles <- list()
  idProject <- reactData$project
  idUser <- reactUser$data$id

  #
  # Session roles
  #
  isGuest <- isGuestUser()
  isRoot <- mxIsUserRoot(idUser)
  isDev <- mxIsUserDev(idUser)

  #
  # DB roles
  #
  roles <- mxDbGetProjectUserRoles(idUser, idProject)

  #
  # Add session roles to groups
  #
  if (isDev) {
    roles$groups <- c(roles$groups, "developers")
  }
  if (isRoot) {
    roles$groups <- c(roles$groups, "roots")
  }
  roles$developer <- isDev
  roles$root <- isRoot
  roles$guest <- isGuest # eq. to roles$groups => public

  return(roles)
})

#
# Concatenate id user and project
# -> Can be used to trigger update of views list
# exemple: 145@MX-QNN-G0C-I6F-GZB-MPA
#
getUserAtProject <- reactive({
  idProject <- reactData$project
  idUser <- reactUser$data$id
  sprintf("%s@%s", idUser, idProject)
})
