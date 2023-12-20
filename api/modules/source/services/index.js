import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";
import { pgRead } from "#mapx/db";
import { getJoinConfig } from "#mapx/source";
import { isEmpty, isTrue, isSourceId } from "@fxi/mx_valid";

export async function ioSourceServices(socket, data, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No Session");
    }

    const { method, config } = data;
    const { idSource, value } = config || {};

    if (!isSourceId(idSource)) {
      throw new Error("missing source id");
    }

    switch (method) {
      case "has_service":
        return cb(await sourceHasService(idSource, value));
      case "is_downloadable":
        return cb(await isSourceDownloadable(idSource));
      case "get_services":
        return cb(await getSourceServices(idSource));
      default:
        throw new Error("Unsupported method");
    }
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
  cb(null);
  return;
}

/**
 * Retrieves services associated with a given source ID.
 * @param {string} idSource - The ID of the source to retrieve services for.
 * @returns {Promise<Array>} A promise that resolves to an array of services.
 */
export async function getSourceServices(idSource) {
  const sql = parseTemplate(templates.getSourceServices);
  const res = await pgRead.query(sql, [idSource]);
  if (res.rowCount === 0) {
    return [];
  }
  return res.rows[0].services;
}

/**
 * Checks if a given source has a specified service.
 * @param {string} idSource - The ID of the source to check.
 * @param {string} name - The name of the service to check for.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the service exists.
 */
export async function sourceHasService(idSource, name) {
  const services = await getSourceServices(idSource);
  return services.includes(name);
}

/**
 * Determines if a source is downloadable, considering its join configuration.
 * @param {string} idSource - The ID of the source to check.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the source is downloadable.
 */
export async function isSourceDownloadable(idSource) {
  const joinConfig = await getJoinConfig({ id_source: idSource });

  if (isEmpty(joinConfig)) {
    return sourceHasService(idSource, "mx_download");
  } else {
    
    if (joinConfig.id_source !== idSource) {
      throw new Error("Malformed join configuration");
    }

    const thisSourceIsDownloadable = await sourceHasService(
      idSource,
      "mx_download"
    );

    if (!thisSourceIsDownloadable) {
      return false;
    }

    const joinSources = joinConfig.joins.map((join) => join.id_source);
    const baseSource = joinConfig.base.id_source;

    const sources = [baseSource, ...joinSources];

    const promDownloadable = sources.map(isSourceDownloadable);
    const areDownloadable = await Promise.all(promDownloadable);

    return areDownloadable.every(isTrue);
  }
}
