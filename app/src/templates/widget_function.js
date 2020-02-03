/** 
 * Add functions to handle dashboard events
 * onAdd = Action to exectute when the widget is added to the DOM
 * onRemove = Action to execute when the widget is removed
 * onData = Action to execute when data is updated. Data is available with this.data 
 */
return {
  onAdd : function(widget) {
    console.log(widget);
  },
  onRemove : function(widget) {
    console.log(widget);
  },
  onData : function(widget,data) {
    console.log(data);
  }
};
