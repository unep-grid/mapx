#
# Batch update
#
usersId <- mxDbGetQuery("select id, data#>'{\"admin\",\"roles\"}'->0#>>'{\"role\"}' as role from mx_users")

for(i in 1:nrow(usersId)){
  u =  usersId[i,]
  if(u$role=="editor"){
    mxDebugMsg(u)
    mxDbUpdate(
      table="mx_users",
      idCol="id",
      id=u$id,
      column="data",
      path=c("admin","roles"),
      value=list( 
        list(
          role="publisher",
          project="world"
          )
        )
      )
  }
}
