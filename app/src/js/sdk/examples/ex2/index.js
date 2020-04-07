const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: 'http://app.mapx.localhost:8880/?project=MX-3ZK-82N-DY8-WU2-IGF&language=en',
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
   * Build toggle buttons for each views found
   */
  mapx.ask('get_views').then((views) => {
    const $ = jQuery;
    var $ul = $('<ul>');
    views.forEach((view) => {
      var $a = $('<a href="#">')
        .text(view.data.title.en)
        .click(view, function(e) {
          e.preventDefault();
          var $this = $(this);
          var view = e.data;
          $this.toggleClass('active');
          var op = $this.hasClass('active') ? 'open_view' : 'close_view';
          mapx.ask(op, {
            idView: view.id
          })
        });
      $ul.append($('<li>').append($a));
    });
    $ul.appendTo($('#actions'));
  });
});