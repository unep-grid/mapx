


export function evaluateDiafView(opt){
  opt = opt || {};
  var view = opt.view || {};
  var forceUpdateMeta = opt.forceUpdateMeta || false;
  var h = mx.helpers;
  var txtTooltip;

  return mx.helpers.getDictItem("tooltip_diaf_score")
    .then(txt => {
      txtTooltip = txt;
      /**
      * Make sure metadata are there. 
      * Force update if needed
      */
      return mx.helpers.addSourceMetadataToView({
         view : view,
         forceUpdateMeta : forceUpdateMeta
      });
    })
    .then(meta => {
      var integrity = h.path(meta,"integrity",{});
      var threshold = 0.8;
      var items = Object.keys(integrity);
      var maxScore = items.length * 3;

      var nUnknown = items.reduce( (r,k) => {
        return integrity[k] * 1  === 0 ? r+1 : r  ;
      },0);

      var nNo = items.reduce( (r,k) => {
        return integrity[k] * 1  === 1 ? r+1 : r  ;
      },0); 

      var nPart = items.reduce( (r,k) => {
        return integrity[k] * 1  === 2 ? r+1 : r  ;
      },0);

      var nYes = items.reduce( (r,k) => {
        return integrity[k] * 1  === 3 ? r+1 : r  ;
      },0);

      var score = nYes * 3 / maxScore;

      var elStar = mx.helpers.elStrokeStar({
        diameter: 10,
        nBranch: 5,
        inlet: 0.5,
        progress: score || 0,
        threshold: threshold,
        color1: "#ccc",
        color2: "#0096f5"
      });

      elStar.style.marginBottom="-1px";

      var tooltip = mx.helpers.parseTemplate(txtTooltip,{
        score : Math.round(score*100)/100,
        yes : nYes,
        no : nNo,
        part : nPart,
        unknown : nUnknown
      });

      var elSpan = mx.helpers.el("span",{
          "class" : ['hint--left'],
          "aria-label": tooltip
        });

      elSpan.appendChild(elStar);

      return {
        elStar : elSpan,
        integrity : integrity,
        meta : meta,
        idView : view.id
      };

    });

}


