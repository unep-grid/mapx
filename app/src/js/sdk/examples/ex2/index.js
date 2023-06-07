/**
 * jQuery example
 * ( why not )
 */
const $ = jQuery;

const mapx = new mxsdk.Manager({
  container: document.getElementById("mapx"),
  verbose: true,
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
  },
  params: {
    closePanels: true,
  },
});

mapx.on("ready", async () => {
  /**
   * Hide views panel
   */
  mapx.ask("set_panel_left_visibility", {
    panel: "views",
    show: false,
  });

  /**
   * Display current project name
   */
  const project = await mapx.ask("get_project");

  $("#project").text(project);

  /**
   * Build toggle buttons for each views found
   */
  const $ul = $("<ul>");
  const views = await mapx.ask("get_views");

  for (const view of views) {
    const $a = $('<a href="#">')
      .text(view.data.title.en)
      .click(view, (e) => {
        e.preventDefault();
        const $elBtn = $(e.currentTarget);
        $elBtn.toggleClass("active");
        const op = $elBtn.hasClass("active") ? "view_add" : "view_remove";
        mapx.ask(op, {
          idView: view.id,
        });
      });
    $ul.append($("<li>").append($a));
  }

  $ul.appendTo($("#actions"));

});
