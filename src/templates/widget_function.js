/** 
 * Add functions to handle dashboard events
 * onAdd = Action to exectute when the widget is added to the DOM
 * onRemove = Action to execute when the widget is removed
 * onData = Action to execute when data is updated. Data is available with this.data 
 */
return {
  onAdd : function() {
    console.log("widget added");

  },
  onRemove : function() {

    console.log("widget removed");

  },
  onData : function() {
    console.log("widget receive data");
    console.log(this.data);

  }
};
