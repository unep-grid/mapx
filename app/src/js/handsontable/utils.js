import { getLanguageCurrent } from "./../language";

export function getHandsonLanguageCode() {
  let lang = getLanguageCurrent();
  let languages = {
    de: "de-DE",
    es: "es-MX",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
  };
  return languages[lang] || "en-US";
}

export function typeConverter(type) {
  const def = "text";
  return (
    {
      boolean: "checkbox",
      number: "numeric",
      string: "text",
      date: "date",
    }[type] || def
  );
}
