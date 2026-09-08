import { beforeEach, describe, expect, it, vi } from "vitest";

const { configurators } = vi.hoisted(() => ({ configurators: [] }));

vi.mock("./raster_url_configurator.js", () => ({
  RasterUrlConfigurator: vi.fn(function RasterUrlConfigurator(options) {
    const instance = { options, show: vi.fn() };
    configurators.push(instance);
    return instance;
  }),
}));

import { installRasterUrlShinyBridge } from "./raster_url_shiny_bridge.js";

function setup() {
  const root = document.createElement("main");
  const editor = document.createElement("fieldset");
  editor.dataset.rasterUrlEditor = "true";
  editor.dataset.rasterUrlView = "MX-AAAAA-BBBBB-CCCCC";
  editor.innerHTML = `
    <textarea id="textRasterTileUrl" readonly>https://old.test/{z}/{x}/{y}.png</textarea>
    <textarea id="textRasterTileLegend" readonly>https://old.test/legend.png</textarea>
    <select id="selectRasterTileSize">
      <option value="256" selected>256</option><option value="512">512</option>
    </select>
    <input id="checkRasterTileUseMirror" type="checkbox" checked>
    <button type="button" data-raster-url-configure><i class="fa fa-pencil"></i></button>
  `;
  root.append(editor);
  document.body.append(root);
  installRasterUrlShinyBridge({ root });
  return { root, editor };
}

describe("raster URL Shiny bridge", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    configurators.length = 0;
  });

  it("opens a draft configurator and updates the four native inputs", async () => {
    const { root, editor } = setup();
    const changed = [];
    for (const input of editor.querySelectorAll("textarea, select, input")) {
      input.addEventListener("change", () => changed.push(input.id));
    }

    editor.querySelector(".fa-pencil").click();

    expect(configurators[0].options.root).toBe(root);
    expect(configurators[0].show).toHaveBeenCalledWith(
      expect.objectContaining({
        idView: "MX-AAAAA-BBBBB-CCCCC",
        mode: "draft",
        config: {
          tiles: "https://old.test/{z}/{x}/{y}.png",
          legend: "https://old.test/legend.png",
          tileSize: 256,
          useMirror: true,
        },
      }),
    );

    const { onApplied } = configurators[0].show.mock.calls[0][0];
    onApplied(
      { valid: true },
      {
        tiles: "https://new.test/{z}/{x}/{y}.png",
        legend: "https://new.test/legend.png",
        tileSize: 512,
        useMirror: false,
      },
    );

    expect(editor.querySelector("#textRasterTileUrl").value).toContain(
      "new.test",
    );
    expect(editor.querySelector("#textRasterTileLegend").value).toContain(
      "new.test",
    );
    expect(editor.querySelector("#selectRasterTileSize").value).toBe("512");
    expect(editor.querySelector("#checkRasterTileUseMirror").checked).toBe(
      false,
    );
    expect(changed).toEqual([
      "textRasterTileUrl",
      "textRasterTileLegend",
      "selectRasterTileSize",
      "checkRasterTileUseMirror",
    ]);
  });
});
