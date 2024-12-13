import { default as style } from "./../../data/style/style_mapx.json";
import { default as routes } from "./routes_express.json";
import { default as links } from "./links.json";
import { default as emails } from "./emails.json";
import { default as wms } from "./wms.json";
import { default as settings } from "./base.json";
import { default as map } from "./map.json";
import { default as paths } from "./paths.json";
import { default as validation } from "./validation.json";
import { default as services } from "./services.json";
import { version } from "./../../../package.json";

settings.api.routes = routes;
settings.style = style;
settings.version = version;
settings.links = links;
settings.wms = wms;
settings.map = map;
settings.paths = paths;
settings.validation = validation;
settings.emails = emails;
settings.services = services;

export { settings };
