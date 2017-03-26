#
# Init config
#
config <- list()

#
# Checkpoint configuration
#
config[["checkpoint"]] <- list(
 date = "2016-11-30",
 pathRoot = normalizePath("~/.mapx/",mustWork=F),
 pathInstall = normalizePath("~/.mapx/.checkpoint/",mustWork=F)
)

#
# Libary manager
#
library(checkpoint)

# If there is no folder for checkpoint, initialize. 
if(! dir.exists(config[[c("checkpoint","pathInstall")]]) ){
  print("checkpoint not yet initialised, this will take a while")
  dir.create(config[[c("checkpoint","pathInstall")]],recursive=T)
  checkpoint(
    snapshotDate = config[[c("checkpoint","date")]],
    checkpointLocation = config[[c("checkpoint","pathRoot")]]
    )
}else{
  checkpoints = list.files(
    config[[c("checkpoint","pathInstall")]],
    recursive=F,
    pattern="\\d{4}-\\d{2}-\\d{2}"
    )
  if( length(checkpoints)>0 ){
    checkpointLast = max(checkpoints)
    checkpointPath = c(
      checkpoint:::checkpointPath(checkpointLast,config[[c("checkpoint","pathRoot")]]),
      checkpoint:::checkpointBasePkgs(checkpointLocation=config[[c("checkpoint","pathRoot")]])
      )
    .libPaths(c(checkpointPath,.libPaths()))
  }else{
    checkpoint(
      snapshotDate = config[[c("checkpoint","date")]],
      checkpointLocation = config[[c("checkpoint","pathRoot")]]
      )
  }
}

