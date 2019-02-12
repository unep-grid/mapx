
export function renderUserProjectsList(o){

  var elDest;
  var cnt = 0;
  var dat = o.data;
  var idCol = o.idCol || dat.id ? 'id':'project'; 
  var nRow = dat[idCol].length;
  var titles = Object.keys(dat);
  var nCol = titles.length;
  var elContainer = cel("div","mx-list-projects-container");
  var elProjects = cel("div","mx-list-projects");
  var elSearchInput =  cel("input","mx-list-projects-search");
  var elsRows = [cel("div")]; // empty array of rows.

  /* render */
 
  render();

  /**
  * Helpers
  */

  function wait(cb){
    window.setTimeout(render,1000);
  }

  function render(cb){
    var t0 = performance.now();
    elDest = document.getElementById(o.idList);
    if(cnt++ < 5){
      if(elDest){
        build();
      }else{
        wait();
      }
    }
  }
  
  function build(){
    var i,iL,j,jL;
    elContainer.appendChild(elSearchInput);
    elContainer.appendChild(elProjects);
    elDest.appendChild(elContainer);

    buildSearch();
    buildRows();
    listen();
  }

  /**
  * Clean remove listener
  */
  function detach(){
    elContainer.removeEventListener('keyup',filterList);
    elContainer.removeEventListener('click',handleClick);
  }

  /**
  * Enable listener
  */
  function listen(){
   elContainer.addEventListener('keyup',filterList);
   elContainer.addEventListener('click',handleClick);
  }


  /**
  * Handle click
  */
  function handleClick(e){
    var el = e.target;
    var ds = el.dataset;
    var actions = {
      "request_membership": function(){
        mx.helpers.requestProjectMembership(ds.request_membership);
      },
      "load_project" : function(){
        detach();
        mx.helpers.setProject(ds.load_project);
      }
    };
    Object.keys(actions).forEach(a => {
      if(ds[a]){
        actions[a]();
      }
    }); 
  }

  /**
  * Update list
  */
  function filterList(e){
    var elTarget = e.target;
    var elRow,elRowString,textSearch,textRow;
    var i,iL,j,jL;
    if( elTarget && elTarget.dataset.project_search ){
      textSearch = cleanString(elTarget.value);
      for( i=0, iL = elsRows.length; i < iL ; i++ ){
        elRow = elsRows[i];
        textRow = cleanString(elRow.innerText);
        if(textRow.match(textSearch)){
          elRow.classList.remove("mx-hide");
        }else{
          elRow.classList.add("mx-hide");
        }
      }
    }
  }
  

  /*
   * Create environment wrapper
   */
  function cel(type,classes,id){
    var el = document.createElement(type);
    classes = classes instanceof Array ? classes : [classes];
    el.className = classes.join(' ');
    if(id) el.id = id;
    return el;  
  }


  /**
  * Build rows
  */
  function buildRows(){
    var i, iL, j, jL, row = {};
    for( i=0, iL=nRow; i<iL; i++ ){
      var elRow = cel('div',"mx-list-projects-row");
      elProjects.appendChild(elRow);
      row = {};
      for( j=0, jL=nCol; j<jL; j++){
        row[titles[j]] = dat[titles[j]][i];
      }
      buildRow({
        data : row,
        elRow : elRow
      });
    }

    elsRows = elProjects.querySelectorAll('.mx-list-projects-row');
  }

  /**
   * Simple search tool
   */
  function buildSearch(){
    elSearchInput.dataset.project_search = true;
    mx.helpers.getDictItem("project_search_values").then(function(txt){
      elSearchInput.placeholder = txt;
    });
  }

  /**
   * clean strings
   */
  function cleanString(str){
    return mx.helpers.cleanDiacritic(str.toLowerCase());
  }

  function buildRow (opt){

    /*
     * Create content
     */
    var dat = opt.data;
    var elTop = cel("div","mx-list-projects-top");
    var elBottom = cel("div","mx-list-projects-bottom");
    var elLeft = cel("div","mx-list-projects-left");
    var elTitle = cel("h4");
    var elDesc =  cel("p","mx-list-projects-desc");
    var elViewCount = cel("p","mx-list-projects-view-count");
    var elRight = cel("div","mx-list-projects-right");
    var elRowBadges= cel("div","mx-list-project-opt");
    //var elRowJoin = cel("div","mx-list-project-opt");

    opt.elRow.appendChild(elTop);
    opt.elRow.appendChild(elBottom);
    elBottom.appendChild(elLeft);
    elBottom.appendChild(elRight);
    elTop.appendChild(elTitle);
    elTop.appendChild(elRowBadges);
    elLeft.appendChild(elViewCount);
    elLeft.appendChild(elDesc);

    /**
     * set values
     */ 

    /* TITLE */
    makeSwitchProjectButton({
      id : dat[idCol],
      label : dat.title,
      elTitle : elTitle
    });

    /* Description  */
    elDesc.innerText = dat.description;


    makeBadges({
      dat:dat,
      elTarget:elRowBadges
    });

    makeViewCount({
      dat:dat,
      elTarget:elViewCount
    });

  }

  function makeViewCount(opt){
    var n = mx.helpers.path(opt,'dat.count') || 0;
    var w = n>1 ? 'views':'view';
    mx.helpers.getDictItem(w).then(function(t){
      opt.elTarget.innerText = n + ' ' + t;
    });
  }

  function makeBadges(opt){
    var dat = opt.dat;
    var elBadgeContainer = cel("div");
    var roles = ["member","publisher","admin"];
    opt.elTarget.appendChild(elBadgeContainer);
    roles.forEach(r => {
      if(dat[r]){
        var elBadgeMember = cel("span","mx-badge-role");
        elBadgeContainer.appendChild(elBadgeMember);
        mx.helpers.getDictItem(r).then(function(t){
          elBadgeMember.innerText=t;
        });
      } 
    });
    /* Join Button if no role  */
    makeJoinButton({
      dat:dat,
      elTarget:opt.elTarget
    });
  }

  function makeJoinButton(opt){
    var dat = opt.dat;
    var elBtn = cel('a');
    if(!(dat.member || dat.admin || dat.publisher)){
      elBtn.href = '#';
      elBtn.dataset.request_membership = dat[idCol];
      mx.helpers.getDictItem('btn_join_project',mx.settings.language)
        .then(function(it){
          elBtn.innerText = it;
        });
      opt.elTarget.appendChild(elBtn);
    }
  }

  function makeSwitchProjectButton(opt){
    var elBtn = cel('a');
    elBtn.href = '#';
    elBtn.dataset.load_project =  opt.id;
    elBtn.innerText = opt.label ;
    opt.elTitle.appendChild(elBtn);
  }
}

