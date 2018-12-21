
/**
 * Handle view click events
 * @param o options
 */
export function handleViewClick(o){


  return function (event) {
    var el, t;

    var h = mx.helpers;
    /**
    * If target is the element to which the listener
    * is associated, return null. 
    * Eg. If it's the view list : return null.
    * Else, check the target for view_action_key in dataset.
    * If there is a match, execute associated action
    */
    if( event.target == event.currentTarget ) return ;

    el = event.target;


    /*
    * if has fa or canvas, it's proably an icon where
    * the container have the actual key
    */
    el = h.isIconFont(el) || h.isCanvas(el) ? el.parentElement : el;

   
    /*
    * tests
    */
    t = [
      {
        comment: "target is a shiny action button",
        test : el.dataset.view_action_handler == "shiny",
        action : function(){
          Shiny.onInputChange( 'mglEvent_' + o.id + '_view_action',{
            target : el.dataset.view_action_target,
            action : el.dataset.view_action_key,
            time : new Date()
          });
        }
      },
      {
        comment :"target is the show invalid/result metadata modal",
        test: el.dataset.view_action_key == "btn_badge_warning_invalid_meta",
        action : function(){
          var results = JSON.parse(el.dataset.view_action_data) ;
          h.displayMetadataIssuesModal(results);
        }
      },
      {
        comment :"target is the home project button",
        test : el.dataset.view_action_key == "btn_opt_home_project",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          var view = h.getViews({
            id : mx.settings.idMapDefault,
            idView : viewTarget
          });
          h.setProject(view.project);
        }
      },
      {
        comment :"target is the view meta diaf badge",
        test : el.dataset.view_action_key == "btn_opt_diaf_modal",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          var view = h.getView(viewTarget);
          h.displayDiafModal(view);
        }
      },
      {
        comment :"target is the move top button",
        test : el.dataset.view_action_key == "btn_opt_move_top",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          h.moveViewItem({
            id : viewTarget,
            mode : "top"
          });
        }
      },
      {
        comment :"target is the move bottom button",
        test : el.dataset.view_action_key == "btn_opt_move_bottom",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          h.moveViewItem({
            id : viewTarget,
            mode : "bottom"
          });
        }
      },
      {
        comment :"target is the delete geojson button",
        test : el.dataset.view_action_key == "btn_opt_delete_geojson",
        action : function(){

          var arg =  el.dataset ;

          h.removeView({
            id : o.id,
            idView : arg.view_action_target
          });

        }
      },
      {
        comment :"target is the upload geojson button",
        test : el.dataset.view_action_key == "btn_upload_geojson",
        action : function(){
          var idView = el.dataset.view_action_target;
          h.uploadGeojsonModal(idView);
        }
      },
      {
        comment :"target is the play button",
        test : el.dataset.view_action_key == "btn_opt_start_story",
        action : function(){
          h.storyRead({
            id : o.id,
            idView : el.dataset.view_action_target,
            save : false
          });
        }
      },
      {
        comment :"target is the search button",
        test : el.dataset.view_action_key == "btn_opt_zoom_visible",
        action : function(){
          h.zoomToViewIdVisible({
            id : o.id,
            idView : el.dataset.view_action_target
          });
        }
      },
      {
        comment :"target is zoom to extent",
        test : el.dataset.view_action_key == "btn_opt_zoom_all",
        action : function(){
          h.zoomToViewId({
            id : o.id,
            idView : el.dataset.view_action_target
          });
        }
      },
      {
        comment :"target is tool search",
        test : el.dataset.view_action_key == "btn_opt_search",
        action : function(){
          var elSearch =  document.getElementById(el.dataset.view_action_target);
          h.classAction({
            selector : elSearch,
            action : "toggle"
          });
        }
      },
      {
        comment : "target is a legend filter",
        test : el.dataset.view_action_key == "btn_legend_filter",
        allowDefault:true,
        action : function(){
          /*
           * After click on legend, select all sibling to check 
           * for other values to filter using "OR" logical operator
           */
          var viewValues = [],
            legendContainer = h.parentFinder({
              selector : el,
              class : "mx-view-item-legend-vt" 
            }),
            legendInputs = legendContainer.querySelectorAll("input") 
          ;
          var idView = el.dataset.view_action_target;
          var view = h.getViews({id:mx.settings.idMapDefault,idView:idView});
          var attribute = h.path(view,'data.attribute.name');
          var type = h.path(view,'data.attribute.type');

          var  filter = ["any"];
          var rules = h.path(view,"data.style.rulesCopy",[]);

          for(var i = 0, iL = legendInputs.length; i < iL ; i++){
            var li =  legendInputs[i];
            if(li.checked){
              var index = li.dataset.view_action_index*1;
              var ruleIndex = rules[index];
              if( typeof ruleIndex !== "undefined" && typeof ruleIndex.filter !== "undefined"  ) filter.push(ruleIndex.filter);
            }
          }

          view._setFilter({
            type : "legend", 
            filter : filter 
          });

        } 
      },
      {
        comment : "target is the label/input for the view to toggle",
        test : el.dataset.view_action_key == "btn_toggle_view", 
        allowDefault : true,
        action : function(){
          h.viewControler(o);       
        } 
      },
      {
        comment : "target is the reset button",
        test :  el.dataset.view_action_key == "btn_opt_reset",
        action :function(){
          h.resetViewStyle({
            id:o.id,
            idView:el.dataset.view_action_target
          });
        }
      },
      {
        comment: "target is the png screenshoot button",
        test :  el.dataset.view_action_key == "btn_opt_screenshot",
        action:function(){
          h.downloadScreenshotPdf({
            id: o.id, 
            idView: el.dataset.view_action_target
          });
        }
      },
      {
        comment: "target is the raster metadata link",
        test :  el.dataset.view_action_key == "btn_opt_meta_external",
        action:function(){
          var idView =  el.dataset.view_action_target;
          var view = h.getViews({id:mx.settings.idMapDefault,idView:idView});
          var link = h.path(view,"data.source.urlMetadata");
          var title =  h.path(view,"data.title." + mx.settings.language) || 
            h.path(view,"data.title.en");
          if(!title) title = idView;

          h.getDictItem("source_raster_tile_url_metadata").then(function(modalTitle){
            h.modal({
              title : modalTitle,
              id : "modalMetaData",
              content : "<b>" + modalTitle + "</b>: <a href=" + link + " target='_blank'>" + title + "</a>",
              minHeight:"150px"
            });         
          });
        }
      }
    ];

    var found = false;

    for(var i = 0; i < t.length ; i++ ){
      if( !found && t[i].test == true ){
        found = true;
        t[i].action();
      
        if( ! t[i].allowDefault ){
          /* Skip default */
          event.preventDefault();
          /* Stop bubbling */
          event.stopPropagation();
          /* Avoid other events */  
          event.stopImmediatePropagation();

        }
      
      }
    }

  };
}

