#
# Init config
#
config <- list()

#
# Libary manager
#
library(checkpoint)

checkpoint(
  snapshotDate = "2016-11-30",
  checkpointLocation = normalizePath("~/.mapx/",mustWork=F)
  )



