/* jshint esversion :6 */


/** 
* Clone an array
* @param {Array} Source to clone
*/
export function cloneArray(arr){
  var i = arr.length;
  var clone = [];
  while(i--) { clone[i] = arr[i]; }
  return(clone);
}
/* Get stat of an array
 * @param {Object} o options
 * @param {Array} o.arr Numeric array
 * @param {String} o.stat Stat string : min, max, mean, median, distinct, quantile. Default = max;
 * @param {Number|Array} o.percentile : percentile to use for quantile
 */
export function getArrayStat(o){

  if( 
    o.arr === undefined ||
    o.arr.constructor != Array ||
    o.arr.length === 0
  ) return [];
 
  if(
    o.stat == "quantile" &&
    o.percentile && 
    o.percentile.constructor == Array
  ) o.stat = "quantiles";

  var arr = cloneArray( o.arr );
  var stat =  o.stat ? o.stat : "max";
  var len_o = arr.length;
  var len = len_o;

  function sortNumber(a,b) {
    return a - b;
  }

  var opt = {
    "max" : function(){ 
      var max = -Infinity ;
      var v = 0 ;
      while ( len-- ){
        v = arr.pop();
        if ( v > max ) {
          max = v;
        }
      }
      return max;
    },
    "min" : function(){ 
      var min = Infinity;
      while( len-- ){
        var v = arr.pop();
        if (v < min){
          min = v;
        }
      }
      return min;
    },
    "sum":function(){
      var sum = 0; 
      while( len-- ){ 
        sum += arr.pop() ;
      }
      return sum ;
    },
    "mean":function(){
      var sum = getArrayStat({
        stat : "sum",
        arr : arr
      });
      return sum / len_o;
    },
    "median":function(){
      var median = getArrayStat({
        stat : "quantile",
        arr : arr,
        percentile : 50
      });
      return median;
    },
    "quantile":function(){
      var result;
      arr.sort(sortNumber);
      o.percentile = o.percentile? o.percentile : 50;
      var index = o.percentile/100 * (arr.length-1);
      if (Math.floor(index) == index) {
        result = arr[index];
      } else {
        var i = Math.floor(index);
        var fraction = index - i;
        result = arr[i] + (arr[i+1] - arr[i]) * fraction;
      }
      return result;
    },
    "quantiles":function(){
      var quantiles = {};
      o.percentile.forEach(function(x){
        var res =  getArrayStat({
          stat : "quantile",
          arr : arr,
          percentile : x
        });
        quantiles[x] = res;  
      });
      return quantiles;
    },
    "distinct":function(){
      var n = {}, r = [];

      while( len-- ) 
      {
        if ( arr[len] && !n[arr[len]]  )
        {
          n[arr[len]] = true; 
          r.push(arr[len]); 
        }
      }
      return r;
    },
    "frequency":function(){
      var areObjects = (arr[0] && typeof arr[0] == "object" && arr[0].constructor == Object) ;
      var colNames = o.colNames;
      if(areObjects){
        if(colNames.constructor != Array) throw("colnames must be array");
        if(colNames.length==0) colNames = Object.keys(arr[0]);
      }else{
       colNames = getArrayStat({
         stat:"distinct",
         arr:arr
       });
      }
      var table = {};
      var val,prevVal;
      var colName;

      for(var j=0,jL=colNames.length;j<jL;j++){
        colName = colNames[j];
        table[colName] = areObjects?{}:0;
        for( var i=0, iL=arr.length; i<iL; i++ ){
          if( areObjects ){
             val = arr[i][colName] || null;
             table[colName][val] = table[colName][val]+1||1;  
          }else{
            if(arr[i] == colName) table[colName]++;
          }
        }
      }
      return table;
    },
    "sumBy":function(){

      var colNames = o.colNames;
      if(colNames.constructor != Array) throw("colnames must be array");
      if(colNames.length==0) colNames = Object.keys(arr[1]);
      var table = {};
      var val,prevVal;
      var colName;
      for(var j=0,jL=colNames.length;j<jL;j++){
        colName=colNames[j];
        for(var i=0,iL=arr.length;i<iL;i++){
          val=arr[i][colName]||0;
          prevVal=table[colName] || 0;
          table[colName]= prevVal + val;
        }
      }
      return table;
    }
  };

  return(opt[stat](o));

}
