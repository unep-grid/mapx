import { modal } from "./mx_helper_modal.js";
import {
  makeId,
  getExtension,
  progressScreen,
  isUploadFileSizeValid,
} from "./mx_helper_misc.js";
import { isView, isJson, isString } from "./is_test";
import { viewsListAddSingle } from "./views_list_manager";
import { moduleLoad } from "./modules_loader_async/index.js";
import { settings, data as mx_storage, mapboxgl } from "./mx.js";

import {
  viewAdd,
  getView,
  getViewsListId,
  getViewJson,
  getMap,
  isModeLocked,
  fitMaxBounds,
} from "./map_helpers/";

// default proj
const projDest =
  "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

// handle zip to geojson
export async function zipToGeoJSON(data) {
  let err = "";
  try {
    const JSZip = await import("jszip");
    const shapefile = await import("shapefile");
    const proj4 = (await import("proj4")).default;
    const turf = await import("@turf/meta");
    const files = await JSZip.loadAsync(data);
    const fileData = files.files;
    let dbf, shp, prj;
    for (let f in fileData) {
      const ext = getExtension(f);
      if (ext === ".dbf") {
        dbf = fileData[f];
      }
      if (ext === ".shp") {
        shp = fileData[f];
      }
      if (ext === ".prj") {
        prj = fileData[f];
      }
    }

    if (!shp) {
      err = err + " No shp file found in archive, abord.";
    }
    if (!dbf) {
      err = err + " No dbf file found in archive, abord.";
    }
    if (!prj) {
      err = err + " No prj file found in archive, abord.";
    }
    if (err) {
      throw new error(err);
    }

    const shpR = await shp.async("Uint8Array");
    const dbfR = await dbf.async("Uint8Array");
    const projOrigR = await prj.async("text");
    const gj = await shapefile.read(shpR, dbfR);

    let newCoord;

    turf.coordEach(gj, function (coord) {
      newCoord = proj4(projOrigR, projDest, coord);
      coord[0] = newCoord[0];
      coord[1] = newCoord[1];
    });
    return gj;
  } catch (e) {
    modal({
      content: e + " / " + err,
      title: "Error while reading shapefile",
    });
  }
}

/**
 * Convert data to geojson
 * @param {String} data data to parse
 * @param {String} Data type. Eg. kml, gpx, geojson
 */
export async function parseDataToGeoJSON(data, fileType) {
  let out;
  switch (fileType) {
    case "kml":
      out = await xmlToGeojson(data, "kml");
      break;
    case "gpx":
      out = await xmlToGeojson(data, "gpx");
      break;
    case "zip":
      out = await zipToGeoJSON(data);
      break;
    case "geojson":
      if (isString(data)) {
        out = JSON.parse(data);
      } else {
        out = data;
      }
      break;
    default:
      throw new Error(`Data ${format} not supported`);
  }

  return out;
}

/**
 *  Convert xml string data type, gpx or kml to geojson
 * @param {String} data XML data
 * @param {String} type kml or gpx
 * @return {Promise<GeoJSON>}
 */
async function xmlToGeojson(data, type) {
  const toGeoJSON = await import("@tmcw/togeojson");
  const xmlDom = new DOMParser().parseFromString(data, "text/xml");
  let out;
  switch (type) {
    case "gpx":
      out = toGeoJSON.gpx(xmlDom);
      break;
    case "kml":
      out = toGeoJSON.kml(xmlDom);
      break;
  }
  return out;
}

// handle worker
function handleFileParser(f) {
  return async function handler(e) {
    /**
     * Test for size
     */
    const isSizeValid = await isUploadFileSizeValid(f, { showModal: true });
    if (!isSizeValid) {
      progressScreen({
        enable: false,
        id: f.name,
      });
      return false;
    }

    const view = await spatialDataToView({
      fileName: f.name,
      title: f.name,
      abstract: f.name,
      fileType: f.fileType,
      data: e.target.result,
      save: true,
    });

    await viewsListAddSingle(view, {
      open: true,
    });
    return view;
  };
}

export async function spatialDataToView(opt) {
  const idRandom = makeId();

  const c = Object.assign(
    {},
    {
      worker: null,
      map: getMap(),
      gj: null, // maybe not used
      data: null,
      view: null,
      title: idRandom,
      fileName: idRandom,
      abstract: idRandom,
      fileType: "geojson",
    },
    opt,
  );

  /**
   * Init
   */
  const geojsonWorker = await moduleLoad("mx-drag-drop-worker");
  c.worker = new geojsonWorker();

  /**
   * Parse data according to filetype
   */
  const gJson = await parseDataToGeoJSON(c.data, c.fileType);

  const promView = new Promise((resolve) => {
    /*
     * handle message received
     */
    c.worker.onmessage = function (e) {
      const m = e.data;

      if (m.progress) {
        progressScreen({
          enable: true,
          id: c.fileName,
          percent: m.progress,
          text: c.fileName + ": " + m.message,
        });
      }

      /*
       * Errors
       */
      if (m.errorMessage) {
        alert(m.errorMessage);
      }

      /*
       * Extent
       */
      if (m.extent) {
        // bug with extent +/- 90. See https://github.com/mapbox/mapbox-gl-js/issues/3474
        if (m.extent[0] < -179) {
          m.extent[0] = -179;
        }
        if (m.extent[1] < -85) {
          m.extent[1] = -85;
        }
        if (m.extent[2] > 179) {
          m.extent[2] = 179;
        }
        if (m.extent[3] > 85) {
          m.extent[3] = 85;
        }

        if (m.extent[2] - m.extent[0] < 2) {
          m.extent[2] += 1;
          m.extent[0] -= 1;
        }

        if (m.extent[3] - m.extent[1] < 2) {
          m.extent[3] += 1;
          m.extent[1] -= 1;
        }

        const a = new mapboxgl.LngLatBounds(
          new mapboxgl.LngLat(m.extent[0], m.extent[1]),
          new mapboxgl.LngLat(m.extent[2], m.extent[3]),
        );
        fitMaxBounds(a);
      }

      // If layer is valid and returned
      if (m.layer) {
        progressScreen({
          enable: true,
          id: c.fileName,
          percent: 100,
          text: c.fileName + " done",
        });

        m.layer.metadata = {
          prority: 0,
          position: 0,
          idView: m.id,
          filterOrig: [],
        };

        // mx default view
        c.view = {
          id: m.id,
          type: "gj",
          project: settings.project.id,
          date_modified: new Date().toLocaleDateString(),
          data: {
            title: {
              en: c.title,
            },
            attributes: m.attributes,
            abstract: {
              en: c.abstract || c.title,
            },
            geometry: {
              extent: {
                lng1: m.extent[0],
                lat1: m.extent[1],
                lng2: m.extent[2],
                lat2: m.extent[3],
              },
            },
            layer: m.layer,
            source: {
              type: "geojson",
              data: m.geojson,
            },
          },
        };

        if (c.save !== false) {
          saveInLocalDb({
            view: c.view,
          });
        }

        c.worker.terminate();
        return resolve(c.view);
      }
    };
  });

  /*
   * Message to pass to the worker
   */
  c.worker.postMessage({
    data: gJson,
    fileName: c.fileName,
    fileType: c.fileType,
    id: `MX-GJ-${makeId(10)}`,
  });

  return promView;
}

async function saveInLocalDb(opt) {
  await mx_storage.geojson.setItem(opt.view.id, {
    view: getViewJson(opt.view, { asString: false }),
  });
  console.log(
    `Data saved and registered as geojson source. Id = ${opt.view.id} `,
  );
}

export function handleMapDragOver(evt) {
  evt.preventDefault();
  evt.dataTransfer.dropEffect = "move"; // Explicitly show this is a copy.
}

/**
 * Drop event occured on map : view or files ?
 *
 */
export function handleMapDrop(evt) {
  evt.preventDefault();
  let dt = evt.dataTransfer;

  if (!dt) {
    return;
  }

  let files = evt.dataTransfer.files;
  let data = evt.dataTransfer.getData("application/json");
  let hasData = isJson(data);
  let hasFiles = files.length > 0;

  if (hasData || hasFiles) {
    evt.stopPropagation();
    evt.stopImmediatePropagation();
  } else {
    return;
  }

  if (hasFiles) {
    handleFiles(files);
  }
  if (hasData) {
    const view = JSON.parse(data);
    if (isView(view)) {
      handleView(view);
    }
  }
}

/**
 * Drop event contains view data
 */
function handleView(view) {
  const idViews = getViewsListId();
  if (idViews.indexOf(view.id) > -1) {
    const viewOld = getView(view.id);
    viewAdd(viewOld);
  } else {
    view._temp = true;
    viewsListAddSingle(view);
  }
}

/**
 * Drop event as files
 */
export function handleFiles(files) {
  if (isModeLocked()) {
    return;
  }

  const nFiles = files.length;
  const exts = {
    ".json": "geojson",
    ".geojson": "geojson",
    ".kml": "kml",
    ".gpx": "gpx",
    ".zip": "zip",
  };

  // In case of multiple file, loop on them
  for (let i = 0; i < nFiles; i++) {
    const f = files[i];
    f.fileType = exts[getExtension(f.name)];

    // Only process geojson files. Validate later.
    if (!f.fileType) {
      alert(
        `${f.name}: filename not valid. 
      Supported files – based on file extension – are :
      ${JSON.stringify(Object.keys(exts))}`,
      );
      continue;
    }

    // get a new reader
    const reader = new FileReader();
    // handle events
    reader.onloadstart = handleProgressInit(f);
    reader.onprogress = handleProgressUpdate(f);
    reader.onerror = handleProgressError(f);
    reader.onload = handleFileParser(f);

    /*
     * read the data
     */
    if (f.fileType === "zip") {
      reader.readAsArrayBuffer(f);
    } else {
      reader.readAsText(f);
    }
  }
}

function handleProgressUpdate(f) {
  return function (e) {
    if (e.lengthComputable) {
      const percentLoaded = Math.round((e.loaded / e.total) * 50);
      progressScreen({
        enable: true,
        id: f.name,
        percent: percentLoaded,
        text: f.name + " loading (" + percentLoaded + "%)",
      });
    }
  };
}

function handleProgressInit(f) {
  return function () {
    progressScreen({
      enable: true,
      id: f.name,
      percent: 0,
      text: f.name + " init .. ",
    });
  };
}

function handleProgressError(f) {
  return function () {
    progressScreen({
      enable: true,
      id: f.name,
      percent: 100,
      text: f.name + "stop .. ",
    });
  };
}
