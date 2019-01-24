/* jshint esversion:6*/
import './style.css';
import Pickolor from "./pickolor";
import {buel} from 'buel';




for( var i = 0 ; i< 5; i++){
  var el = buel("button",{
    type : "button",
    dataset : {
      pickolor_trigger : true
    },
    style : {
      backgroundColor : "#ccc",
      width : "30px",
      height : "30px",
      padding : "10px"
    }
  });
  document.body.appendChild(el);
}





var elDest =  document.getElementById("dest"); 
var elDestOut =  document.getElementById("dest-out"); 

window.pk = new Pickolor({
  container : document.body,
  //selector : '.btn-pickolor',
  onInitColor : ( target ) => {
    return target.style.backgroundColor;
  },
  onPick : (color,target) => {
    target.style.backgroundColor = color;
  }
});

