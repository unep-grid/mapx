const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: 'http://dev.mapx.localhost:8880/?project=MX-6ZH-Y46-C7I-AD5-IO1&language=en',
  // url: 'https://app.mapx.org/?project=MX-2LD-FBB-58N-ROK-8RH&language=en',
});

mapx.on('ready', () => {

  /**
   * Hide views panel
   */
  mapx.ask('set_panel_left_visibility', {
    panel: 'views',
    show: false,
  });

  /**
   * Display current project name
   */
  mapx.ask('get_project').then((s) => {
    $('#project').text(s);
  });

  /**
   * Build toggle buttons for each collections found
   */
  mapx.ask('get_views').then((views) => {
    var no_collection_name = 'Views in no collection';
    var collections = {};
    collections[no_collection_name] = [];
    views.forEach((view) => {
      //var view_collections = [];
      if ('collections' in view.data && Array.isArray(view.data.collections)) {
        view.data.collections.forEach((collection) => {
          if (collections[collection] === undefined) {
            collections[collection] = [];
          }
          collections[collection].push(view);
        });
      }
      else {
        collections[no_collection_name].push(view);
      }
    });

    var $ul = $('<ul>');
    Object.keys(collections).forEach(function(key) {
      var collection = collections[key];
      var $views_collection = $('<ul>');
      collection.forEach((view) => {
        var $a = $('<a href="#">')
          .text(view.data.title.en)
          .click(view, function(e) {
            e.preventDefault();
            var $this = $(this);
            var view = e.data;
            $this.toggleClass('active');
            var op = $this.hasClass('active') ? 'view_add' : 'view_remove';
            mapx.ask(op, {
              idView: view.id
            })
              .then(function(){
                if (op === 'view_add') {
                  $('#output').show();
                  $('#output .content').html(null);
                  $('#output .content').append($('<h3>').text(view.data.title.en));
                  $('#output .content').append($('<p>').html(view.data.abstract.en));
                  mapx.ask('get_view_legend_image', {idView: view.id}).then(function(data) {
                    $('#output .content').append($('<img>').attr('src', data));
                  });
                }

              })
          });
        $views_collection.append($('<li>').html($a));
      });
      $('<li>')
        .attr('data-collection', key)
        .append($('<span>').text(key), $views_collection)
        .appendTo($ul);
    });
    $ul.appendTo($('#actions'));
  });
});

$('#output .close').click(function(e) {
  e.preventDefault();
  $(this).closest('#output').hide();
});
