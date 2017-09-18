/*jshint esversion: 6 , node: true */

/** 
 * Read all cookies
 * 
 * @return {Object} Object containing cookies values
 *
 */
export function readCookie()
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

export function writeCookie(e)
{
  System.import("cookies-js").then(function(Cookies){
    let exp = 0;

    if(!e.expiresInSec) e.expiresInSec = 0;
    if(!e.path) e.path = "";
    if(!e.domain) e.domain = "";

    if( e.expiresInSec === 0 ){
      exp = (new Date()/1) + (10 * 365 * 24 * 60 * 60) ;
    }else{
      exp = e.expiresInSec;
    }

    if( e.deleteAll ){
      exp = '01/01/1989';
      e.cookie = mx.helpers.readCookie();
    }

    for( var c  in e.cookie ){
      Cookies.set(c,e.cookie[c],{
        'path' : e.path,
        'domain' : e.domain,
        'expires' : exp}
      );
    }

    if(e.reload){
      window.location.reload();
    }
  });
}

