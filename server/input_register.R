


geojson <- c()

removeInputHandler("mx.jsonchunk")

registerInputHandler("mx.jsonchunk", function(chunk,session,name){

  mxDebugMsg(paste("Received chunk",chunk$part,"on",chunk$length))

  if(chunk$part == 1) geojson <<- c()

  geojson[chunk$part] <<- chunk$data

  if(chunk$part==chunk$length){
  
    data <- paste(geojson,collapse="")
   
    valid <- jsonlite::validate(data)

    if(!valid) {
      browser()
      stop(attributes(valid)$err)
    }
    return(fromJSON(data,simplifyVector=FALSE))
  }else{
    return(NULL)
  }

})




