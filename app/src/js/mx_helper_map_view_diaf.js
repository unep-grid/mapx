/* jshint evil:true, esversion:6  */

export function displayDiafModal(view) {
  var h = mx.helpers;
  var meta = h.path(view, "_meta", null);
  var el = h.el;

  if (meta) {
    var diaf = meta.integrity;
    var idsDiaf = Object.keys(diaf);
    var di;

    var ans = {
      "0": "dont_know",
      "1": "no",
      "2": "partial",
      "3": "yes"
    };
    var desc = function(id){
      return id + "_desc";
    };



    var maxWidthHead = "70%";

    var elTitleModal = el("span",{
      dataset: {
        lang_key: 'data_integrity_title'
      }  
    });

    var elDescBlock = el("h2",{
      dataset: {
        lang_key: 'data_integrity_desc'
      }
    });

    var elTableDiaf = el("table", {
      class: 'table'
    },
      el("thead",
        el("tr",
          el("th", {
            scope: 'col',
            dataset: {
              lang_key: 'data_integrity_table_key'
            }
          }),
          el("th", {
            scope: 'col',
            class : 'col-33',
            dataset: {
              lang_key: 'data_integrity_table_value'
            }


          })
        )
      ),
      el("tbody", {
        class: "table-striped"
      },
        idsDiaf.map(id => {
          di = diaf[id];
          return el("tr",
            el("td", 
              el("div", 
                el("bold", {
                  dataset : {
                    lang_key : id
                  }
                }),
                el("p",{
                  class : 'text-muted',
                  dataset : {
                    lang_key : desc(id)
                  }
                })
              )),
            el("td",{
              class : 'col-33',
              dataset : {
                lang_key : ans[di] 
              }
            }
            )
          );

        })
      ));

    var elContent = el("div",
      elDescBlock,
      elTableDiaf
    );

    var elModal =  h.modal({
      id: "diaf_modal",
      content: elContent,
      title: elTitleModal
    });

    h.updateLanguageElements({
      el: elModal
    });

  }
}
