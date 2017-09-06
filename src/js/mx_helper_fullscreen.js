/*jshint esversion: 6 */
export function toggleFullScreen(id) {
  var screenfull =  require("screenfull");

  var el = document.body;
  var btn;

  btn = document.getElementById(id).querySelector(".fa");

  if(screenfull.enabled){
    if(!screenfull.isFullscreen){
      if(btn){
        btn.classList.add("fa-compress");
        btn.classList.remove("fa-expand");
      }
      screenfull.request();
    }else{
      if(btn){
        btn.classList.remove("fa-compress");
        btn.classList.add("fa-expand");
      }
      screenfull.exit();
    }
  }else{
    alert("Fullscreen not enabled, sorry");
  }
}




