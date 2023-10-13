import { isEmpty } from "../is_test";
import { ws } from "./../mx.js";

export async function getMetadataKeywords(keyword) {
  if (isEmpty(keyword)) {
    return [];
  }

  const keywords = await ws.emitAsync(
    "/client/metadata/keywords/search",
    {
      keyword: keyword,
    },
    1e3
  );

  return keywords;
}
