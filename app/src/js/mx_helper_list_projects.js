
export function renderUserProjectsList(o){


  var elDest;
  var cnt = 0;
  var dat = o.data;
  var idCol = o.idCol || dat.id ? 'id':'project'; 
  var nRow = dat[idCol].length;
  var titles = Object.keys(dat);
  var nCol = titles.length;


  /* render */
  render();


  function wait(cb){
    window.setTimeout(render,1000);
  }

  function render(cb){
    elDest = document.getElementById(o.idList);
    if(cnt++ < 5){
      console.log("try n"+cnt);
      if(elDest){
        console.log("build");
        build();
      }else{
        console.log("wait");
        wait();
      }
    }
  }
  
  function build(){
    var i,iL,j,jL;

    var elContainer = cel("div","mx-list-projects-container");
    var elProjects = cel("div","mx-list-projects");
    var elSearchInput =  cel("input","mx-list-projects-search");

    elContainer.appendChild(elSearchInput);
    elContainer.appendChild(elProjects);
    elDest.appendChild(elContainer);

    buildSearch({
      elInput : elSearchInput,
      elList : elProjects
    });

    for( i=0, iL=nRow; i<iL; i++ ){
      var elRow = cel('div',"mx-list-projects-row");
      elProjects.appendChild(elRow);
      var row = {};
      for( j=0, jL=nCol; j<jL; j++){
        row[titles[j]] = dat[titles[j]][i];
      }
      buildRow({
        data : row,
        elRow : elRow
      });
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
   * Simple search tool
   */
  function buildSearch(opt){
    var elInput = opt.elInput;


    mx.helpers.getDictItem("project_search_values").then(function(txt){
      elInput.placeholder = txt;
    });

    var elList = opt.elList;
    var elRow,elRowString,textSearch,textRow;
    var i,iL,j,jL;
    var elsRows ;
    elInput.addEventListener('keyup',function(e){
      elsRows = elList.querySelectorAll('.mx-list-projects-row');
      textSearch = cleanString(e.target.value);
      for( i=0,iL=elsRows.length;i<iL;i++){
        elRow = elsRows[i];
        textRow = cleanString(elRow.innerText);
        if(textRow.match(textSearch)){
          elRow.classList.remove("mx-hide");
        }else{
          elRow.classList.add("mx-hide");
        }
      }

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
    //elTop.appendChild(elRowJoin);
    elLeft.appendChild(elViewCount);
    elLeft.appendChild(elDesc);
    //elRight.appendChild(elRowBadges);
    //elRight.appendChild(elRowJoin);

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
      elBtn.onclick=function(){mx.helpers.requestProjectMembership(dat[idCol]);};
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
    elBtn.onclick=function(){mx.helpers.setProject(opt.id);};
    elBtn.innerText = opt.label ;
    opt.elTitle.appendChild(elBtn);
  }
}

