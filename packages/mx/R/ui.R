

mxButton <- function (inputId, labelId = NULL, class = NULL )
{
  class <- paste0(class, collapse=" ")
  tags$button(
    id = inputId,
    type = "button",
    class = sprintf("btn btn-default action-button %s",class),
    `data-lang_key` = labelId
    )
}




#' Create a modal window
#' @param id {string} Id of the modal
#' @param close {logical} Ask to close an existing modal
#' @param replace {logical} Ask to replace an existing modal
#' @param title {character|shiny.tag} Optional title 
#' @param subtitle {character|shiny.tag} Optional subtitle
#' @param content {character|shiny.tag} Optional content
#' @param buttons {list} Optional ActionButton list
#' @param addBackground {logical} Add a background
#' @param removeCloseButton {logical} Remove close button
#' @param textCloseButton {character|shiny.tag} Text of the default close button
#' @param session {shiny.session} Default session object
mxModal = function(id=NULL,close=F,replace=T,title=NULL,subtitle=NULL,content=NULL,buttons=NULL,addBackground=F,removeCloseButton=F,textCloseButton="ok",session=shiny::getDefaultReactiveDomain()){

  stopifnot(!noDataCheck(id))

  if(!noDataCheck(buttons) && is.list(buttons)){
    buttons <- lapply(buttons,function(b){as.character(b)})
  }

  session$sendCustomMessage(
    type="mxModal",
    list(
      id=id,
      replace=as.logical(replace),
      title=as.character(title),
      subtitle=as.character(subtitle),
      textCloseButton=as.character(textCloseButton),
      buttons=buttons,
      content=as.character(content),
      addBackground=as.logical(addBackground),
      removeCloseButton=as.logical(removeCloseButton),
      close=as.logical(close)
      )
    )
}
#' Create a modal panel
#'
#' Create a modal panel with some options as custom button, close button, html content. 
#'
#' @param id Panel id
#' @param title Panel title
#' @param subtitle Panel subtitle
#' @param html HTML content of the panel, main text
#' @param zIndex base zIndex for the panel and background
#' @param listActionButton If FALSE, hide buttons. If NULL, display default close panel button, with text given in defaultButtonText. If list of buttons, list of button.
#' @param defaultButtonText Text of the default button if listActionButton is NULL and not FALSE
#' @param style Additional CSS style for the panel 
#' @param class Additional class for the panel
#' @param hideCloseButton Boolean. Hide the close panel button
#' @param draggable Boolean. Set the panel as draggable
#' @export
mxPanel<- function(
  id="default",
  title=NULL,
  headIcon=NULL,
  subtitle=NULL,
  html=NULL,
  zIndex=500,
  listActionButton=NULL,
  background=TRUE,
  addCloseButton=FALSE,
  addOnClickClose=TRUE,
  closeButtonText="OK",
  style=NULL,
  class=NULL,
  hideHeadButtonClose=TRUE,
  draggable=TRUE,
  fixed=TRUE,
  defaultTextHeight=150
  ){ 

  rand <- randomString(splitIn=1,addLetters=T)

  idBack <- paste("mx_modal_background",id,rand,sep="_")
  idContent <- paste("mx_modal_content",id,rand,sep="_")
  jsHide <- sprintf("mx.util.hide({id:'%1$s'}); mx.util.hide({id:'%2$s'})"
    , idContent
    , idBack
    )

  #
  # Handle on click close for all buttons
  #
  if(!is.null(listActionButton) && isTRUE(addOnClickClose)){
    listActionButton <- lapply(
      listActionButton,
      function(x){
        x$attribs$onclick<-jsHide
        return(x)
      }
      )
  }  

  #
  # Handle default close button
  #
  if(addCloseButton || is.null(listActionButton)){
    listActionButton <- tagList(
      listActionButton,
      tags$button(onclick=jsHide,closeButtonText,class="btn btn-modal")
      )
  }

  #
  # Remove buttons if logical false
  #
  if(isTRUE(is.logical(listActionButton) && !isTRUE(listActionButton))) listActionButton=NULL

  #
  # handling close button in top
  #
  if(hideHeadButtonClose){
    closeButton=NULL
  }else{
    closeButton=tags$button(href="#",class="btn btn-default", onclick=jsHide,icon('times'))
  }

  #
  # Handle background removal
  #
  if(background){
    backg <- div(id=idBack,class=paste("mx-modal-background"),style=sprintf("z-index:%s",zIndex))
  }else{
    backg <- character(0)
  }


  #
  # handle draggable
  #
  if(draggable){
    scr <- tags$script(sprintf('
        mx.util.draggable({
          id:"%1$s",
          disable:[]
        })'
        , idContent
        )
      )
    
    #dragButton = tags$span(class="mx-modal-drag-button btn btn-default",icon('arrows'),style="cursor:move")

    dragButton = ""
  }else{
    scr = ""
    dragButton = ""
  }

  #
  # Handle title 
  #
  title = div(
    class="",
    tags$span(
      icon( headIcon ),
      style = "font-size:30px"
      ),
    div(
      class="",
      title
      ),
    div(
      class="",
      subtitle
      )
    )


  #
  # Info text
  #
  infoText = tags$div(
    class="mx-modal-info-text",
    p(
      id=sprintf("%s_infoText",id)
      )
    )

  #
  # Final object
  #
  out <- tagList(
    backg,
    div(
      id=idContent,
      style=sprintf("z-index:%s",zIndex+1),
      class="mx-modal-container",
      div(
        class="mx-modal-top mx-modal-drag-enable",
        closeButton,
        dragButton
        ),
      div(
     class="mx-modal-head",
     title
        ),
      div(
        class="mx-modal-body",
          html
        ),
      div(
        class="mx-modal-foot",
        infoText,
        listActionButton
        )
      ),
    scr
    )


  return(out)
}
#' Alert panel
#'
#' Create an alert panel. This panel could be send to an output object from a reactive context. 
#'
#' @param title Title of the alert. Should be "error", "warning" or "message"
#' @param subtitle Subtitle of the alert
#' @param message html or text message for the alert
#' @param listActionButtons List of action button for the panel
#' @export
mxPanelAlert <- function(title=c("error","warning","message"),subtitle=NULL,message=NULL,listActionButton=NULL,...){ 
  title = match.arg(title)
  switch(title,
    'error'={title=h2(icon("frown-o"))},
    'warning'={title=h2(icon("frown-o"))},
    'message'={title=h2(icon("info-circle"))} 
    )
  mxPanel(class="panel-overall panel-fixed",title=title,subtitle=subtitle,html=message,listActionButton=listActionButton,style="position:fixed;top:100px",...)
}
#' Password input
#'
#' Create a password input.
#' 
#' @param inputId Input id
#' @param label Label to display
#' @export
mxInputPassword <- function(inputId, label) {
  tagList(
    tags$input(id = inputId,placeholder=label,class="mx-login-input",type="password", value="")
    )
}

#' User name input
#' 
#' Create a username input
#' 
#' @param inputId Input id
#' @param label Label to display
#' @export
mxInputUser <- function(inputId, label,class="form-control") {
  tags$input(
    id = inputId, 
    placeholder=label,
    class=paste("mx-login-input",class),
    value="",
    autocomplete="off",
    autocorrect="off", 
    autocapitalize="off",
    spellcheck="false"
    )
}





#' Create a bootstrap accordion 
#'
#' Create a bootstrap accordion element, based on a named list.
#'
#' @param id Accordion group ID
#' @param style Additional style. 
#' @param show Vector of item number. Collapse all item except those in this list. E.g. c(1,5) will open items 1 and 5 by default. 
#' @param itemList Nested named list of items, containing title and content items. E.g. list("foo"=list("title"="foo","content"="bar"))
#' @examples 
#' mxAccordionGroup(id='superTest',
#'  itemList=list(
#'    'a'=list('title'='superTitle',content='acontent'),
#'    'b'=list('title'='bTitle',content='bContent'))
#'  )
#' @export
mxAccordionGroup <- function(id,style=NULL,show=NULL,itemList){
  if(is.null(style)) style <- ""
  cnt=0
  contentList<-lapply(itemList,function(x){
    cnt<<-cnt+1
    ref<-paste0(subPunct(id,'_'),cnt)
    showItem<-ifelse(cnt %in% show,'collapse.in','collapse')
    stopifnot(is.list(x) || !noDataCheck(x$title) || !noDataCheck(x$content))

    onShow <- ifelse(noDataCheck(x$onShow),"",x$onShow)
    onHide <- ifelse(noDataCheck(x$onHide),"",x$onHide)

    if(is.null(x$condition)) x$condition="true"
    div(
      style=style,
      class=paste("mx-accordion-item",x$class),
      `data-display-if`=x$condition,
      div(
        class="mx-accordion-header",
        tags$span(
          class="mx-accordion-title",
          tags$a('data-toggle'="collapse", 
            'data-parent'=paste0('#',id),
            href=paste0("#",ref),x$title
            )
          )
        ),
      div(
        id=ref,
        class=paste("mx-accordion-collapse",showItem
          ),
        div(
          class="mx-accordion-content",
          x$content
          ),
        tags$script(
          sprintf('
            $("#%1$s").on("show.bs.collapse", function () {
              %2$s
}).on("hide.bs.collapse", function () {
%3$s
    }); 
            '
            , ref
            , onShow
            , onHide
            )
          )
        )
      )
})

  return(div(class="mx-accordion-group",id=id,
      contentList
      )
    )
}
#' Custom file input 
#'
#' Default shiny fileInput has no option for customisation. This function allows to fully customize file input using the label tag.
#'
#' @param inputId id of the file input
#' @param label Label for the input
#' @param fileAccept List of accepted file type. Could be extension.
#' @param multiple  Boolean. Allow multiple file to be choosen. Doesn't work on all client.
#' @export
mxFileInput<-function (inputId, label, fileAccept=NULL, multiple=FALSE){
  inputTag<-tags$input(
    type='file',
    class='upload',
    accept=paste(fileAccept,collapse=','),
    id=inputId,
    name=inputId)
  if(multiple) inputTag$attribs$multiple='multiple'
  spanTag <- tags$span(label)
  inputClass <- tags$label(
    class=c('btn-browse btn btn-default'),
    id=inputId,
    spanTag,
    inputTag
    )
  tagList(inputClass,
    tags$div(id = paste(inputId,"_progress", sep = ""), 
      class = "progress progress-striped active shiny-file-input-progress",
      tags$div(class = "progress-bar"), tags$label()))
}

#' Custom select input
#'
#' Custom empty select input, updated later.
#'
#' @param inputId Element id
#' @param labelId Id of label

mxSelect <- function(inputId,class="",values=NULL,valuesLabels=NULL,optionAttr=NULL,optionAttrValues=NULL){


  attr <- character(1)
  opt <- character(1)
  val <- character(1)

  hasValues <- length(values) > 0
  hasValueLabels <- !is.null(valuesLabels) && length(valuesLabels) == length(values)
  hasAttr <- !is.null(optionAttr)
  hasAttrOpt <- !is.null(optionAttrValues) && length(optionAttrValues) == length(values)

  if(!hasValueLabels) valuesLabels <- values

  if(hasAttr && hasAttrOpt) attr <- sprintf("%1$s=\"%2$s\"",optionAttr,optionAttrValues)

  if(hasValues) val <- sprintf("value=\"%1$s\"",values)

  if(length(valuesLabels)>0){
    opt <- sprintf("<option %1$s %2$s >%3$s</option>\n",attr,val,valuesLabels)
  }

  #tags$div(
    #class = sprintf("form-group shiny-input-container %s",paste(class,collapse=" ")),
    #class = sprintf(" %s",paste(class,collapse=" ")),
    tags$select(
      id=inputId,
      #class="selectpicker",
      HTML(opt)
      )
    #)
}







#' Create button to change ui color
#' @param {string} id Id of the generated button
#' @export
mxUiColorSwitch <- function(id,class1="white",class2="black",...){
  tags$div(
    class="switchui-button",
    tags$input(type="checkbox",name="switchui-color",class="hidden",id=id,"checked"=FALSE,...),
    tags$label(class="btn btn-circle",`for`=id,icon("adjust")),
    tags$script(sprintf(
        "switchUiEnable('%1$s','%2$s','%3$s')"
        ,id
        ,class1
        ,class2
        )
      )
    )
}


#' Create a container without scroolbar
#' @param content html content
#' @export
mxUiNoScroll <-  function(content){
  div(class="no-scrollbar-container no-scrollbar-container-border",
    div(class="no-scrollbar-content",
      content
      )
    )
}

#' Fill with p tags
#' @param n integer number of row
#' @export
fill <- function(n=1000){
  lapply(1:n,function(x){tags$p(x)})
}


#' Enable fancy scroll inside a mx-grid-container
#' @param HTML content
#' @export
mxScroll <- function(content){
  tags$ul(class="scrollY mx-grid-row-fill",
    tags$div(class="scrollbarY",
      tags$div(class="thumb")
      ),
    tags$div(class="viewport",
      tags$div(class="content",
        content
        )
      )
    )
}

#' Fold content
#' 
#' Checkbox to fold / toggle visibility of an element. CSS only.
#'
#' @param content {ui} 
#' @param labelDictKey {character} label key
#' @param labelText {character} label text
#' @param open {boolean} fold open
#' @param classContainer {character} Name of the class for the fold container
#' @param classContent {character} Name of the class for the fold content
#' @param classLabel {character} Name of the class for the label
#' @export
#mxFold <- function(content,id=NULL,labelDictKey=NULL,labelText=NULL, open=FALSE, classContainer="fold-container",classContent="fold-content",classLabel="fold-label"){
mxFold <- function(content,id=NULL,labelDictKey=NULL,labelText=NULL,labelUi=NULL, open=FALSE, classContainer="fold-container",classContent="fold-content",classLabel="fold-label"){
  if(noDataCheck(id)) id <- randomString()

  elInput = tags$input(type="checkbox",id=id,class="fold-switch")

  if(open){
    elInput$attribs$checked=T
  }

  if(noDataCheck(labelUi)){
     label = tags$label(class=classLabel,`for`=id,`data-lang_key`= labelDictKey,labelText)
  }else{
     label = tags$label(labelUi,class=classLabel,`for`=id)
  }

  tags$div(class=classContainer,
    elInput,
    label,
    tags$div(class=classContent,
      content
      )
    )
}


#' R list to html list
#'
#' Create a html list and apply a class for <ul> and <li>
#'
#' @param listInput list in inptu
listToHtmlSimple <- function(listInput,lang="en",dict=config$dict){

  makeUL = function(li){
    nL <- names(li)
    content <- tagList()
    for( n in nL){ 
      content <- tagList(content, makeLi(li[[n]],n))
    }
    tags$ul(content,class="list-group")
  }

  makeLi = function(it,ti){
    ti <- d(ti,lang=lang,dict=dict);
    if (is.list(it)){
      content = mxFold(
        content = makeUL(it),
        labelUi = ti
        )
    }else{
      content = tags$div(
        tags$span(class="list-group-title",ti),
        tags$span(it)
        )
    }

    tags$li(
      class = "list-group-item",
      content
      )
  }

  makeUL(listInput)         

}




#' Checkbox with custom ui
#'
#' Checkbox with custom ui
#'
#' @param inputId {character} Id of the checkbox
#' @param title {character} Title/Tooltip value
#' @param contentChecked {character} Pseudo element content if checked
#' @param contentUnchecked {character} Pseudo element content if not checked
#' @param class {character} Additional classes
#' @param .. additional tags
#' @export
mxCheckbox <- function(inputId=NULL,...,onClick=NULL,title="Toggle",contentChecked="\\f06e",contentUnchecked="\\f070",class="btn btn-default"){

  name <- sprintf(
    "check_%1$s"
    , inputId
    )

  classLabel <- sprintf(
    "mx-check-%1$s"
    , inputId
    )

tags$div(
  title=title,
  tags$input(
    onClick=onClick,
    type="checkbox",
    style="display:none",
    name=name,
    id=inputId,
    value="attributes"
    ),
  tags$label(
    class=paste(paste(class,collapse=" "),classLabel),
    `for`=inputId
  ),
  tags$style(
    sprintf(
      "#%1$s ~ .%2$s:before
      {
      font-family:fontawesome;
      content:\"%3$s\";
      }
      #%1$s:checked ~.%2$s:before
      {
      font-family:fontawesome;
      content:\"%4$s\";
      }"
      , inputId
      , classLabel
      , contentChecked
      , contentUnchecked
      )
    ),
  tags$div(
    ...
    )
  )


}

 

##' R list to html
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @export
#listToHtml<-function(listInput,htL='',h=2, exclude=NULL){

  #hS<-paste0('<H',h,'><u>',collapse='') #start 
  #hE<-paste0('</u></H',h,'>',collapse='') #end
  #h=h+1 #next
  #if(is.list(listInput)){
    #nL<-names(listInput)
    #nL <- nL[!nL %in% exclude]
    #htL<-append(htL,'<ul>')
    #for(n in nL){
      #htL<-append(htL,c(hS,n,hE))
      #subL<-listInput[[n]]
      #htL<-listToHtml(subL,htL=htL,h=h,exclude=exclude)
    #}
    #htL<-append(htL,'</ul>')
  #}else if(is.character(listInput) || is.numeric(listInput)){
    #htL<-append(htL,c('<li>',paste(listInput,collapse=','),'</li>'))
  #}
  #return(paste(htL,collapse=''))
#}






##' R list to html list
##'
##' Create a html list and apply a class for <ul> and <li>
##'
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @param optional dictionary table for titles
##' @param language to use from dict
##' @return HTML list 
##' @export
#listToHtmlClass <- function(listInput, exclude=NULL,titleMain="",title=NULL,c=0, htL="",classUl="list-group",classLi="list-group-item",dict=NULL,language="en"){

  #c <- c+1 #next

  #if(is.null(listInput)) listInput = character(1);


  #if(is.list(listInput) ){

    #id <- randomString()
    #nL <- names(listInput)
    #if( c == 1 && nchar(titleMain)>0 ) title=titleMain
    #htL <- append(
      #htL,
      #paste(
        #"<div class='fold-container'>",
        #"<input type='checkbox' id='",id,"' class='fold-switch'/>",
        #"<label class='fold-label' for='",id,"'>",toupper(title),"</label>",
        #"<div class='fold-content'>",
        #"<ul class='list-group'>"
        #)
      #) # open

    #if(length(listInput)>0){
      #for(i in 1:length(listInput)){

        #subL <- listInput[[i]]

        #htL<-append(
          #htL,
          #c(
            #paste(
              #'<li class="',
              #paste(classLi,collapse=","),
              #'">'
              #)
            #)
          #)
        #htL <- listToHtmlClass(
          #subL, 
          #exclude=exclude,
          #title=nL[[i]],
          #htL=htL,
          #c=c,
          #classUl=classUl,
          #classLi=classLi,
          #dict = dict,
          #language = language
          #)
      #}
    #}
    #htL<-append(htL,'</li></ul></div></div>') # close

  #}else if(is.character(listInput) || is.numeric(listInput)){
    #if(!is.null(dict)){
      #title <- d(title,dict=dict,lang=language)
      #if(noDataCheck(title)) title <- title
    #}
    #htL<-append(
      #htL,
      #sprintf(
        #"
        #<span class='mx-list-title'>%1$s: </span>
        #<span class='mx-list-content'>%2$s</span>
        #"
        #, title
        #, listInput
        #)
      #)

  #}
  #return(HTML(paste(htL,collapse='')))
#} 



##' R list to html list
##'
##' Create a html list and apply a class for <ul> and <li>
##'
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @return HTML list 
##' @export
#listToHtmlClassOld <- function(listInput, exclude=NULL,title=NULL,c=0, htL="",classUl="list-group",classLi="list-group-item"){

  #c = c+1 #next

  #if(is.null(listInput)) listInput = character(1);

  #if(is.list(listInput) ){
    #nL <- names(listInput)
    #htL <- append(
      #htL,
      #paste(
        #'<b class="mx-list-title">',toupper(title),'</b>',
        #'<ul class="',
        #paste(
          #classUl,
          #collapse=","
          #),
        #'">'
        #)
      #) # open

    #if(length(listInput)>0){
      #for(i in 1:length(listInput)){

        #subL <- listInput[[i]]

        #htL<-append(
          #htL,
          #c(
            #paste(
              #'<li class="',
              #paste(classLi,collapse=","),
              #'">'
              #)
            #)
          #)
        #htL <- listToHtmlClass(
          #subL, 
          #exclude=exclude,
          #title=nL[[i]],
          #htL=htL,
          #c=c,
          #classUl=classUl,
          #classLi=classLi
          #)
      #}
    #}
    #htL<-append(htL,'</li></ul>') # close

  #}else if(is.character(listInput) || is.numeric(listInput)){
    #htL<-append(
      #htL,
      #sprintf(
        #"
        #<span class='mx-list-title'>%1$s: </span>
        #<span class='mx-list-content'>%2$s</span>
        #"
        #, title
        #, listInput
        #)
      #)

  #}
  #return(HTML(paste(htL,collapse='')))
#} 
 

