/* jshint evil:true, esversion:6  */


/*
* Update all badges at once
* @param {Object} o Options
* @param {Boolean} o.forceUpdateMeta force metadata remote fetching
*/
export function updateViewsBadges(o){
  o = o || {};
  var forceUpdateMeta = o.forceUpdateMeta || false;


  var h = mx.helpers;
  var views = h.getViews({asArray:true});
  views.forEach(v => {
    //mx.helpers.onNextFrame(()=>{
    setTimeout(()=>{
      mx.helpers.setViewBadges({
        view : v,
        forceUpdateMeta : forceUpdateMeta
      });
    },500);
  });
}

/*
* Update a sinfle view badges
* @param {Object} o Options
* @param {Boolean} o.forceUpdateMeta force metadata remote fetching
* @param {Object} o.view View to which add badges
*/
export function setViewBadges(opt){

  opt = opt || {};
  
  var h = mx.helpers;
  var view = opt.view || {};
  var cl;
  var elBadges = document.createElement("div");
  var readers = view.readers || [];
  var hasEdit = view._edit === true;
  var isValidable = view.type == "rt" || view.type == "vt";
  var hasDiaf = view.type == "vt";
  var hasPublic = readers.indexOf("public") > -1;
  var isShared = view.project !== mx.settings.project;
  var elViewBadgesContainer = document.getElementById("view_badges_" + view.id);
  if(!elViewBadgesContainer) return;
  elViewBadgesContainer.innerHTML = "";
  elViewBadgesContainer.appendChild(elBadges);
  elBadges.classList.add("mx-view-badges");

  if( hasPublic ){

    /**
     * Add public Badge
     */
    addBadgePublic({
      elBadges : elBadges
    });

    /**
     * Check if it's valid, add the validate badge
     */
    if( isValidable ){

      /**
       * Validate asynchronously metadata
       */
      h.validateMetadataView({
        view : view,
        forceUpdateMeta : opt.forceUpdateMeta
      })
        .then( validation => {

          if( ! validation.valid ){

            /**
             * Add not valid badge
             */
            addBadgePublicNotValid({
              elBadges : elBadges,
              validation : validation
            });

          }else if(hasDiaf){

            /**
             * Validation passed. Test DIAF
             */
            addBadgeDiaf({
              elBadges : elBadges,
              view : view
            });

          }

        })
        .then(()=>{
          /**
           * Update languages
           */
          h.updateLanguageElements({
            el: elBadges
          });

        });
    }
  }

  if( isShared ){ 

    /**
     * Add shared badge
     */
    addBadgeShared({
      elBadges : elBadges
    });
  }

  /**
   * Add editable badge
   */
  addBadgeEdit({
    elBadges : elBadges,
    viewEditable : hasEdit
  });

  /**
  * Update languages
  */

  h.updateLanguageElements({
    el: elBadges
  });

}


/**
 * Helpers
 */

/**
 * Add public badge
 */
function addBadgePublic(opt){
  var elBadges = opt.elBadges;

  var elBadge  = createViewBadge({
    iconClasses : ["mx-view-public-valid","fa","fa-check-circle"],
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_public_valid"
  });
  elBadges.appendChild(elBadge);

}

/**
 * Add editor / lock badge
 */
function addBadgeEdit(opt){
  var hasEdit = opt.viewEditable;
  var elBadges = opt.elBadges;
  var elBadge  = createViewBadge({
    iconClasses : ["fa", hasEdit ? "fa-unlock" : "fa-lock" ],
    tooltipClasses : ["hint--left"],
    tooltipKey : hasEdit ? "view_editable" : "view_locked"
  });
  elBadges.appendChild(elBadge);
}

/**
 * Add shared badge
 */
function addBadgeShared(opt){

  var elBadges = opt.elBadges;
  var elBadge = createViewBadge({
    iconClasses : ["fa","fa-share-alt-square"],
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_shared"
  });
  elBadges.appendChild(elBadge);
}
/**
 * Evaluate diaf and add badge
 */
function addBadgeDiaf(opt){
  var h = mx.helpers;
  var view = opt.view;
  var elBadges = opt.elBadges;

  h.evaluateDiafView({
    view : view
  })
    .then( result => {
      var elStar = result.elStar;
      elBadges.appendChild(elStar);
      elStar.dataset.view_action_key = "btn_opt_diaf_modal";
      elStar.dataset.view_action_target = result.idView;
    });
}

/**
 * add a badge "public without metadata valid"
 */
function addBadgePublicNotValid(opt){

  var h = mx.helpers;
  var validation = opt.validation;
  var elBadges = opt.elBadges;
  var results = h.path(validation,'results');
  var elBadge = createViewBadge({
    iconClasses : ["mx-view-public-not-valid","fa","fa-exclamation-triangle"],
    style : {
      color : "red"
    },
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_public_not_valid"
  });

  elBadge.dataset.view_action_key="btn_badge_warning_invalid_meta";
  elBadge.dataset.view_action_data=JSON.stringify(results);
  elBadges.appendChild(elBadge);

}


/*
* Display a modal window with validation results
* NOTE: see event handler in mx_helper_map_view_click.js
* @param {Object} results validation results
*/
export function displayMetadataIssuesModal(results){
  mx.helpers.getDictItem("validate_meta_title")
    .then( title => {
      mx.helpers.modal({
        id : "modal_validation_metadata",
        replace : true,
        title : title,
        content : mx.helpers.validationMetadataTestsToHTML(results)
      });
    });
}


/**
 * create a view badge
 */
function createViewBadge(opt){
  var el = mx.helpers.el;
  return el("span",
    {
      class : opt.tooltipClasses || "hint--left",
      dataset : {
        lang_type: 'tooltip',
        lang_key : opt.tooltipKey || ""
      }
    },  
    el("i",
      {
        class : opt.iconClasses || ["fa","fa-check-circle"] 
      }
    )
  );
}

