import { getLanguageCurrent } from "../language";

export async function updateEditorLanguage() {
  if (!ContentEdit) {
    // require global ContentEdit
    return;
  }

  const language = getLanguageCurrent();

  let langData;

  switch (language) {
    case "en":
      break;
    case "fr":
      langData = await import("ContentTools/translations/fr.json");
      break;
    case "es":
      langData = await import("ContentTools/translations/es.json");
      break;
    case "ar":
      langData = await import("ContentTools/translations/ar.json");
      break;
    case "ru":
      langData = await import("ContentTools/translations/ru.json");
      break;
    case "zh":
      langData = await import("ContentTools/translations/zh-cn.json");
      break;
    case "de":
      langData = await import("ContentTools/translations/de.json");
      break;
    case "fa":
    case "ps":
      langData = await import("ContentTools/translations/fa.json");
      break;
  }
  if (langData) {
    ContentEdit.addTranslations(language, langData);
  }
  ContentEdit.LANGUAGE = language;
}
