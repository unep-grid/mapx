



//export function downloadScreenshotPdfAll(){

  //var idMap = mx.settings.idMapDefault;
  //var vVisible = mx.helpers.getLayerNamesByPrefix({
    //id:idMap,
    //prefix:"MX-",
    //base : true
  //});

  //var i = 0;
  //var n = vVisible.length;
  //var progress = 1;
  //var map = mx.helpers.getMap(idMap);
  //var allView = [];

  //setProgress(progress);

  //return  mx.helpers.takeMapScreenshot(map)
    //.then(data => {

      //allView = vVisible.map((v) => {
        //return  downloadScreenshotPdf({idView:v,id:idMap,mapData:data})
          //.then(function(){
            //progress = (i++ / n) * 100;
            //setProgress(progress);
          //});
      //});

      //return Promise.all(allView)
        //.then(()=>{
          //setProgress(100);
        //});
    //});
  //function setProgress(progress){
    //mx.helpers.progressScreen({
      //enable : progress < 100,
      //id : "screenshot-batch",
      //percent : progress,
      //text : "Batch export, please wait.."
    //});
  //}


//}



//export function addToQueue(cb){
  //mx.queue.push(cb);
  //var id = mx.queue.indexOf(cb);
  //return mx.queue[0]();
//}


/**
 * Take a screen show of the map, even if preserveDrawingBuffer is false
 * @param {Object} map A mapbox gl js object
 * @param {String} idView Use only this view
 */
//export function takeMapScreenshot(map,idView,data) {

  //if(data) return Promise.resolve(data);

  //return new Promise(function(resolve, reject){

    //var allLayers = [];
    //var otherLayers = [];

    //if(idView){

      //allLayers = mx.helpers.getLayerNamesByPrefix({prefix:"MX-"});
      //otherLayers = allLayers.filter(l => l.indexOf(idView) == -1 );

      //otherLayers.forEach(l => {
        //map.setLayoutProperty(l,'visibility','none'); 
      //});

    //}

    //map.once("render", function(e) {

      //data =  map.getCanvas().toDataURL();

      //if(idView){

        //otherLayers.forEach(l => {
          //map.setLayoutProperty(l,'visibility','visible'); 
        //});

        //console.log("end screenshot for view "+ idView);
      //}
      //resolve(data);
    //});


    //[> trigger render <]
    //map.setBearing(map.getBearing());

  //});

//}

//export function elToPng(selector,opt){
  //var isNode = selector instanceof Node ;
  //var el = isNode ? selector : document.querySelector(selector);
  //return  import('html-to-image')
    //.then( m => {
      //var htmlToImage = m;
      //return htmlToImage.toPng(el,opt);
    //});
//}
//export function elToPng_htmlToCanvas(selector,opt){
  //var isNode = selector instanceof Node ;
  //var el = isNode ? selector : document.querySelector(selector);
  //return  import('html2canvas')
    //.then( m => {
      //var htmlToCanvas = m.default;
      //return htmlToCanvas(el);
    //})
    //.then( d => {
      //return d.toDataURL();
    //});
//}

//export function getNorthArrowPng(rotation){

  //rotation = rotation || 0;

  //return import("../svg/arrow-north-n.svg")
    //.then( d => { 
      //var imgData = d.default;

      //return new Promise((resolve,reject) => {

        //var canvas = document.createElement('canvas');
        //var imgNorthArrow = new Image();
        //document.body.appendChild(imgNorthArrow);
        //var ctx = canvas.getContext("2d");
        //var h, w;

        //imgNorthArrow.onload = function(){
          //w = this.width;
          //h = this.height;
          //canvas.width = w;
          //canvas.height = h;
          //drawImage(imgNorthArrow,rotation,1);
          //var data = canvas.toDataURL();
          //imgNorthArrow.remove();
          //resolve(data);
        //}; 
        //imgNorthArrow.onerror = function(e) {
          //imgNorthArrow.remove();
          //reject(e);
        //};
        //imgNorthArrow.src = imgData;

        //function drawImage(img, rotation, scale) {
          /**
           * North Arrow with rotation
           *
           * See fiddle : http://jsfiddle.net/fxi/9pucLsnw/
           *
           */
          //ctx.clearRect(0, 0, w, h);
          //ctx.save();
          //ctx.translate(w / 2, h / 2);
          //ctx.scale(scale * 1 || 1, scale * 1 || 1);
          //ctx.rotate(rotation * Math.PI / 180);
          //ctx.drawImage(img, -w / 2, -h / 2);
          //ctx.restore();
        //}
      //});
    //});
//}


//export function plotImgData(data){
  //var id = "plotImgData";
  //var elImg = document.getElementById(id) ;
  //var hasImg = !! elImg;
  //if(!hasImg){
    //elImg = new Image();
    //document.body.appendChild(elImg);
  //}

  //elImg.id = id;

  //if(!data){
    //elImg.remove();
  //}else{
    //elImg.style.zIndex=1000;
    //elImg.style.background="#fff";
    //elImg.style.position="absolute";
    //elImg.style.top=0;
    //elImg.src=data;
  //}
//}

//export function getLegendPng(selector,opt){
  //opt = opt || {};
  //opt.style = opt.style || {
    //width : "auto",
    //height : "auto",
    //overflow : "hidden",
    //maxHeight : "none"
  //};
 

  //var imgDim,imgData;
  //var isNode = selector instanceof Node ;
  //var el = isNode ? selector : document.querySelector(selector);
  
  //if( !el ) return Promise.resolve(false);
  //var elClone = el.cloneNode(true);
  /**
   * Get rule block if any
   */
  //var elCloneRules = elClone.querySelector('.mx-legend-vt-rules');
  /**
   * Get first image, if any
   */
  //var promImage;
  //var elCloneImage = elClone.querySelector("img");
  //var styleClone = elClone.style;
  //var elDestImage = new Image();
  //var hasRules = !! elCloneRules;
  //var hasImage = !! elCloneImage;

  //document.body.appendChild(elClone);
  //document.body.appendChild(elDestImage);

  //styleClone.position = "fixed";
  //styleClone.zIndex = -1;
  //styleClone.top = 0;

  //styleClone.height = opt.style.height || "auto";
  //styleClone.width = opt.style.width || "auto";
  //styleClone.maxHeight = opt.style.maxHeight || "none";

  //if( hasRules ){
    //elCloneRules.style.height = "auto";
    //elCloneRules.style.maxHeight = "none";
    //elCloneRules.style.overflow = "hidden";
  //}

  //if( hasImage ){
    //elClone.className = "";
    //elCloneImage.style.height="auto";
    //elCloneImage.style.maxHeight = "none";
  //}


  //promImage = new Promise((resolve,reject)=>{
    //if(!hasImage){
      //resolve(true);
    //}else{
      //elCloneImage.onload = function(){
        //resolve(true);
      //};
      //elCloneImage.onerror = function(){
        //reject(false);
      //};
    //}
  //});
  
  //return promImage
    //.then(r =>  mx.helpers.elToPng(elClone))
    //.then(data => {
      //elClone.remove();
      //return new Promise((resolve,reject)=>{
        //elDestImage.onload = function(){
          //var dim = elDestImage.getBoundingClientRect();
          //elDestImage.remove();
          //resolve({
            //dim : dim,
            //data : data
          //});
        //};
        //elDestImage.src = data;
      //});
    //});

//}


/** 
 * Download screenshot
 * @param {Object||String} o options || idView;
 * @param {String} o.id map id
 * @parma {String} o.idView view id
 */
//export function downloadScreenshotPdf(o){
  //o = o || {};

  //if(typeof o == "string"){
    //var idView = o;
    //o = {
      //idView : idView,
      //id : mx.settings.idMapDefault
    //};
  //}
  /**
   * Check asynchron progress
   */
  //var progress = 1;
  //var idScreenShot = mx.helpers.makeId();

  //function setProgress(progress){
    //setTimeout(()=>{
      //mx.helpers.progressScreen({
        //enable : progress < 100,
        //id : "screenshot"+idScreenShot,
        //percent : progress,
        //text : "Screenshot and archive creation, please wait"
      //});
    //},10);
  //}

  /**
   * Load external libraries
   */
  //setProgress(1);

  //var dataMap,zip,folder,dataLegend,dataScale,dataNorth,dataMeta;
  //var promLegend,promScale,promNorth,promMap,promMeta;
  //var qf = [];
  //var map = mx.helpers.getMap(o.id);
  //var elMap = document.getElementById(mx.settings.idMapDefault);
  //var mapDim =  elMap.getBoundingClientRect();
  //var paperWidth = 297;
  //var paperHeight = 210;
  //var mapWidth = 297-70;
  //var mapScale = mapDim.width / mapWidth;
  //var mapHeight = mapDim.height / mapScale;
  //var link = location.origin + "?views=" + o.idView + "&project=" + mx.settings.project;
  //var elLegend = document.getElementById("check_view_legend_"+o.idView);
  //var elScale = document.querySelector(".mx-scale-box");
  //var scaleDim =  elScale.getBoundingClientRect();
  //var fileName = "mx_data_" + (new Date()+"").split(" ")[4].replace(/:/g,"_",true) +".zip";
  //var view = mx.helpers.getViews(o);
  //var lang = mx.settings.language;
  //var langs = mx.settings.languages;

  //var promTools = Promise.all([
    //import("jspdf"),
    //import("jszip"),
    //import("downloadjs")
  //]);


  //var title = mx.helpers.getLabelFromObjectPath({
    //obj : view,
    //path : "data.title",
    //lang : lang,
    //langs : langs,
    //defaultKey : view.id
  //});
  /**
   * Legend
   */
  //promLegend = mx.helpers.getLegendPng(elLegend,{
    //style : {
      //width : "5.5cm",
      //maxHeight : "none"
    //}
  //});

  /**
   * Scale
   */
  //promScale = elToPng(elScale,{
    //[>  style : {<]
    ////transform: "scale("+(1/mapScale)+")"
    //[>}<]
  //});

  /**
   * Metadata
   */
  //promMeta = mx.helpers.getSourceMetadata(mx.helpers.path(view,'data.source.layerInfo.name'),true);

  /**
   * North arrow
   */
  //promNorth = mx.helpers.getNorthArrowPng(map.getBearing());

  /**
   * Map
   */
  //promMap =  mx.helpers.takeMapScreenshot(map,view.id,o.mapData);

  //var jsPDF = {};
  //var JSZip = {};
  //var download = {};

  //return promTools
    //.then((m)=>{

      //jsPDF = m[0].default;
      //JSZip = m[1].default;
      //download = m[2].default;
      //setProgress(10);
      //return true ;
    //})
    //.then(ok => {
      //return Promise.all([
        //promMap,
        //promNorth,
        //promScale,
        //promLegend,
        //promMeta
      //]);
    //})
    //.then(function(r){

      //setProgress(50);

      //dataMap = r[0]?r[0]:dataMap;
      //dataNorth = r[1]?r[1]:dataNorth;
      //dataScale = r[2]?r[2]:dataScale;
      //dataLegend = r[3]?r[3]:dataLegend;
      //dataMeta = r[4]?r[4]:dataMeta;
      /**
       * Produce a PDF doc
       */
      //var doc = new jsPDF({
        //orientation: 'landscape'
      //});

      /**
       * Title
       */
      //if( title ){
        //doc.setFontSize(15);
        //doc.textWithLink(title, 10, 10, {url:link});
      //}
      /**
       * Legend
       */
      //if( dataLegend ){
        //var d = dataLegend.dim ;
        //var datLegend = dataLegend.data;
        //var lWidth = 60-5;
        //var lScale = d.width / lWidth;
        //var lHeight = d.height / lScale;
        //doc.addImage(datLegend, 'PNG', 5, 20, lWidth, lHeight );
      //}
      /**
       * Map
       */
      //if( dataMap ){
        //doc.addImage(dataMap, 'PNG', 70, 20, mapWidth, mapHeight );
        //doc.setFillColor("#FFFFFF");
        //doc.rect(0, 190, 297, 210, 'F');
      //}
      /**
       * North arrow
       */
      //if( dataNorth ){
        //doc.addImage(dataNorth, 'PNG', 280, 196, 8, 8 );
      //}
      /**
       * Scale
       */
      //if( dataScale ){
        //var ms = mapScale;
        //var dM = mapDim;
        //var dS = scaleDim;
        //var ratioScaleX = dS.width / dM.width;
        //var ratioScaleY = dS.height / dM.height;
        //doc.addImage(dataScale, 'PNG', 250, 198, ratioScaleX * mapWidth,ratioScaleY * mapHeight );
      //}
      /**
       * Link
       */
      //[>          if( link ){<]
      ////doc.setFontSize(10);
      ////doc.textWithLink(location.origin, 10, 200, {url:link});
      //[>}<]


      //var dataPdf =  doc.output();

      //zip = new JSZip();
      //folder = zip.folder("mx-data");

      //if(dataScale){
        //folder.file("mx-scale.png", dataScale.split(",")[1], {base64: true});
      //}
      //if(dataLegend){
        //folder.file("mx-legend.png", dataLegend.data.split(",")[1], {base64: true});
      //}
      //if(dataMap){
        //folder.file("mx-map.png", dataMap.split(",")[1], {base64: true});
      //}
      //if(dataNorth){
        //folder.file("mx-north-arrow.png", dataNorth.split(",")[1], {base64: true});
      //}
      //if(dataPdf){
        //folder.file("mx-map.pdf", dataPdf, {binary:true});
      //}
      //if(dataMeta){
        //folder.file("mx-meta.json", JSON.stringify(dataMeta,0,1));
      //}

      //return zip.generateAsync({type:"blob"});

    //})
    //.then(zip => {
      //setProgress(100);
      //download(zip, fileName);
    //});
//}

