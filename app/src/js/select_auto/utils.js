import { patchObject } from "../mx_helper_misc.js";

export async function getConfig(type, options = {}) {
  const config = await configLoader(type);
  return patchObject(config, options);
}

async function configLoader(type) {
  switch (type) {
    case "epsg": {
      const { config } = await import("./resolvers/epsg.js");
      return config;
    }
    case "format_vector_download": {
      const { config } = await import("./resolvers/format_vector_download.js");
      return config;
    }
    case "countries": {
      const { config } = await import("./resolvers/countries.js");
      return config;
    }
    case "sources": {
      const { config } = await import("./resolvers/sources_list.js");
      return config;
    }
    case "source_columns": {
      const { config } = await import("./resolvers/sources_list_columns.js");
      return config;
    }
    case "views": {
      const { config } = await import("./resolvers/views.js");
      return config;
    }
    case "themes": {
      const { config } = await import("./resolvers/themes.js");
      return config;
    }
    default:
      throw new Error(`Missing resolver ${type} `);
  }
}
