
/** 
 * Read all cookies
 * 
 * @return {Object} Object containing cookies values
 *
 */
function readCookie()
{   
  var cookies = document.cookie.split("; ");
  var values = {};
  for (var i = 0; i < cookies.length; i++)
  {   
    var spcook =  cookies[i].split("=");
    values[spcook[0]]=spcook[1];
  }
  return values ;
}


/**
 * Write cookies based on object keys
 * @param e {Object}
 * @param e.expiresInSec {integer} Number of second until end of the cookies. 0 = unlimied
 * @param e.cookie {Object} Object containing cookies name and values
 * @param e.deleteAll {Boolean} Remove every cookies
 * @param e.path
 * @param e.domain
 * @param e.reload {Boolean} Reload location
 */

function writeCookie(e)
{

  if(!e.expiresInSec) e.expiresInSec = 0;
  if(!e.path) e.path = "";
  if(!e.domain) e.domain = "";

  if( e.expiresInSec == 0 ){
    exp = (new Date()/1) + (10 * 365 * 24 * 60 * 60) ;
  }else{
    exp = e.expiresInSec;
  }


  if(e.deleteAll){
    exp = '01/01/1989';
    e.cookie = readCookie();
  }

  for( var c  in e.cookie){
    Cookies.set(c,e.cookie[c],{
      'path' : e.path,
      'domain' : e.domain,
      'expires' : exp}
    );
  }

  if(e.reload){
    window.location.reload();
  }

}

/* Shiny message handler for mxSetCookie function
*/

Shiny.addCustomMessageHandler("mxSetCookie",writeCookie)


/**
 * Cookie input binding for Shiny
 * 
 * Shiny will find an element with shinyCookie classes 
 * and return a new input member named with the id of 
 * of the element. 
 * @example  <div id="cookies" class="shinyCookies"></div>
 */
var shinyCookieInputBinding = new Shiny.InputBinding();
$.extend(shinyCookieInputBinding, {
  find: function(scope) {
    return  $(scope).find(".shinyCookies");
  },
  getValue: function(el) { 
    return readCookie();
  } 
});
Shiny.inputBindings.register(shinyCookieInputBinding);

