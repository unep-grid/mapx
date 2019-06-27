/**
* Pixop interface handler
*/
export function overlapsSpotlightUpdate(){

  mx.helpers.initPixop();
  var state = overlapsSpotlightState();

  if( ! state.enabled ) return;

  mx.pixop.render({
    type : 'overlap-spotlight',
    debug : false,
    overlap : {
      nLayersOverlap : state.nLayers || 0,
      calcArea : state.calcArea,
      threshold : 127
    },
    canvas : {
      scale : window.devicePixelRatio == 2 ? 1 : 2,
      add : true,
      cicleRadius : 1000,
      bufferSpotlight : 10
    }
  });

  if(state.calcArea == true){
    var area = mx.pixop.result.area || 0;
    var resol = mx.pixop.getResolution();
    state.elTextArea.innerText = "~ " + (Math.round(area * 1e-6)) + " km2";
    state.elTextResol.innerText = " ~ " + formatDist(resol.lat) + " x " + formatDist(resol.lng) ;
  }

}

export function initPixop(){
  if(mx && !(mx.pixop instanceof mx.helpers.PixOp) ){
    mx.pixop = new mx.helpers.PixOp();
  }
}

function formatDist(v,squared){
  v = v || 0;
  squared = squared || false;
  var suffix = squared ? '2':'';
  var factor = squared ? 1e-6 : 1e-3;
  
  if( v > 1000){
   return  (Math.round(v*factor*1000)/1000) + " km" + suffix;
  }else{
    return (Math.round(v*1000)/1000)+ " m" + suffix;
  }
}

export function overlapsSpotlightClear(){
  mx.pixop.clear();
}

export function overlapsSpotlightToggle(){
  var state = mx.helpers.overlapsSpotlightState;
  var clear = mx.helpers.overlapsSpotlightClear;
  var update = mx.helpers.overlapsSpotlightUpdate;
  var map = mx.helpers.getMap();
  var currState = state();

  if(! currState.enabled ){
    state(true);
    update();
    mx.helpers.on('view_add',update);
    mx.helpers.on('view_remove',update);
    mx.helpers.on('view_filter',update);
    map.on('moveend',update);
    currState.elNum.addEventListener('change',update);
    currState.elEnableCalcArea.addEventListener('change',update);
  }else{
    state(false);
    clear();
    mx.helpers.off('view_add',update);
    mx.helpers.off('view_remove',update);
    mx.helpers.off('view_filter',update);
    map.off('moveend',update);
    currState.elNum.removeEventListener('change',update);
    currState.elEnableCalcArea.removeEventListener('change',update);
    currState.elTextArea.innerText = "0 km2";
    currState.elTextResol.innerText = "0 m x 0 m";
    currState.elEnableCalcArea.checked=false;
  }

}



export function overlapsSpotlightState(set){

  var clActive = 'active';
  var elBtn = document.getElementById("btnOverlapSpotlight");
  var elSelectNum = document.getElementById("selectNLayersOverlap");
  var elTextArea = document.getElementById("txtAreaOverlap");
  var elTextResol = document.getElementById("txtResolOverlap");
  var elEnableCalcArea = document.getElementById("checkEnableOverlapArea");

  var enabled = false;
  var calcArea = false;

  if( set != null ){

    if(set==true){
      elBtn.classList.add(clActive);
    }else{
      elBtn.classList.remove(clActive);
    }
  }

  enabled = elBtn
    .classList
    .contains('active');

  calcArea = elEnableCalcArea.checked == true;

  return {
    elEnableCalcArea : elEnableCalcArea,
    elTextArea : elTextArea,
    elTextResol : elTextResol,
    elNum : elSelectNum,
    elBtn : elBtn,
    enabled : enabled,
    nLayers : elSelectNum.value == 'all' ? 0 : elSelectNum.value * 1,
    calcArea : calcArea
  };

}


