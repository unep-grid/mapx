
function toggleFullScreen(id) {

  var btn, btnImg;

  btn = document.getElementById(id);

  if(btn){
    btnImg = btn.querySelector("i");
  }

  if(screenfull.enabled){
    if(!screenfull.isFullscreen){
      if(btnImg){
        btnImg.className = "fa fa-compress";
      }
      screenfull.request();
    }else{
      if(btnImg){
        btnImg.className = "fa fa-expand";
      }
      screenfull.exit();
    }
  }else{
    alert("Fullscreen not enabled, sorry");
  }

}


