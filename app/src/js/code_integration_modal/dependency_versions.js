import maplibrePkg from "../../../node_modules/maplibre-gl/package.json";
import maplibreContourPkg from "../../../node_modules/maplibre-contour/package.json";
import themeCorePkg from "../../../../submodules/mapx-style/packages/theme-core/package.json";

export const CODE_INTEGRATION_VERSIONS = Object.freeze({
  maplibre: maplibrePkg.version,
  maplibreContour: maplibreContourPkg.version,
  mapxStyle: themeCorePkg.version,
});
