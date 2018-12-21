
/**
* Display a panel modal
* @param {Object} o Options
* @param {String} o.id Id of the box. Default : random
* @param {Numeric} o.zIndex set zIndex. Default : value in css
* @param {Boolean} o.replace If a modal is displayed twice with the same id, delete the previous one. Default : true
* @param {Boolean} o.noShinyBinding  By default, the modal panel will try to bind automatically input elements. In some case, this is not wanted. Default : false
* @param {String} o.styleString Style string to apply to modal window. Default : empty
* @param {String|Element} o.content Body content of the modal. Default  : undefined
* @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
*
*/
export function modal(o){
  o = o || {};
  var h = mx.helpers;
  var id = o.id || h.makeId();
  var idBackground = "mx_background_for_" + id;
  var modal = document.getElementById(o.id) || document.createElement("div");
  var rectModal = modal.getBoundingClientRect();
  var background = document.getElementById(idBackground) || document.createElement("div"); 
  var hasShiny = typeof window.Shiny !== "undefined";
  var hasSelectize = typeof window.jQuery === "function" && typeof window.Selectize == "function";
  var startBodyScrollPos = 0;
  var noShinyBinding = !hasShiny || typeof o.noShinyBinding !== "undefined" ? o.noShinyBinding : false;

  if(o.close){
    close();
    return;
  }
  if(modal.id && o.replace){
    if( hasShiny && !noShinyBinding ) Shiny.unbindAll(modal);
    var oldBody = modal.querySelector('.mx-modal-body');
    if(oldBody){
      startBodyScrollPos = oldBody.scrollTop;
    }
    
    modal.remove();
    modal = document.createElement("div");
    modal.style.left = rectModal.left + "px";
    modal.style.top = rectModal.top + "px";
  }
  if(modal.id && !o.replace){
    return;
  }

  if(o.styleString){
    modal.style = o.styleString;
  }
  if(o.zIndex){
    modal.style.zIndex = o.zIndex;
  }
  /*if(o.minHeight){*/
  //modal.style.minHeight = o.minHeight;
  /*}*/
  if( o.minWidth ){
    //modal.style.minWidth = o.minWidth;
    modal.style.width = o.minWidth;
  }

  var top = document.createElement("div");
  //var topBtns =  document.createElement("div");
  var title = document.createElement("div");
  var head = document.createElement("div");
  var body = document.createElement("div");
  var content = document.createElement("div");
  var footer = document.createElement("div");
  var buttons = document.createElement("div");
  var dialog = document.createElement("div");
  var validation = document.createElement("div");

/*  var btnMinimize = document.createElement("button");*/
  //var btnHalfTop = document.createElement("button");
  //var btnHalfLeft = document.createElement("button");

  function close(e){
    if(hasShiny && !noShinyBinding) Shiny.unbindAll(modal);
    modal.remove();
    background.remove();
  }

  

  modal.appendChild(top);
  modal.appendChild(head);
  modal.appendChild(body);
  modal.appendChild(footer);
  modal.classList.add("mx-modal-container");
  modal.classList.add("mx-draggable");
  modal.appendChild(validation);
  modal.id=id;

  var classModalOrig = modal.className;

  function resetModalClass(){
    modal.className = classModalOrig;
  }
  //btnMinimize.className="mx-pointer mx-modal-btn-top fa fa-minus-square-o";
  //btnHalfTop.className="mx-pointer mx-modal-btn-top fa fa-arrow-circle-o-up";
  //btnHalfLeft.className="mx-pointer mx-modal-btn-top fa fa-arrow-circle-o-left";
  
  top.classList.add("mx-drag-handle");
  top.classList.add("mx-modal-top");
  top.appendChild(title);
  //top.appendChild(topBtns);
  
   //var sBtnReset = new StackButton({
    //hidden : true,
    //classBase : 'mx-modal-btn-top fa',
    //classes : ['fa-times','fa-circle-thin'],
    //elContainer : topBtns
  //}).build();

   //var sBtnMinimise = new StackButton({
    //classBase : 'mx-modal-btn-top fa',
    //classes : ['fa-minus','fa-circle-thin'],
    //elContainer : topBtns
  //}).build();

  //var sBtnHalfTop = new StackButton({
    //classBase : 'mx-modal-btn-top fa',
    //classes : ['fa-caret-up','fa-circle-thin'],
    //elContainer : topBtns
  //}).build();
  //var sBtnHalfLeft = new StackButton({
    //classBase : 'mx-modal-btn-top fa',
    //classes : ['fa-caret-left','fa-circle-thin'],
    //elContainer : topBtns
  //}).build();

  //sBtnMinimise.elBtn.onclick = function(){
    //modal.classList.toggle('mx-modal-body-hidden');
    //sBtnMinimise.setHidden(true);
    //sBtnHalfLeft.setHidden(true);
    //sBtnHalfTop.setHidden(true);
    //sBtnReset.setHidden(false);
  //};

  //sBtnHalfLeft.elBtn.onclick = function(){
    //modal.classList.toggle('mx-modal-half-left');
    //sBtnMinimise.setHidden(true);
    //sBtnHalfLeft.setHidden(true);
    //sBtnHalfTop.setHidden(true);
    //sBtnReset.setHidden(false);
  //};

  //sBtnHalfTop.elBtn.onclick = function(){
    //modal.classList.toggle('mx-modal-half-top');
    //sBtnMinimise.setHidden(true);
    //sBtnHalfLeft.setHidden(true);
    //sBtnHalfTop.setHidden(true);
    //sBtnReset.setHidden(false);
  //};

  //sBtnReset.elBtn.onclick = function(){
    //sBtnMinimise.setHidden(false);
    //sBtnHalfLeft.setHidden(false);
    //sBtnHalfTop.setHidden(false);
    //sBtnReset.setHidden(true);
    //resetModalClass();
  //};


  title.classList.add("mx-modal-drag-enable");
  title.classList.add("mx-modal-title");
  head.classList.add("mx-modal-head");
  validation.classList.add("mx-modal-validation");
  body.classList.add("mx-modal-body");
  body.classList.add("mx-scroll-styled");
  content.classList.add("mx-modal-content");
  footer.classList.add("mx-modal-foot");
  buttons.classList.add("btn-group");
  background.id = idBackground;
  background.classList.add("mx-modal-background");
  dialog.classList.add("shiny-text-output");
  dialog.id = id + "_txt";
  dialog.classList.add("mx-modal-foot-text");
  validation.classList.add("shiny-html-output");
  validation.id = id + "_validation";

  if( !o.removeCloseButton ){
    var b = document.createElement("button");
    b.className="btn btn-default";
    b.innerHTML = o.textCloseButton || "close"; 
    b.addEventListener("click",close);
    buttons.appendChild(b);
  }

  if( o.buttons && o.buttons.constructor == Array ){
    o.buttons.forEach(function(b){
      if( typeof b === "string" ){
        b = mx.helpers.textToDom(b);
      }
      if(b instanceof Node ){
        buttons.appendChild(b);
      }
    });
  }

  if( o.title && o.title instanceof Node ){
    title.appendChild(o.title);
  }else{
    title.innerHTML =  o.title || "";
  }

  if(o.content && o.content instanceof Node){
    content.appendChild(o.content);
  }else{
    content.innerHTML = o.content;
  }
  body.appendChild(content);
  footer.appendChild(dialog);
  footer.appendChild(buttons);
  if( o.addBackground ) document.body.appendChild(background);
  document.body.appendChild(modal);
  if( hasShiny && !noShinyBinding )  Shiny.bindAll(modal);
  if( hasSelectize ) {
    var selects = $(modal).find("select");
    selects.each(function(i,s){
      var script = modal.querySelector("script[data-for="+s.id+"]");
      var data = script?script.innerHTML:null;
      var options = {};
      if(data){
        options = JSON.parse(data);
        if(options.renderFun){
          options.render={
            option : mx.helpers[options.renderFun]
          };
        }
      }
      options.inputClass="form-control selectize-input";
      mx.listener[s.id] = $(s).selectize(options);
    });
  }
  if(startBodyScrollPos){
    body.scrollTop = startBodyScrollPos;
  }
  mx.helpers.draggable({
    selector : modal,
    debounceTime :10
  });

  return(modal);
}


export function parseProjectOptions(item, escape) {
  return "<div class='mx_project_list option selected' data-selectable >"+
    "<h3>" + escape(item.title) +"<span class=\'badge pull-right\'>" + escape(item.count) + "</span></h3>"+
    "<p>" + escape(item.description) + "</p>" +
    "</div>";
}


export function updateSelectizeItems(o){
  var items = o.items;
  var id = o.id;
  var s = mx.listener[id];
  if(!s) return;
  if(!items) return;
  var ss = s[0].selectize;
  
  ss.clearOptions();
  ss.addOption(items);
  ss.refreshOptions();
}


