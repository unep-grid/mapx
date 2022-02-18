import './style.css';
import Pickolor from "./pickolor";
import {el} from './../el/src/index.js';


for( var i = 0 ; i< 5; i++){
  var elBtn = el("button",{
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
  document.body.appendChild(elBtn);
}


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

