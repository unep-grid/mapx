export function normalizeLanguage(language) {
  return /^[a-z]{2}$/i.test(language || "") ? language.toLowerCase() : "en";
}
