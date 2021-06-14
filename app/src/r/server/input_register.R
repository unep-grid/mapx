

#removeInputHandler("mx.jsonchunk")

#registerInputHandler("mx.jsonchunk", function(chunk,session,name){

  #dirUpload <- config[["uploadDirPath"]]
  #fileName <- chunk$fileName
  #process <- chunk$id
  #chunkLength <- chunk$length

  #filePath <- paste(dirUpload,fileName,sep="/")
  #if(file.exists(filePath)){
    #file.remove(filePath)
  #}

  #cat(chunk$data,file=sprintf("%1$s/%2$s.%3$s",dirUpload,process,chunk$idPart))
  #fileList <- list.files(dirUpload,pattern=sprintf("^%1$s",process),full.names=T)


   #if( length(fileList) == chunkLength ){

    #file.create(filePath)

    #for(f in fileList){
      #file.append(filePath,f)
      #file.remove(f)
    #}

    #return(filePath)

  #}

#})




