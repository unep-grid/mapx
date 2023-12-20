import { getApiRoute } from "../api_routes";
import { isEmpty } from "../is_test";

import { ws } from "./../mx.js";

/**
 * Search through all public metadata keywords
 * @param {String} search
 * @returns {Promise<Array>} Array of keywords
 */
export async function getMetadataKeywords(search) {
  if (isEmpty(search)) {
    return [];
  }

  const keywords = await ws.emitAsync(
    getApiRoute("metadataKeywordsSearch"),
    {
      keyword: search,
    },
    1e3,
  );

  return keywords;
}
