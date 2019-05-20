


export function getDiafScoreFromIntegrity(integrity){
  integrity = integrity || {};
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

  return {
    n : items.length,
    score : score,
    no : nNo,
    part : nPart,
    yes : nYes,
    unknown : nUnknown
  };

}


export function evaluateDiafView(opt){
  opt = opt || {};
  var view = opt.view || {};
  var forceUpdateMeta = opt.forceUpdateMeta || false;
  var h = mx.helpers;
  var txtTooltip;

  return h.getDictItem("tooltip_diaf_score")
    .then(txt => {
      txtTooltip = txt;
      /**
      * Make sure metadata are there. 
      * Force update if needed
      */
      return h.addSourceMetadataToView({
         view : view,
         forceUpdateMeta : forceUpdateMeta
      });
    })
    .then(meta => {
      var threshold = 0.8;
      var integrity = h.path(meta,"integrity",{});
      var diafScore = h.getDiafScoreFromIntegrity(integrity);
      var elStar = h.elStrokeStar({
        diameter: 10,
        nBranch: 5,
        inlet: 0.5,
        progress: diafScore.score || 0,
        threshold: threshold,
        color1: "#ccc",
        color2: "#0096f5"
      });

      elStar.style.marginBottom="-1px";

      var tooltip = mx.helpers.parseTemplate(txtTooltip,{
        score : Math.round(diafScore.score*100)/100,
        yes : diafScore.yes,
        no : diafScore.no,
        part : diafScore.part,
        unknown : diafScore.unknown
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


