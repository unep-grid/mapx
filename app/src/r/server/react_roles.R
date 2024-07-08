#
# Test if current logged user is guest
#
isGuestUser <- reactive({
  a <- .get(reactUser, c("data", "email"))
  b <- .get(config, c("mail", "guest"))

  if (isEmpty(a) || isEmpty(b)) stop("User can't be identified")
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
  # DB roles
  # - not complete roles : missing global roles
  #
  roles <- mxDbGetProjectUserRoles(idUser, idProject)

  #
  # Global roles
  # - Developer : should also be a project publisher to consolidate the role
  #
  isGuest <- isGuestUser()
  isRoot <- mxIsUserRoot(idUser)
  isDev <- roles$publisher && mxIsUserDev(idUser)

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
