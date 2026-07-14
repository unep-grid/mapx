import { getArrayDistinct } from "./../../array_stat/index.js";
import { isNotEmpty } from "./../../is_test/index.js";

export function getTranslationCount(labels, languages) {
  return getArrayDistinct(languages).reduce(
    (count, language) => count + (isNotEmpty(labels?.[language]) ? 1 : 0),
    0,
  );
}

export function clearTranslations(labels, languages) {
  const cleared = { ...labels };
  for (const language of getArrayDistinct(languages)) {
    cleared[language] = "";
  }
  return cleared;
}
