/* jshint esversion:6 */

export function epsgBuildSearchBox(opt){

  var selector = opt.selector;
  var el = mx.helpers.el;
  var elInput = document.querySelector(selector);

  if(!elInput){
    throw new Error("Element "+ selector +" not found");
  }
 
  elInput.classList.add("mx-hide");


  var elInputParent = elInput.parentElement;


  var elEpsgChange = 
    el("div",{
      class : ["input-group"]
    },
      el("input",{
        class : ['form-control','disabled'],
        disabled : true,
        value: elInput.value*1,
        type : 'text',
        id : 'epsgTextInput'
      }),
      el("span",{
        class : ['input-group-btn']
      },
        el('button',{
          class : ['btn','btn-default'],
          innerText : opt.txtButtonChange || 'Change',
          on : ['click',showSearch]
        })
      )
    );

  var elSearchGroup = el("div",{
    class : ['epsgio-box'],
    style : {
      display : 'none'
    }
  },      
    el("div",{
      class : ["input-group"]
    },
      el("input",{
        class : ['form-control'],
        placeholder : opt.txtSearchPlaceholder || 'Search projection',
        type : 'text',
        id : 'epsgSearchInput'
      }),
      el("span",{
        class : ['input-group-btn']
      },
        el('button',{
          class : ['btn','btn-default'],
          innerText : opt.txtButtonSearch || 'Search',
          on : ['click',searchEpsg]
        })
      )
    ),
    el('div',{
      id :'epsgListResults'
    })
  );

  elInputParent.appendChild(elEpsgChange);
  elInputParent.appendChild(elSearchGroup);

  /**
   * Show or hide search block
   */
  function showSearch(e) {
    elSearchGroup.style.display = 'block';
  }

  /**
   * Update input using value of returned code
   */
  function choose(e) {
    var code = e.toElement.dataset.code;
    var elEpsg = getEl('epsgTextInput');
    elInput.value = code;
    elEpsg.value = code;
    if( typeof Shiny == "object" && Shiny.onInputChange ){
      Shiny.onInputChange(elInput.id,code);
    }
    elSearchGroup.style.display = 'none';
    return "";
  }
  /**
   * Simple wrapper to get nested elements by id
   */
  function getEl(id){
    return elInputParent.querySelector('#'+id);
  }
  /**
   * Search epsg.io database and build results list as buttons
   */
  function searchEpsg(e) {
    var elInputSearch = getEl('epsgSearchInput');
    var elResults = getEl('epsgListResults');
    var txt = elInputSearch.value;

    if (!txt) return;

    /**
     * Reset list search
     */
    elResults.innerHTML = "";

    epsgQuery(txt,function(res){


      if(res.length == 0){
      var elEmpty = el("span");

        mx.helpers.getDictItem('noValue')
        .then(r => {
         elEmpty.innerText = r;
        });

        elResults.appendChild(elEmpty);

      }else{
      res.forEach((r, i) => {

        /**
         * Build select button
         */
        var elRow = el("div",
          el("button", {
            on: ['click', choose],
            innerText: r.name + " (" + r.code + ")",
            class: ['btn', 'btn-default','epsgio-btn-choose'],
            dataset: {
              code: r.code
            }
          })
        );
        elResults.appendChild(elRow);
      });
      }

    });
  }
}

/**
  * Validate epsg
  */
export function epsgQuery(code,cb){

  var url = "https://epsg.io/?q=" + code + "&format=json";

  if (!code){
    cb([]);
    return;
  }

  /**
   * Reset list search
   */

  return fetch(url)
    .then(res => res.json())
    .then(res => {
      cb(res.results || []);
    })
    .catch(e => {
      cb([]);
      throw new Error("Can't retrieve epsg code: "+ e);
    });


} 

