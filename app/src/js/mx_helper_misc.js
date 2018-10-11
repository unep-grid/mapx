/*jshint esversion: 6 , node: true */ //'use strict';
import * as mx from './mx_init.js';
//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;



export function removeServiceWorker(){
  if(navigator.serviceWorker){
    caches.keys().then(k => k.forEach(i=>caches.delete(i)));
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      } });
  }
}



/**
* Get url query parameter by name
* @param {String} name Name of the query request name
* @note http://www.netlobo.com/url_query_string_javascript.html
*/
export function getUrlParameter( name )
{
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}


/**
 * Returns an Array of all url parameters
 * @return {[Array]} [Key Value pairs form URL]
 */
export function paramsToObject(params) {
  var param;
  var out = {};
  var dec = decodeURIComponent;
  params = params ? params.split('&') :  window.location.search.substring(1).split('&');
  for ( var i = 0, iL = params.length; i<iL; i++ ) {
    param = params[i].split('=');
    out[param[0].toLowerCase()]=dec(param[1]);
  }
  return out;
}

/**
* Replace current url state using object values
*
* @param {Object} opt Options
* @param {Object} opt.data params to replace state with
* @param {Boolean} opt.clean remove everything
* @return null
*/
export function objToState(opt){
  mx.helpers.onNextFrame(function(){

    var out = "/";
    var params = paramsToObject();
    var keysNew = Object.keys(opt.data);
    var dat;  
    var val;
    if(!opt.clean){
      keysNew.forEach(kn=>{
        val = opt.data[kn];
        if(val){
          params[kn] = val;
        }else{
          delete params[kn];
        }
      });

      if(params){
        out = out + '?'+ objToParams(params);
      }

    }
    history.replaceState(null,null,out);

  });
}




/**
* Convert object to params string
*
* @param {Object} opt Options
* @param {Object} object to convert
* @return {String} params string
*/
export function objToParams(data){
  var esc = encodeURIComponent;
  var params = [];

  Object.keys(data)
    .forEach(k => {
      if(k){
        params.push(esc(k) + '=' + esc(data[k]));
      }
    });

  return params.join('&');

}



/**
* All member should be true, return boolean
*
* @param {Array} a input array
* @example all([null,0,"a",true]) === false
* @example all(["",1,"a",true]) === true
* @return {Boolean} 
*/
export function all(a){
  var r = false ;
  var l ;
  a.forEach(function(o,i){
    l = Boolean(o);
    r=i==0?l:r&&l;
  });
  return r;
}

/**
* At least member should be true
* @param {Array} a input array
* @example any([null,0,"a",true]) === true
* @example any([null]) === false
* @return {Boolean} 
*/
export function any(a){
  var r = false;
  var l;
  a.forEach(function(o,i){
    l = Boolean(o);
    r=i==0?l:r||l;
  });
  return r;
}

/**
* A is greater than b
* @param {Number} a A
* @param {Number} b b
*/
export function greaterThan(a,b){
  return a > b;
}


/**
* Check if array a has index named b
* @param {Array} a Array to test
* @param {String} b Name to test 
* @example hasIndex([null,0,"a",true],"a") === true
* @return {Boolean} 
*/
export function hasIndex(a,b){
  return a instanceof Array ? a.indexOf(b) > -1: false;
}

/**
* Return the first not empty member
* @param {Array} a Input array
* @example firstOf([,"",0,"a"]) === 0
*/
export function firstOf(a){
  for( var i=0, iL=a.length; i<iL; i++ ){
    if(a[i] === 0 || a[i]){return a[i];}
  }
}


/**
* Simple templating system
* @param {String} template e.g. "Loading view {{vn}} in {{vl}} "
* @param {Object} data to update the template with. e.g. {vn:8,vl:10}
* @param {String} parsed string
*/
export function parseTemplate(template, data){  
  return template
    .replace(/{{([^{}]+)}}/g, 
      function(matched, key) {
        return data[key] ;
      });
}


/**
* Flash an icon
* @param {String} icon fontawesome name
*/
export function iconFlash(icon) {
 
  if(typeof(icon) == "object") icon = icon.icon;

  icon = icon || "cog";

  var elContainer;
  var elIcon;

  new Promise(function(resolve,reject){

    elContainer = document.createElement("div");
    elIcon = document.createElement("i");
    elContainer.classList.add("mx-flash");
    elIcon.className = "fa fa-" + icon;
    elContainer.appendChild(elIcon);
    document.body.appendChild(elContainer);

    resolve(true);

  }).then(function(){

    return new Promise(function(resolve, reject){
      setTimeout(function() {
        elIcon.classList.add("active");
        resolve(true);
      }, 0);
    });

  }).then(function(){

    setTimeout(function() {
      elContainer.remove();
    }, 1000);

  });
}

/**
* Fill with zeros
* @param {Number} n Number
* @param {Number} p Number of digit
* @param {String} c Value instead of zeros
* @note https://stackoverflow.com/questions/1267283/how-can-i-pad-a-value-with-leading-zeros
*/
export function paddy(n, p, c) {
    var pad_char = typeof c !== 'undefined' ? c : '0';
    var pad = new Array(1 + p).join(pad_char);
    return (pad + n).slice(-pad.length);
}


var nf = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };

/**
 * Do something on next frame
 * @param {Function} cb Callback function to execute on next animation frame
 */
export function onNextFrame(cb){
    nf(cb);
}


var cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

/**
 * Cancel a requested frame id
 * @param {Number} frame number
 */
export function cancelFrameRequest(id){
    cf(id);
}

/**
 * Get the correct css transform function
 */
export function cssTransformFun(){
  return function(){
    /* Create dummy div to explore style */
    if(typeof document == "undefined") return;

    var style = document
      .createElement("div")
      .style;

    if (undefined !== style.WebkitTransform) {
      return "WebkitTransform";
    } else if (undefined !== style.MozTransform) {
      return "MozTransform ";
    } else if (undefined !== style.OTransform) {
      return "OTransform";
    } else if (undefined !== style.msTransform) {
      return "msTransform ";
    } else if (undefined !== style.WebkitTransform) {
      return "WebkitTransform";
    } else {
      return "transform";
    }
  }();
}
export var cssTransform = cssTransformFun();



export function uiToggleBtn(o){
  var label = o.label || "";
  var onChange = o.onChange || function(e,el){};
  var data = o.data || {};
  var checked = o.checked || false;
  var classToggle = "check-toggle";
  var classLabel = "check-toggle-label " + (o.labelBoxed ? "check-toggle-label-boxed":"");
  var classInput = "check-toggle-input"; 
  var id =  makeId();
  var elContainer = document.createElement("div");
  var elInput = document.createElement("input");
  var elLabel = document.createElement("label");
  elInput.type="checkbox";
  elInput.id = id;
  elInput.checked=checked;
  elLabel.setAttribute("for",id);
  elLabel.className = classLabel;
  elInput.className = classInput;
  elContainer.className= classToggle;
  elLabel.innerText = label;

  for(var d in data){
    elInput.dataset[d]=data[d];
  }

  elInput.onchange = function(e){
    /*jshint validthis:true */
    var el = this;
    onChange(e,el);
  };

  elContainer.appendChild(elInput);
  elContainer.appendChild(elLabel);

  return elContainer;

}





/**
* Add a read more button under a div that is too high.
* @param {Element|Selector} selector Select div to update or set content
* @param {Object} options Options
* @param {String|Element} options.content. Optional content to update the container with.
* @param {String|Element} options.selectorParent. Selector of parent. default = document.
* @param {Number} options.maxHeightClosed Maximum height when closed : if more, add the readmore div and hide the remaining
* @param {Number} options.maxHeightOpened Maximum height when opened : if more, add a scrollbar
* @param {Boolean} options.boxedContent Add a box around content
*/
export function uiReadMore(selector, options) {
  options = options || {};

  var selectorParent = options.selectorParent;
  var elParent = selectorParent ? selectorParent instanceof Node ? selectorParent : document.querySelector(selectorParent) : document;
  var elContainers = selector instanceof Node ? [selector] : elParent.querySelectorAll(selector);
  var  cEl = function(x) {
    return document.createElement(x);
  };

  var sty,pad;
  /**
   * Iterate through all readmore divs
   */
  for (var i=0, iL = elContainers.length; i < iL; i++) {


    /* 
     * Set default divs and variables
     */
    var elContainer = elContainers[i];
    var rect,
      id = Math.random().toString(36),
      elReadMore = cEl("div"),
      elCheckbox = cEl("input"),
      elContent = cEl("div"),
      elLabelMore = cEl("label"),
      elLabelCaret = cEl("div");

    /**
     * Set content
     */
    if ( ! options.content) {
      /**
       * Default. Use first child.
       */
      elContent = elContainer.querySelector("*");
      /* if null, maybe a test content / text node outside 
       * a div was found: extract innerHTML, remove it from container.
       */
      if(!elContent){
        elContent = cEl("div");
        elContent.innerHTML = elContainer.innerHTML;
        elContainer.innerHTML="";
      }

    } else {
      /**
       * If content is given as a node or as text, 
       * set elContent
       */
      if (options.content instanceof Node) {
        elContent = options.content;
      } else {
        elContent.innerHTML = options.content;
      }
    }


    /**
     * If no content found or is already readmore, skip it
     */
    if(!elContent || elContent.classList.contains("readmore") || elContent.childElementCount === 0){
      //console.log("skip");
    }else{
      /**
       * Set elements attributes
       */
      elReadMore.className = "readmore";
      elCheckbox.className = "readmore-check";
      elContent.className = elContent.className + " readmore-content";
      if(options.boxedContent){
        elContent.classList.add("readmore-content-boxed");
      }
      elLabelMore.className = "readmore-label";
      elLabelCaret.className = "readmore-label-caret fa fa-chevron-down";

      elCheckbox.id = id;
      elCheckbox.setAttribute("type", "checkbox");
      elCheckbox.setAttribute("role", "button");
      elLabelMore.setAttribute("for", id);

      elReadMore.appendChild(elContent);
      elContainer.appendChild(elReadMore);
      /**
       * As the div is rendered, we can extract 
       * the client rect values.
       */
      rect = elReadMore.getBoundingClientRect();
      sty  = window.getComputedStyle(elReadMore);
      pad = parseFloat(sty.paddingTop) + parseFloat(sty.paddingBottom);
      /**
       * When the displayed height is higher than
       * the maximum allowed, add the read more div
       * else, keep it without the toggle.
       */
      if ( (rect.height - pad ) > options.maxHeightClosed) {
        /**
         * The max height of the container (elReadMore) is set to create
         * a starting point for the animation, as the content (elContent)
         * inherit max-height.
         */

        elReadMore.style.maxHeight = options.maxHeightOpened ? options.maxHeightOpened + "px" : (rect.height+pad) + "px";
        elLabelMore.appendChild(elLabelCaret);
        elContent.style.maxHeight = options.maxHeightClosed + "px";
        elReadMore.insertBefore(elCheckbox, elContent);
        elReadMore.insertBefore(elLabelMore, elContent);

     
      }
      
      if ( options.maxHeightOpened && isFinite(options.maxHeightOpened ) && rect.height > options.maxHeightOpened ){
          elContent.style.overflow = "auto";
      }
    }
  }
}




/**
* Create a foldable element
* @param {Object} o options
* @param {Element} o.content Element to fold
* @param {String} o.label Label displayed in switch
* @param {String} o.labelKey Label key for dataset.key_lang
* @param {String} o.labelClass Label class
* @param {Boolean} o.open Default state
*/
export function uiFold(o){
  var content = o.content;
  var label = o.label;
  var labelKey = o.labelKey;
  var open = o.open;
  var onChange = o.onChange;
  var classContainer = "fold-container";
  var classContent = "fold-content";
  var classScroll = "mx-scroll-styled";
  var classLabel = "fold-label" ;
  var classSwitch = "fold-switch";
  var id =  makeId();

  if(!content) return;
  open = open || false; 
  label = label || "";
  labelKey = labelKey || label;

  var elInput = document.createElement("input");
  if(onChange){
     elInput.onchange=onChange;
  }
  elInput.setAttribute("type","checkbox");
  var elContainer = document.createElement("div");
  var elContent = document.createElement("div");
  var elLabel = document.createElement("label");
  elContainer.classList.add(classContainer);
  elContent.classList.add(classContent);
  elContent.classList.add(classScroll);
  elLabel.classList.add(classLabel);
  if(o.labelClass) elLabel.classList.add(o.labelClass);
  elLabel.setAttribute("for",id);
  elInput.id = id;
  elInput.classList.add("fold-switch");
  elInput.checked = open;
  elLabel.innerHTML = label;
  elLabel.dataset.lang_key = labelKey;

  elContent.appendChild(content);
  elContainer.appendChild(elInput);
  elContainer.appendChild(elLabel);
  elContainer.appendChild(elContent);

  return elContainer;
}

/**
* String containting html to html elements
* @param {String} text
* @return {HTML}
*/
export function textToDom(text){
  var el =  document.createElement("div");
  el.innerHTML=text;
  return el.children[0];
}

/**
* Dom element to text
* @param {Element} dom Dom element to convert
* @return {String}
*/
export function domToText(dom){
  var el = document.createElement("div");
  el.appendChild(dom);
  console.log(el.innerHTML);
}



/**
* Performs a deep merge of objects and returns new object. Does not modify
* objects (immutable) and merges arrays via concatenation.
* https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
*
*/
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
export function mergeDeep(target, source) {
  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}



/**
* Convert a simple object to an HTML list
* @param {Object} o Options
* @param {Object} o.data Object to convert
* @param {String} o.id of element to fill (optional)
* @param {String} o.classValue Group item additional class (optional)
* @return {Element} Html ul element
*/
export function objectToHTML(o){

  // if data and id : send by mxJsonToHtml, convert. 
  var obj = o.data;
  var id = o.id;
  var classValue;
  var classGroup = "list-group";
  var classGroupItem = "list-group-item";
  var classGroupItemValue = ["list-group-item-member"]; 

  if(classValue) classGroupItemValue.concat(classValue);

  var html = makeUl(obj);

  if(id){
   document.getElementById(id).appendChild(html);
  }else{
   return html;
  }

  function makeUl(li){
    var l, k, keys = [];
    var ul = document.createElement("ul");
    ul.classList.add(classGroup);
      var isObject = li.constructor == Object;
      var isArray =  li.constructor == Array;
    if( isObject ) keys = Object.keys(li);
    if( isArray ) for(var i=0,iL=li.length;i<iL;i++){keys.push(i);}

    for(var j =0,jL=keys.length;j<jL;j++){ 
      k = keys[j];
      l = isArray ? k+1 : k;
      ul.appendChild(makeLi(li[k],l));
    }
    return ul;
  }

  function makeLi(it,ti){
    var li = document.createElement("li");
    var content = document.createElement("div");
    li.classList.add(classGroupItem);

    if ( it.constructor == Object || it.constructor == Array ){

     content.appendChild( uiFold({
        content : makeUl(it),
        label : ti,
        open : false
      })
     );

    }else{
      content.innerHTML = "<div>"+
        "<span class='list-group-title'>" + ti + "</span>"+
        "<span>"+it+"</span>"+
        "</div>";

    }

    li.appendChild( content );
    return li;
  }
}














/** 
 * Date utils
 * Experimental date support for most common cases:
 * if number, return a formated date, if it's a string, return a number
 * @param {string|number} val input value
 * @return {date}
 */
export function date(val){

  var d =  new Date(val);
  var out = val;

  if( val.constructor == Number ){
    out = d.toLocaleDateString();
  }else{
    out = d.getTime();
  }

  return out;

}

/**
* Test if entry is numeric
* @param {String|Number} n string or number to test
*/
export function isNumeric(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
}


/**
* Test if string contain HTML
* @param {String} n string to test
* @note https://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not#answer-36773193
*/
export function isHTML(str){
  var test = RegExp.prototype.test.bind(/(<([^>]+)>)/i);
  return test(str);
}



/**
 * Round at given decimal
 * @param n Number to round
 * @param d Exponent. By default = 3
 */
export function round(n,d){
  d=d?d:3;
  var e = Math.pow(10,d);
  return Math.round(n*e)/e ;
}

export function formatZeros(num,n){
  if(typeof num !== "number") return num;
  num=mx.helpers.round(num,n);
  num=num+""||"0";
  n=n||3;
  var a = num.split('.');
  var b = a[1];
  if(!b) b= "";
  for(var i=0;b.length<n;i++){
    b = b + "0";
  }
  return a[0]+"."+b;
}



/**
 * Replace unicode char by string
 * @param {sring} txt String to convert
 * @note come from http://stackoverflow.com/questions/17267329/converting-unicode-character-to-string-format
 */
export function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function(match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
}

/** 
 * Set template : compile and store result
 *  @param {object} o Options
 * @param {string} o.id Name of the function
 * @param {string} o.template html string for legend
 */
export function setTemplates(o) {
  System.import("dot").then(function(doT){
    for( var id in o ){
      var template = mx.helpers.unicodeToChar(o[id]);
      mx.templates[id] = doT.template(template);
    }
  });
 }

/**
 *  * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If 
 * @note https://davidwalsh.name/javascript-debounce-function
 * @param func {function} function to evaluate
 * @param wait {integer} number of millisecond to wait
 * @param immedate {boolean} immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
export function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Convert input to string
 * @param {Object} i Input object
 */
export function toString(i){
  return JSON.stringify(i);
}



/**
 * Get uniques meta word from view.
 */
export function getDistinctIndexWords(view){
  if(!view) return;
  /*
   * index = abstract + date + target 
   */
  var str = 
    view.date_modified + " " +
    toString( view.target ) + " " +
    toString( view.data.abstract ) ;

  str = str.replace(/[^0-9a-zA-Z]+/g,";").split(";") ;
  str = mx.helpers.getArrayStat({arr:str,stat:"distinct"});
  return str.join(" ") ;
}




/**
 * Send Ajax
 * @note https://codepen.io/malyw/pen/vExwoK
 * @param {Object} o options
 * @param {String} o.type set/get
 * @param {String} o.url url to use
 * @param {Object} o.data data to send
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 * @param {Function} o.onProgress Function to call on progress
 * @param {Function} o.onMessage Function to call on progress
 * @param {Function} o.onTimeout Function to call on time out (o.maxWait);
 * @param {Function} o.beforeSend Function to call before sending ajax
 * @param {integer} o.maxWait Maximum wainting time. Default = 5000 ms
 */
export function sendAjax(o) {
  var time = new Date().getTime() + "";
  var timeStr = ( o.url.indexOf("?") > 0 ) ? "&time="+time:"?time="+time;
  o.xhr = new XMLHttpRequest();
  o.type = o.type ? o.type : "get";
  o.maxWait = o.maxWait ? o.maxWait : 20000; // in ms
  o.onError = o.onError ? o.onError : function(er){throw new Error(er);};
  o.onTimeout = o.onTimeout ? o.onTimeout : function(){throw new Error("Send ajax: max wait reached after "+ o.maxWait + "[ms]");};

  o.onSuccess =  o.onSuccess || console.log;
  o.onMessage = o.onMessage || function() {};
  o.onComplete =  o.onComplete || function() {};
  o.beforeSend =  o.beforeSend || function() {};

  /* Set thet timer  */
  o.timer = setTimeout(function() {
    o.xhr.abort();
    o.onTimeout();
    o.onComplete();
  }, o.maxWait);

  /* open get/post/<method> with provided url */
  o.xhr.open(o.type, o.url);
  
  /* set the on progress function */
  if( o.onProgress ){
    o.xhr.upload.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        o.onProgress( e.loaded / e.total );
      }
    }); 
  }

  o.xhr.onreadystatechange = function() {
    if (o.xhr.readyState === 3){
       o.onMessage(o.xhr.responseText);
    }
    if (o.xhr.readyState === 4) {
      clearTimeout(o.timer);
      if (o.xhr.status === 200 || o.xhr.status === 0) {
        o.onSuccess(o.xhr.responseText);
        o.onComplete();
      } else {
        o.onError(o.xhr.responseText);
        o.onComplete();
      }
    }
  };
  o.beforeSend(o.xhr);
  o.xhr.send(o.data);
  return o;
}

/**
 * Get STRING
 * @param {Object} o options
 * @param {String} o.url url pointing to the json
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function getCSV(o) {
   sendAjax({
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'text/csv; charset=utf-8');
    },
    onSuccess: function(res) {
      if(res){
        System.import("csvjson").then(function(csvjson){
         var data  = csvjson.toObject(res);
          o.onSuccess(data);
        });
      }
    },
    onError: o.onError,
    onComplete: o.onComplete,
  });
}




/**
 * POST data
 * @param {Object} o options
 * @param {String} o.url post url
 * @param {Object} o.data e.g. form data
 * @param {Numeric} o.maxWait max wait in [ms]
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function sendData(o) {
  return sendAjax({
    maxWait: o.maxWait || 1e3 * 60 * 60,
    type: 'post',
    url: o.url,
    data : o.data,
    beforeSend: function(xhr) { },
    onSuccess: o.onSuccess || console.log,
    onMessage : o.onMessage || console.log,
    onError: o.onError,
    onComplete: o.onComplete,
    onProgress: o.onProgress,
  });
}



/**
 * Get JSON
 * @param {Object} o options
 * @param {String} o.url url pointing to the json
 * @param {Function} o.onSuccess Function to call on success
 * @param {Numeric} o.maxWait max wait in [ms]
 * @param {Function} o.onMessage Function to call on progress
 * @param {Function} o.onError Function to call on error
 */
export function getJSON(o) {

  o.onSuccess =  o.onSuccess || function(){};
  o.onError =  o.onError || function(){};
  o.onMessage = o.onMessage || function(){};
  o.onComplete =  o.onComplete || function(){};

  sendAjax({
    maxWait : o.maxWait || 1e3 * 60 * 60 ,
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
    },
    onMessage :  function(res){
      if(res){
        o.onMessage(res);
      }
    },
    onSuccess: function(res) {
      if(res){
        o.onSuccess(res);
      }
    },
    onError: o.onError,
    onComplete: o.onComplete,
  });
}
/**
 * Get XML
 * @param {Object} o options
 * @param {String} o.url url pointing to the xml
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function getXML(o) {
  sendAjax({
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/xml');
    },
    onSuccess: function(res) {
      if (res) {
        o.onSuccess(parseXml(res));
      }
    },
    onError: o.onError,
    onComplete: o.onComplete,
  });
}

/**
* Parse xml
* @param {String} xml string
* @note http://goessner.net/download/prj/jsonxml/
* @return {DOM}
*/
export function parseXml(xml) {
  var dom = null;
  if (window.DOMParser) {
    try {
      dom = (new DOMParser()).parseFromString(xml, "text/xml");
    } catch (e) {
      dom = null;
    }
  } else if (window.ActiveXObject) {
    try {
      dom = new ActiveXObject('Microsoft.XMLDOM');
      dom.async = false;
      if (!dom.loadXML(xml)) // parse error ..

        window.alert(dom.parseError.reason + dom.parseError.srcText);
    } catch (e) {
      dom = null;
    }
  } else
    alert("cannot parse xml string!");
  return dom;
}

/**
* Convert json to xml
* @param {Object} o object to convert
* @param {Boolean|String} tab or indent character 
* @return {String} xml string
* @note http://goessner.net/download/prj/jsonxml/
*/
export function json2xml(o, tab) {
  var toXml = function(v, name, ind) {
      var xml = "";
      if (v instanceof Array) {
        for (var i = 0, n = v.length; i < n; i++)
          xml += ind + toXml(v[i], name, ind + "\t") + "\n";
      } else if (typeof(v) == "object") {
        var hasChild = false;
        xml += ind + "<" + name;
        for (var x in v) {
          if (x.charAt(0) == "@")
            xml += " " + x.substr(1) + "=\"" + v[x].toString() + "\"";
          else
            hasChild = true;
        }
        xml += hasChild ? ">" : "/>";
        if (hasChild) {
          for (var m in v) {
            if (m == "#text")
              xml += v[m];
            else if (m == "#cdata")
              xml += "<![CDATA[" + v[m] + "]]>";
            else if (m.charAt(0) != "@")
              xml += toXml(v[m], m, ind + "\t");
          }
          xml += (xml.charAt(xml.length - 1) == "\n" ? ind : "") + "</" + name + ">";
        }
      } else {
        xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
      }
      return xml;
    },
    xml = "";
  for (var m in o)
    xml += toXml(o[m], m, "");
  return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}

/**
* Convert xml to json
* @param {Element|Node} xml to convert
* @param {Boolean|String} tab or indent character 
* @note http://goessner.net/download/prj/jsonxml/
*/
export function xml2json(xml, tab) {
  var X = {
    toObj: function(xml) {
      var o = {};
      if (xml.nodeType == 1) { // element node ..
        if (xml.attributes.length) // element with attributes  ..
          for (var i = 0; i < xml.attributes.length; i++)
          o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
        if (xml.firstChild) { // element has child nodes ..
          var textChild = 0,
            cdataChild = 0,
            hasElementChild = false;
          for (var n = xml.firstChild; n; n = n.nextSibling) {
            if (n.nodeType == 1) hasElementChild = true;
            else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++; // non-whitespace text
            else if (n.nodeType == 4) cdataChild++; // cdata section node
          }
          if (hasElementChild) {
            if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
              X.removeWhite(xml);
              for (var x = xml.firstChild; x; x = x.nextSibling) {
                if (x.nodeType == 3) // text node
                  o["#text"] = X.escape(x.nodeValue);
                else if (n.nodeType == 4) // cdata node
                  o["#cdata"] = X.escape(x.nodeValue);
                else if (o[x.nodeName]) { // multiple occurence of element ..
                  if (o[x.nodeName] instanceof Array)
                    o[x.nodeName][o[x.nodeName].length] = X.toObj(x);
                  else
                    o[x.nodeName] = [o[x.nodeName], X.toObj(x)];
                } else // first occurence of element..
                  o[x.nodeName] = X.toObj(x);
              }
            } else { // mixed content
              if (!xml.attributes.length)
                o = X.escape(X.innerXml(xml));
              else
                o["#text"] = X.escape(X.innerXml(xml));
            }
          } else if (textChild) { // pure text
            if (!xml.attributes.length)
              o = X.escape(X.innerXml(xml));
            else
              o["#text"] = X.escape(X.innerXml(xml));
          } else if (cdataChild) { // cdata
            if (cdataChild > 1)
              o = X.escape(X.innerXml(xml));
            else
              for (var p = xml.firstChild; p; p = p.nextSibling)
                o["#cdata"] = X.escape(p.nodeValue);
          }
        }
        if (!xml.attributes.length && !xml.firstChild) o = null;
      } else if (xml.nodeType == 9) { // document.node
        o = X.toObj(xml.documentElement);
      } else
        alert("unhandled node type: " + xml.nodeType);
      return o;
    },
    toJson: function(o, name, ind) {
      var json = name ? ("\"" + name + "\"") : "";
      if (o instanceof Array) {
        for (var i = 0, n = o.length; i < n; i++)
          o[i] = X.toJson(o[i], "", ind + "\t");
        json += (name ? ":[" : "[") + (o.length > 1 ? ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) : o.join("")) + "]";
      } else if (o == null)
        json += (name && ":") + "null";
      else if (typeof(o) == "object") {
        var arr = [];
        for (var m in o)
          arr[arr.length] = X.toJson(o[m], m, ind + "\t");
        json += (name ? ":{" : "{") + (arr.length > 1 ? ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) : arr.join("")) + "}";
      } else if (typeof(o) == "string")
        json += (name && ":") + "\"" + o.toString() + "\"";
      else
        json += (name && ":") + o.toString();
      return json;
    },
    innerXml: function(node) {
      var s = "";
      if ("innerHTML" in node)
        s = node.innerHTML;
      else {
        var asXml = function(n) {
          var s = "";
          if (n.nodeType == 1) {
            s += "<" + n.nodeName;
            for (var i = 0; i < n.attributes.length; i++)
              s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
            if (n.firstChild) {
              s += ">";
              for (var c = n.firstChild; c; c = c.nextSibling)
                s += asXml(c);
              s += "</" + n.nodeName + ">";
            } else
              s += "/>";
          } else if (n.nodeType == 3)
            s += n.nodeValue;
          else if (n.nodeType == 4)
            s += "<![CDATA[" + n.nodeValue + "]]>";
          return s;
        };
        for (var c = node.firstChild; c; c = c.nextSibling)
          s += asXml(c);
      }
      return s;
    },
    escape: function(txt) {
      return txt.replace(/[\\]/g, "\\\\")
        .replace(/[\"]/g, '\\"')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r');
    },
    removeWhite: function(e) {
      e.normalize();
      for (var n = e.firstChild; n;) {
        if (n.nodeType == 3) { // text node
          if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
            var nxt = n.nextSibling;
            e.removeChild(n);
            n = nxt;
          } else
            n = n.nextSibling;
        } else if (n.nodeType == 1) { // element node
          X.removeWhite(n);
          n = n.nextSibling;
        } else // any other node
          n = n.nextSibling;
      }
      return e;
    }
  };
  if (xml.nodeType == 9) // document node
    xml = xml.documentElement;
  var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
  return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
}
/**
* Get Levenshtein distance by Gustaf Andersson
* @note https://jsperf.com/levenshtein-distance/25
* @param {string} String a
* @param {string} String b
*/
export function distance(s, t) {
  if (s === t) {
    return 0;
  }
  var n = s.length, m = t.length;
  if (n === 0 || m === 0) {
    return n + m;
  }
  var x = 0, y, a, b, c, d, g, h;
  var p = new Array(n);
  for (y = 0; y < n;) {
    p[y] = ++y;
  }

  for (; (x + 3) < m; x += 4) {
    var e1 = t.charCodeAt(x);
    var e2 = t.charCodeAt(x + 1);
    var e3 = t.charCodeAt(x + 2);
    var e4 = t.charCodeAt(x + 3);
    c = x;
    b = x + 1;
    d = x + 2;
    g = x + 3;
    h = x + 4;
    for (y = 0; y < n; y++) {
      var f = s.charCodeAt(y);
      a = p[y];
      if (a < c || b < c) {
        c = (a > b ? b + 1 : a + 1);
      }
      else {
        if (e1 !== f) {
          c++;
        }
      }

      if (c < b || d < b) {
        b = (c > d ? d + 1 : c + 1);
      }
      else {
        if (e2 !== f) {
          b++;
        }
      }

      if (b < d || g < d) {
        d = (b > g ? g + 1 : b + 1);
      }
      else {
        if (e3 !== f) {
          d++;
        }
      }

      if (d < g || h < g) {
        g = (d > h ? h + 1 : d + 1);
      }
      else {
        if (e4 !== f) {
          g++;
        }
      }
      p[y] = h = g;
      g = d;
      d = b;
      b = c;
      c = a;
    }
  }

  for (; x < m;) {
    var e = t.charCodeAt(x);
    c = x;
    d = ++x;
    for (y = 0; y < n; y++) {
      a = p[y];
      if (a < c || d < c) {
        d = (a > d ? d + 1 : a + 1);
      }
      else {
        if (e !== s.charCodeAt(y)) {
          d = c + 1;
        }
        else {
          d = c;
        }
      }
      p[y] = d;
      c = a;
    }
    h = d;
  }

  return h;
}

export function distanceScore(a,b){

 a = a
    .replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g,"")
    .toLowerCase();
 b = b
    .replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g,"")
    .toLowerCase();

  a = mx.helpers.cleanDiacritic(a);
  b = mx.helpers.cleanDiacritic(b);

  var l = a.length + b.length;

return 100 - (distance(a,b)/l) * 100  ;
}


/**
 * Create random asci strint of given length
 * @param {integer} length of the string
 */
export function makeId(n) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  n = n * 1 > 0 ? n * 1 : 5;

  for (var i = 0; i < n; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

/**
* Convert an object to a blob, then to a URL
* @param {Object} object to stringify and convert
*/
export function objectToUrl(object){
  var blob = new Blob([
    JSON.stringify(object)
  ], {type : 'application/json'});

  return window.URL.createObjectURL(blob);
}



/** Create a worker
 * @param fun {function} function to evalute by the worker
 */
export function createWorker(fun) {
  // convert input function to string
  fun = fun.toString();
  fun = fun
    .substring(
      fun.indexOf("{") + 1,
      fun.lastIndexOf("}")
    );
  // Make a blob
  var blob = new Blob(
    [fun], {
      type: "application/javascript"
    }
  );
  // convert as url for new worker
  var blobUrl = URL.createObjectURL(blob);

  // return new worker
  return (new Worker(blobUrl));
}


export function doPar(o) {
  var fun = o.fun || function(){};
  var data = o.data || {};
  var script = o.script || undefined;
  var s ="";
  var mm = {
    message : o.onMessage || console.log,
    progress : o.onProgress || console.log,
    end : o.onEnd || console.log
  };

  if(script) s = "importScripts('" + self.origin + "/" + script + "');";
  var m = "var sendMessage = " + function(m){postMessage({message:m});} + ";";
  var p = "var sendProgress= " + function(m){postMessage({progress:m});} + ";";
  var e = "var sendEnd= " + function(m){postMessage({end:m});} + ";";
  var d = "var data= " + JSON.stringify(data) + ";";

  fun = fun.toString();
  fun = fun
    .substring(
      fun.indexOf("{") + 1,
      fun.lastIndexOf("}")
    );

  var b = s+d+m+p+e+fun;

  var blob = new Blob(
    [b], {
      type: "application/javascript"
    }
  );

  var blobUrl = URL.createObjectURL(blob);
  var ww = new Worker(blobUrl);

  ww.onmessage=function(e){
    var m = e.data;
    for(var k in m){
      mm[k](m[k]);
    }
  };

  return;
}



/**
* Test for object equality
*
* @note asnwer by Ebrahim Byagowi at https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
*
* @param {Object} x First object to compare
* @param {Object} y Second object to compare
* @return {Boolean} Are those object equal ?
*/
export function isEqual(x,y){
  'use strict';
   /**
   * 
   *
   */
  if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
  // after this just checking type of one would be enough
  if (x.constructor !== y.constructor) { return false; }
  // if they are functions, they should exactly refer to same one (because of closures)
  if (x instanceof Function) { return x === y; }
  // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
  if (x instanceof RegExp) { return x === y; }
  if (x === y || x.valueOf() === y.valueOf()) { return true; }
  if (Array.isArray(x) && x.length !== y.length) { return false; }

  // if they are dates, they must had equal valueOf
  if (x instanceof Date) { return false; }

  // if they are strictly equal, they both need to be object at least
  if (!(x instanceof Object)) { return false; }
  if (!(y instanceof Object)) { return false; }

  // recursive object equality check
  var p = Object.keys(x);
  return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
    p.every(function (i) { return isEqual(x[i], y[i]); });

}




/**
* Create a button containing font awesome stack icon
* @param {Object} o options
* @param {Element} o.elContainer Button container
* @param {Array} o.classes classes to init the stack with
*/
export function StackButton(o){
  var sb = this;
  sb.config = {
    hidden : o.hidden,
    classHide : "mx-hide",
    elContainer : o.elContainer,
    classes : o.classes,
    classBase : o.classBase
  };
}

StackButton.prototype.build = function(){
  var elBtn = document.createElement("button");
  var elSpan = document.createElement("span");
  var elFront = document.createElement("i");
  var elBack = document.createElement("i");
  elSpan.appendChild(elFront);
  elSpan.appendChild(elBack);
  elBtn.appendChild(elSpan);
  this.elSpan = elSpan;
  this.elBtn = elBtn;
  this.elFront = elFront;
  this.elBack = elBack;
  if(this.config.elContainer) this.config.elContainer.appendChild(elBtn);
  this.setClasses();
  this.setHidden(this.config.hidden === true);
  return(this);
};

StackButton.prototype.setClasses = function(cl){
  cl = !!cl?cl instanceof Array?cl:[cl]:this.config.classes;
  var elFront = this.elFront;
  var elBack = this.elBack;
  var elSpan = this.elSpan;
  var elBtn = this.elBtn;
  elSpan.className = "fa-stack";
  elFront.className = "fa fa-stack-1x";
  elBack.className = "fa fa-stack-2x";
  elFront.classList.add(cl[0]);
  elBack.classList.add(cl[1]);
  elBtn.className = cl[2] || this.config.classBase ||'btn btn-default';
  return(this);
};
StackButton.prototype.setHidden = function(hide){
  var elBtn = this.elBtn;
  var classHide = this.classHide;
  if(hide === true){
    elBtn.classList.add(this.config.classHide);
    this.config.hidden = true;
  }else
    if(hide === false){
      elBtn.classList.remove(this.config.classHide);
      this.config.hidden = false;
    }else{
      elBtn.classList.toggle(this.config.classHide);
      this.config.hidden = elBtn.classList.contains(this.config.classHide);
    }
  return(this);
};

/**
* Display a panel modal
* @param {Object} o Options
* @param {String} o.id Id of the box. Default : random
* @param {Boolean} o.replace If a modal is displayed twice with the same id, delete the previous one. Default : true
* @param {Boolean} o.noShinyBinding  By default, the modal panel will try to bind automatically input elements. In some case, this is not wanted. Default : false
* @param {String} o.styleString Style string to apply to modal window. Default : empty
* @param {String|Element} o.content Body content of the modal. Default  : undefined
* @param {Array.<String>|Array.<Element>} o.buttons Array of buttons to in footer.
*
*/

export function modal(o){

  var id = o.id || makeId();
  var idBackground = "mx_background_for_" + id;
  var modal = document.getElementById(o.id) || document.createElement("div");
  var background = document.getElementById(idBackground) || document.createElement("div"); 
  var hasShiny = typeof window.Shiny !== "undefined";
  var hasSelectize = typeof window.jQuery === "function" && window.jQuery().selectize;
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
  }
  if(modal.id && !o.replace){
    return;
  }

  if(o.styleString){
    modal.style = o.styleString;
  }
  /*if(o.minHeight){*/
  //modal.style.minHeight = o.minHeight;
  /*}*/
  if( o.minWidth ){
    //modal.style.minWidth = o.minWidth;
    modal.style.width = o.minWidth;
  }

  var top = document.createElement("div");
  var topBtns =  document.createElement("div");
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
  top.appendChild(topBtns);
  
   var sBtnReset = new StackButton({
    hidden : true,
    classBase : 'mx-modal-btn-top fa',
    classes : ['fa-times','fa-circle-thin'],
    elContainer : topBtns
  }).build();

   var sBtnMinimise = new StackButton({
    classBase : 'mx-modal-btn-top fa',
    classes : ['fa-minus','fa-circle-thin'],
    elContainer : topBtns
  }).build();

  var sBtnHalfTop = new StackButton({
    classBase : 'mx-modal-btn-top fa',
    classes : ['fa-caret-up','fa-circle-thin'],
    elContainer : topBtns
  }).build();
  var sBtnHalfLeft = new StackButton({
    classBase : 'mx-modal-btn-top fa',
    classes : ['fa-caret-left','fa-circle-thin'],
    elContainer : topBtns
  }).build();

  sBtnMinimise.elBtn.onclick = function(){
    modal.classList.toggle('mx-modal-body-hidden');
    sBtnMinimise.setHidden(true);
    sBtnHalfLeft.setHidden(true);
    sBtnHalfTop.setHidden(true);
    sBtnReset.setHidden(false);
  };

  sBtnHalfLeft.elBtn.onclick = function(){
    modal.classList.toggle('mx-modal-half-left');
    sBtnMinimise.setHidden(true);
    sBtnHalfLeft.setHidden(true);
    sBtnHalfTop.setHidden(true);
    sBtnReset.setHidden(false);
  };

  sBtnHalfTop.elBtn.onclick = function(){
    modal.classList.toggle('mx-modal-half-top');
    sBtnMinimise.setHidden(true);
    sBtnHalfLeft.setHidden(true);
    sBtnHalfTop.setHidden(true);
    sBtnReset.setHidden(false);
  };

  sBtnReset.elBtn.onclick = function(){
    sBtnMinimise.setHidden(false);
    sBtnHalfLeft.setHidden(false);
    sBtnHalfTop.setHidden(false);
    sBtnReset.setHidden(true);
    resetModalClass();
  };


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
        b = textToDom(b);
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


/** Toggle button disabled state and warning or danger bootstrap classes
 * @param {Object} r options
 * @param {String} r.id Id of the button to toggle
 * @param {boolean} r.warning Use warning state instead of danger
 */
export function buttonToggle(r) {

  var elBtn = document.getElementById(r.id);
  if(elBtn){
    var c = elBtn.classList;

    if (r.disable === true) {

      c.add("btn-danger");
      c.remove("btn-warning");
      c.remove("btn-default");
      elBtn.setAttribute("disabled",true);

    } else if (r.warning === true) {
      c.add("btn-warning");
      c.remove("btn-danger");
      c.remove("btn-default");
      elBtn.removeAttribute("disabled");

    } else {
      c.add("btn-default");
      c.remove("btn-danger");
      c.remove("btn-warning");
      elBtn.removeAttribute("disabled");

    }
  }
}
/**
 * Update element content
 * @param {object} o Object 
 * @param {string} o.id Id of the element
 * @param {string} o.txt Replacement text
 */
export function updateText(o) {
  var el = document.getElementById(o.id);
  if (el) {
    var str = o.txt.toString();
    el.innerHTML = b64_to_utf8(str);
  }
}

/** 
 * convert b64 to utf8
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
export function b64_to_utf8(str) {
  str = str.replace(/\s/g, '');
  return decodeURIComponent(escape(window.atob(str)));
}

/** 
 * convert utf8 to b64
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
export function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

export function searchToObject() {
  var pairs = window.location.search.substring(1).split("&"),
    obj = {},
    pair,
    isJson,
    i,key,value;

  for ( i in pairs ) {
    if ( pairs[i] === "" ) continue;

    pair = pairs[i].split("=");
    key = decodeURIComponent( pair[0] );
    value = decodeURIComponent( pair[1] );
    try { value = JSON.parse(value); }catch(err){}
    obj[ key ] = value;
  }

  return obj;
}
/**
 * Split a string in n parts
 * @param {string} String to split
 * @param {number} Length of the chunk
 * @note taken from http://stackoverflow.com/questions/7033639/split-large-string-in-n-size-chunks-in-javascript
 */
export function chunkString(str, size) {
  var numChunks = Math.ceil(str.length / size),
    chunks = new Array(numChunks);

  for(var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}


/**
* Get extention from filename
* @param {String} str Filename
*/
export function getExtension(str){
  
  // "/" represent folder in jsZip and "^__" is prefix for max os x hidden folder. Both case : invalid.
  var isWrong = str.search(/^__/) > -1;
  var ext = str.toLowerCase().match(/.[a-z0-9]+$/);
  
  if(!isWrong && ext && ext instanceof Array){
    return ext[0];
  }

  return "";
}


/**
* Simple timer
* @method start Start the timer
* @method stop Start the timer
* @example
*  var a = new timer();
* timer.start();
* timer.stop();
*/

export function timer(){
  var start = 0;
}

timer.prototype.start = function(){
  this.start = window.performance.now(); 
};

timer.prototype.stop = function(){
  return window.performance.now()-this.start;
};



/**
* Estimate memory size of object
* @note https://gist.github.com/zensh/4975495
* @param {Object} object to evaluate
* @param {Boolean} humanReadable Output the result in formated text with units bytes; KiB; MiB, etc.. instead of bytes
*/
export function getSizeOf(obj,humanReadable){
  var bytes = 0;
  var seenObjects = [];
  humanReadable = humanReadable === undefined ? true : humanReadable ;

  function sizeOf(obj) {
    if(obj !== null && obj !== undefined) {
      if(seenObjects.indexOf(obj) === -1){
        seenObjects.push(obj);
        switch(typeof obj) {
          case 'number':
            bytes += 8;
            break;
          case 'string':
            bytes += obj.length * 2;
            break;
          case 'boolean':
            bytes += 4;
            break;
          case 'object':
            var objClass = Object.prototype.toString.call(obj).slice(8, -1);
            if(objClass === 'Object' || objClass === 'Array') {
              for(var key in obj) {
                if(!obj.hasOwnProperty(key)) continue;
                sizeOf(obj[key]);
              }
            } else bytes += obj.toString().length * 2;
            break;
        }
        return bytes;
      }
    }
  }



  var res =  sizeOf(obj);

  if(!humanReadable){
    return res ;
  }else{
    return formatByteSize(res);
  }
}


/**
 * Format byte to human readable value
 */
export function formatByteSize(bytes) {
  if(bytes < 1024) return bytes + " bytes";
  else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
  else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
  else return(bytes / 1073741824).toFixed(3) + " GiB";
}

/**
* Smooth scroll
* @note https://stackoverflow.com/questions/17722497/scroll-smoothly-to-specific-element-on-page
* @param {Object} o options
* @param {Element} o.el Element to scroll on
* @param {Number} o.from Starting point in px
* @param {Number} o.to Ending point in px
* @param {String} o.axis x (left) or y (top) ;
* @param {Number} o.during Duration in ms for 1000 px
* @param {String} o.using Easing function name
* @param {Number} o.timeout Set a timeout before moving. Default to 0;
* @param {Function} o.emergencyStop Function called during animation. If return true, animation is stoped.
*/
export function scrollFromTo(o){

  var start,time,percent,stop, duration, easing, bodyDim;
  var diff = o.to - o.from;
  var axis = o.axis || "y";

  if( o.using && o.using.constructor ==  Function ){
    easing = o.using;
  }else{
    easing = easingFun({
      type : o.using || "easeInOut",
      power : 2
    });
  }

  stop = o.emergencyStop instanceof Function ? o.emergencyStop : null;

  return new Promise(function(resolve,reject){
    setTimeout(function(){
      mx.helpers.onNextFrame(function(){
        if( axis === "y" ) bodyDim = document.body.clientHeight || 800; 
        if( axis === "x" ) bodyDim = document.body.clientWidth || 800; 
        if (!diff || diff === 0){
          resolve(true);

        } else if ( Math.abs(diff) > ( bodyDim * 1.5 )){
          // instant scroll
          if(axis == "y" ) o.el.scrollTop = o.to;
          if(axis == "x" ) o.el.scrollLeft = o.to;

          resolve(true);
        }else{
          // var duration = (o.during || 1000) * (Math.abs(diff)/1000); 
          duration = (o.during || 1000); 
          // scroll on next frame
          onNextFrame(function step(timestamp) {
            if (!start) start = timestamp;

            time = timestamp - start;
            percent = easing(Math.min(time / duration, 1));

            if(axis == "y" ) o.el.scrollTop = o.from + diff * percent;
            if(axis == "x" ) o.el.scrollLeft = o.from + diff * percent;

            if ( time < duration && !(stop && stop()) ) {
              onNextFrame(step);
            }else{
              resolve(true);
            }
          });
        }
      });
    },o.timeout||0);
  });
}

/**
* Create easing function
* @note https://gist.github.com/gre/1650294
* @param {object} o options
* @param {string} o.type type in "easeIn", "easeOut", "easeInOut",
* @param {integer} o.power Power of the function
*/
export function easingFun(o) {

  var opt = {
    easeIn : function (power) {
      return function (t) { return Math.pow(t, power);};
    },
    easeOut : function (power){
      return function (t) { return 1 - Math.abs(Math.pow(t-1, power));};
    },
    easeInOut : function(power) {
      return function(t) { return t<0.5 ? opt.easeIn(power)(t*2)/2 : opt.easeOut(power)(t*2 - 1)/2+0.5;};
    }
  };

  return opt[o.type](o.power) ;

}





/**
 * Test if undefined
 * @param {Object|Function}
 */
export function exists(x){
  return typeof(x) == "undefined";
}





/** Convert json string to object with given name on window
 * @param {Object} m Options
 * @param {String} m.json to parse
 * @param {String} m.name to name new object
 */
export function jsonToObj(m) {
  window[m.name] = JSON.parse(m.json);
}

/** Used for shiny to print a message in js console. Usefull when the R console is not visible
 * @param{Object} m Options
 * @param {String} m.msg Message to print
 */

export function jsDebugMsg(m) {
  console.log(m.msg);
}


/** Add or remove a class depending on enable option. The element has a class, ex. "hidden" and this will remove the class if m.enable is true.
 * @param {Object} m Options
 * @param {String} m.element Element id
 * @param {String} m.hideClass Class to remove if enabled is true
 * @param {Boolean} m.hide Hide add hideClass to given element
 * @param {Boolean} m.disable Add disabled attr to element
 */
export function hide(m) {
  var element, prefix;

  if (!m || !(m.class || m.id)) return;
  if (!m.hideClass) m.hideClass = "mx-hide";
  if (m.hide === undefined) m.hide = true;
  if (m.hide === undefined) m.disable = true;

  prefix = (m.id === undefined) ? "." : "#";


  if (m.id) {
    element = prefix + m.id;
  } else {
    element = prefix + m.class;
  }

  var $el = $(element);

  if ($el.length > 0) {
    if (m.hide) {
      $el.addClass(m.hideClass);
    } else {
      $el.removeClass(m.hideClass);
    }
    if (m.disable) {
      $el.attr("disabled", true);
    } else {
      $el.attr("disabled", false);
    }
  }
  /* else{*/
  //return;
  //console.log("hide: element " + element + " not found.");
  /*}*/
}


/** Toggle panel visibility in panels group.
 * @param {String} classGroup Class of tab group 
 * @param {String} classItem Class of tab item to show
 * @param {String} classHide Class to add for hiding
 * @param {Function} callback Callback function with one argument : state of item hide/show;
 */
export function panelSwitch(classGroup, classItem, classHide, callback) {
  var elsGroup = document.querySelectorAll("." + classGroup); 
  if (!classHide) classHide = "mx-hide";
    mx.helpers.forEachEl({
      els : elsGroup,
      callback : function(el){    
         var isItem = el.classList.contains(classItem);
         var isHidden = el.classList.contains(classHide);
        
        if(isItem && isHidden){
          el.classList.remove(classHide);
          if(callback) callback("on");
        }

        if(isItem && ! isHidden){
         el.classList.add(classHide);
          if(callback) callback("off");
        }

        if(!isItem){
         el.classList.add(classHide);
        }
      }
    });

}




/**
 * Check if an object is a html element
 * @param {Object} obj object to test
 */
export function isElement(obj) {
  return obj instanceof Node;
}


/**
 * Class handling : add, remove and toggle
 * @param o {Object} options
 * @param o.selector {String|Element} selector of element to handle or element eg. #test, .test
 * @param o.class {String|Array} class name to process. By default, "mx-hide"
 * @param o.action {String} action to use : add, remove or toggle
 */
export function classAction(o) {
  var el, hasClass;

  if (!o.class) o.class = "mx-hide";
  if (!o.action) o.action = "toggle";

  if (o.class.constructor != Array){
    o.class = o.class.split(/\s+/);
  }

  if (isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelectorAll(o.selector);
  }

  forEachEl({
    els : el,
    callback : classAction
  });

  function classAction(el){
    if (el && o.action) {

      o.class.forEach(function(cl){

        hasClass = el.classList.contains(cl);
        if (hasClass && (o.action == "remove" || o.action == "toggle")) {
          el.classList.remove(cl);
        }

        if (!hasClass && (o.action == "add" || o.action == "toggle")) {
          el.classList.add(cl);
        }
      });    
    }
  }
}

/**
 * Apply function on HTMLCollection
 * @param {Object} o options
 * @param {Object} o.els HTMLCollection egl div.children
 * @param {Function} o.callback Function to apply. Argument = element, iterator
 *
 */
export function forEachEl(o){
  if( isElement(o.els) ){
    o.callback(o.els);
  }else{
    for (var i = 0; i < o.els.length; ++i) {
      o.callback(o.els[i],i);
    }
  }
}

/**
* Get an object content an push it in an array
* @param {object} obj Object to convert
* @return {array}
*/
export function objectToArray( obj ){
  return Object.keys(obj).map(function (key) { return obj[key]; });
}


/**
 * Parent finder
 * @param {Object} o options;
 * @param {Element|string} o.selector Element or selector string;
 * @param {String} o.class Class of the parent 
 */
export function parentFinder(o) {
  var el;
  if (o.selector instanceof Node) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }

  while ((el = el.parentElement) && !el.classList.contains(o.class));
  return el;
}



/*export function ulSort(selectorUl,selectorSorting){*/
  //var elUl = selectorUl instanceof Node ? selectorUl : document.querySelector(selectorUl);
  //var elements = elUl.querySelectorAll("li");

  ////Create our function generator
  //function sortBy(prop){
    //return function(a, b){
      //var filter_a = parseInt( a.style[prop] );
      //var filter_b = parseInt( b.style[prop] );
      //return filter_a < filter_b? -1 :
        //(filter_a > filter_b ? 1 : 0);
    //};
  //}

  //function sortDom(filter){
    ////Transform our nodeList into array and apply sort function
    //return [].map.call(elements, function(elm){
      //return elm;
    //}).sort(sortBy(filter));
  //}

  ////Sort by left style property
  //var byLeft = sortDom('left');
  ////Sort by top style property
  //var byTop = sortDom('top');

/*}*/


/**
 * Handle sort event on list
 * 
 * Class for ul : sort-li-container
 * Class for li : sort-li-item
 * Class for handle : sort-li-handle (should be at first level in li);
 *
 * @param {Object} o options
 * @param {Element|String} o.selector Selector string or element for the ul root
 * @param {String} o.classHandle Class for the handle
 * @param {Function} o.callback Function to call after sort
 */
/*export function sortable_old(o){*/
  //var ulRoot;
  //if (o.selector instanceof Node) {
    //ulRoot = o.selector;
  //} else {
    //ulRoot = document.querySelector(o.selector);
  //}
  //var body = document.querySelector("body");
  //var liHandle,
    //liFrom,
    //liTo,
    //liNext,
    //liSet,
    //liGhost,
    //classFrom = "mx-sort-li-item",
    //classHandle = o.classHandle || "mx-sort-li-handle";

  //function setPos(el, l, t) {
    //l = l + "px";
    //t = t + "px";
    //el.style.left = l;
    //el.style.top = t;
  //}


  //function areTouching(a, b) {
    //var rectA = a.getBoundingClientRect();
    //var rectB = b.getBoundingClientRect();
    //var overlaps =
      //rectA.top < rectB.bottom &&
      //rectA.bottom > rectB.top &&
      //rectA.right > rectB.left &&
      //rectA.left < rectB.right;
    //return overlaps;
  //}


  //function isValidHandle(el) {
    //return el.classList.contains(classHandle);
  //}
  //function isValidLi(el) {
    //return el.classList.contains(classFrom);
  //}
  /**
   * mouse move
   */
  //function onMouseMove(e) {

    //liTo = e.target;
    //setPos(liGhost, e.clientX, e.clientY);

    //if (isValidLi(liTo)) {
      //e.preventDefault();
      //var rect = liTo.getBoundingClientRect();
      //liNext = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      //liSet = liNext && liTo.nextSibling || liTo;
      //ulRoot.insertBefore(liFrom, liSet);
    //}

    //if (!areTouching(liGhost, body)) {
      //onMouseUp(e);
    //}

  //}

  /*
   * mouse up 
   */
  //function onMouseUp(e) {
    //e.preventDefault();
    //liFrom.classList.remove("mx-sort-li-dim");
    //liGhost.remove();
    //o.callback();
    //window.removeEventListener('mousemove', onMouseMove, false);
    //window.removeEventListener('mouseup', onMouseUp, false);
  //}

  /**
   * mouse down
   */
  //function onMouseDown(e) {
    //var elHandle = e.target;
    //liFrom = mx.helpers.parentFinder({
      //selector : elHandle,
      //class : classFrom
    //});

    //if (isValidHandle(elHandle) && liFrom) {
      //e.preventDefault();
      //liGhost = liFrom.cloneNode(true);
      //var liFromStyle = liGhost.style;
      //var liFromRect = liFrom.getBoundingClientRect();
      //liGhost.classList.add("mx-sort-li-ghost");
      //liFrom.classList.add("mx-sort-li-dim");
      //ulRoot.appendChild(liGhost);
      //onMouseMove(e);
      //window.addEventListener('mousemove', onMouseMove, false);
      //window.addEventListener('mouseup', onMouseUp, false);
    //}

  //}

  //ulRoot.addEventListener('mousedown', onMouseDown, false);

/*}*/

/**
 * Set element attributes
 * @param {object} o options
 * @param {string} o.selector element selector
 * @param {string} o.atr attribute name
 * @param {string} o.val value
 */
export function setElementAttribute(o) {
  var el = document.getElementById(o.selector);
  if (el) {
    el.setAttribute(o.atr, o.val);
  }
}

/**
 * Set image attr
 * @param {object} o options
 * @param {string} o.id image id
 * @param {object} o.atr images attributes
 */
export function setImageAttributes(o) {
  var img = document.getElementById(o.id);

  if (img) {
    for (var a in o.atr) {
      img.setAttribute(a, o.atr[a]);
    }
  }
}


/**
 * Create and manage multiple progression bar
 * @param {Object} o Options
 * @param {boolean} o.enable Enable the screen 
 * @param {string} o.id Identifier of the given item
 * @param {number} o.percent Progress bar percentage
 * @param {string} o.text Optional text
 */
export function progressScreen(o) {
  var lItem, lItems, lScreen, lBody, lScreenBack, lScreenContainer;
  var pBarIn, pBarOut, pBarTxt;
  var id = o.id;
  var enable = o.enable !== undefined ? o.enable : false;
  var percent = o.percent !== undefined ? o.percent : 0;
  var text = o.text !== undefined ? o.text : "";

  lScreen = document.querySelector(".loading-screen");
  lScreenBack = document.querySelector(".loading-screen-background");
  lScreenContainer = document.querySelector(".loading-container");

  if (!enable) {
    if (lScreen) lScreen.remove();
    if (lScreenBack) lScreenBack.remove();
    return;
  }

  if (!id || !percent || !text) return;

  if (!lScreen && enable) {
    lBody = document.querySelector("body");
    lScreen = document.createElement("div");
    lScreenBack = document.createElement("div");
    lScreen.className = "loading-screen";
    lScreenBack.className = "loading-screen-background";
    lScreenContainer = document.createElement("div");
    lScreenContainer.className = "loading-container";
    lScreen.appendChild(lScreenContainer);
    lBody.appendChild(lScreenBack);
    lBody.appendChild(lScreen);
  }

  lItem = document.getElementById(id);

  if (!lItem) {
    lItem = document.createElement("div");
    lItem.className = "loading-item";
    lItem.setAttribute("id", id);
    pBarIn = document.createElement("div");
    pBarIn.className = "loading-bar-in";
    pBarOut = document.createElement("div");
    pBarOut.className = "loading-bar-out";
    pBarTxt = document.createElement("div");
    pBarTxt.className = "loading-bar-txt";
    pBarOut.appendChild(pBarIn);
    lItem.appendChild(pBarTxt);
    lItem.appendChild(pBarOut);
    lScreenContainer.appendChild(lItem);
  } else {
    pBarIn = lItem.getElementsByClassName("loading-bar-in")[0];
    pBarTxt = lItem.getElementsByClassName("loading-bar-txt")[0];
  }

  if (percent >= 100) {
    lItem = document.getElementById(id);
    if (lItem) lItem.remove();
  } else {
    pBarIn.style.width = percent + "%";
    pBarTxt.innerHTML = text;
  }

  lItems = lScreenContainer.getElementsByClassName("loading-item");

  if (lItems.length === 0) progressScreen({enable:false});

}


/** 
* Clone an object
* @param {Object|Array} Source to clone
*/
export function clone(obj){
  var copy, i;
  if ( obj === undefined || obj === null ) return {};
  if ( obj.constructor == Array ) {
    copy = [];
    obj.forEach(function(x,i){
      copy[i] = clone(x);
    });
    return copy;
  } else if (obj.constructor == Object) {
    copy = {};
    for (var prop in obj) {
      if (!obj.hasOwnProperty(prop)) continue;
        copy[prop] = clone(obj[prop]);
      }
    return copy;
  } else {
    return obj;
  }
}


/**
 * htmlToData 
 * @param {Object} o Options
 * @param {String|Element} o.selector Selector
 * @param {Number} o.scale Scale factor for output sizing
 * @param {String} o.style Add style rules to element
 */
export function htmlToData(o) {

  return new Promise(function(resolve,reject){
    var el, elClone, elCloneRect, elRect, tagToRemove;

    var out = "";

    if (o.selector instanceof Node) {
      el = o.selector;
    } else {
      el = document.querySelector(o.selector);
    }
    if(!el) resolve(undefined);

    if(!o.scale) o.scale=1;
    /**
     * Clone element and clean it. 
     * Some elements like input seems to break the SVG. Not Sure why.
     * Remove them is the way. Replace them by another tag does not work.
     */
    elClone = el.cloneNode(true);
    tagToRemove = ["input"];
    for(var i = 0 ; i < tagToRemove.length ; i++){
      elClone
        .querySelectorAll(tagToRemove[i])
        .forEach(function(x){
          x.remove();
        });
    }

    var addStyle = "padding:0px;margin:0px" + (o.style?";"+o.style:"");
    elClone.style = addStyle;
    el.parentElement.appendChild(elClone);
    elCloneRect = elClone.getBoundingClientRect();
    /**
     * SVG create
     */

    var data =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" + elCloneRect.width*o.scale + "' height='" +elCloneRect.height*o.scale + "'>" +
      "<defs>" +
      "<style type='text/css'>" +
      readStyles([elClone]) +
      "</style>" +
      "</defs>" +
      "<foreignObject width='100%' height='100%'>" +
      "<div xmlns='http://www.w3.org/1999/xhtml'>" +
      elClone.outerHTML +
      "</div>" +
      "</foreignObject>" +
      "</svg>";

    var url = buildSvgImageUrl(data);

    elClone.remove();

    // resolve promise
    setImage(
      url,
      resolve,
      reject
    );

    /**
     * functions
     */

    function buildSvgImageUrl(svg) {
      var b64 = mx.helpers.utf8_to_b64(svg);
      return "data:image/svg+xml;base64," + b64;
    }

    /**
     * Css steal : krasimir/css-steal
     */ 

    // elements to array
    function toArray(obj, ignoreFalsy) {
      var arr = [], i;
      for (i = 0; i < obj.length; i++) {
        if (!ignoreFalsy || obj[i]) {
          arr[i] = obj[i];
        }
      }
      return arr;
    }

    // looping through the styles and matching
    function getRules(el) {
      var sheets = document.styleSheets, result = [];
      el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector;
      for (var i in sheets) {
        var rules = sheets[i].rules || sheets[i].cssRules;
        for (var r in rules) {
          if (el.matches(rules[r].selectorText)) {
            result.push(rules[r].cssText);
          }
        }
      }
      return mx.helpers.getArrayStat({arr:result,stat:"distinct"}).join(" ");
    }

    // looping through the element's children
    function readStyles(els) {
      var res = els.reduce(function (styles, el) {
        styles.push(getRules(el));
        styles = styles.concat(readStyles(toArray(el.children)));
        return styles;  
      }, []);

      return mx.helpers.getArrayStat({arr:res,stat:"distinct"}).join(" ");
    }

    function setImage(url, resolve, reject) {
      var image = new Image();
      image.crossOrigin = 'Anonymous';
      image.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = elCloneRect.width * o.scale;
        canvas.height = elCloneRect.height * o.scale;
        ctx.scale(o.scale, o.scale);
        ctx.drawImage(this, 0, 0);
        var data = canvas.toDataURL();
        resolve(data);
      };
      image.onerror = function(e) {
        reject(e);
      };
      image.src = url;
    }
  });
}



export function injectHead(items){
  var s = items.scripts || [];
  var c = items.css || [];

  if(!mx.data.headItems) mx.data.headItems = {};

  s.forEach(function(i){
    if(!mx.data.headItems[i]){
      mx.data.headItems[i]=true;
      var script = document.createElement("script");
      script.src=i;
      script.async=false;
      document.head.appendChild(script);
    }
  });

  c.forEach(function(i){
    if(!mx.data.headItems[i]){
      mx.data.headItems[i]=true;
      var link = document.createElement("link");
      link.rel="stylesheet";
      link.type="text/css";
      link.href=i;
      document.head.appendChild(link);
    }
  });

}


export function getBrowserData() {
  return { 
    cookies : mx.helpers.readCookie(),
    userAgent : navigator.userAgent,
    //screenHeight : screen.height,
    //screenWidth : screen.width,
    //screenColorDepth : screen.colorDepth,
    timeZone : new Date().toString().replace(/.*[(](.*)[)].*/,'$1'),
    hasLocalStorage : !!window.sessionStorage, 
    hasSessionStorage : !!window.sessionStorage,
    hasGeolocation : !!navigator.geolocation
  };
}

/**
* Copy content of a div to clipboard
*
* @param {string} id Id of the div to copy
*/
export function copyText(id) {
  var elText = document.getElementById(id);
  if(!elText) return;
  elText.select();
  document.execCommand("copy");
  mx.helpers.iconFlash("clipboard");
}

export function shareTwitter(id) {
  var elText = document.getElementById(id);
  if(!elText) return;
  var url = elText.value || elText.innerHTML || "";
  // Opens a pop-up with twitter sharing dialog
  var shareURL = "https://twitter.com/share?"; //url base
  //params
  var params = {
    url: url, 
    text: "Shared from MapX",
    //via: "Fred_Moser",
    hashtags: "mapx"
  };

  for(var prop in params) shareURL += '&' + prop + '=' + encodeURIComponent(params[prop]);
  window.open(shareURL, '', 'left=0,top=0,width=550,height=450,personalbar=0,toolbar=0,scrollbars=0,resizable=0');

  mx.helpers.iconFlash("twitter");
}
