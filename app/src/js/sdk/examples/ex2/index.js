const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url:'http://dev.mapx.localhost:8880'
});

mapx.on('ready', () => {
  /**
   * Hide views panel
   */
  mapx.ask('set_panel_left_visibility', {
    panel: 'views',
    show: false
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
          var op = $this.hasClass('active') ? 'view_add' : 'view_remove';
          mapx.ask(op, {
            idView: view.id
          });
        });
      $ul.append($('<li>').append($a));
    });
    $ul.appendTo($('#actions'));
  });
});
