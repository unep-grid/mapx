import { initializeMaintenance } from "./configuration.js";
import "./style.css";
import { getGlobeCamera } from "./globe_animation.js";
import { removeGlobeWhenUnavailable } from "./globe_visibility.js";

const languages = [
  {
    code: "en",
    name: "English",
    locale: "en-US",
    message: (date) =>
      `MapX is currently undergoing maintenance. Service is expected to resume on ${date} UTC. For any questions, contact info@mapx.org.`,
  },
  {
    code: "fr",
    name: "Français",
    locale: "fr-FR",
    message: (date) =>
      `MapX est actuellement en maintenance. La reprise est prévue le ${date} UTC. Pour toute question, contactez info@mapx.org.`,
  },
  {
    code: "es",
    name: "Español",
    locale: "es-ES",
    message: (date) =>
      `MapX está actualmente en mantenimiento. La reanudación está prevista para el ${date} UTC. Para cualquier pregunta, contacte con info@mapx.org.`,
  },
  {
    code: "ar",
    name: "العربية",
    locale: "ar",
    direction: "rtl",
    message: (date) =>
      `تخضع MapX حالياً لأعمال الصيانة. من المتوقع استئناف الخدمة في ${date} بالتوقيت العالمي UTC. لأي استفسار، يرجى التواصل مع info@mapx.org.`,
  },
  {
    code: "ru",
    name: "Русский",
    locale: "ru-RU",
    message: (date) =>
      `В настоящее время MapX находится на техническом обслуживании. Ожидается, что работа возобновится ${date} по времени UTC. По всем вопросам обращайтесь: info@mapx.org.`,
  },
  {
    code: "zh",
    name: "中文",
    locale: "zh-CN",
    message: (date) =>
      `MapX 目前正在进行维护。预计将于 ${date} UTC 恢复服务。如有任何问题，请联系 info@mapx.org。`,
  },
];

const fallbackDate = {
  en: "a date to be announced",
  fr: "une date qui sera annoncée ultérieurement",
  es: "una fecha que se anunciará próximamente",
  ar: "موعد سيتم الإعلان عنه لاحقاً",
  ru: "дата будет объявлена позднее",
  zh: "待公布的日期",
};

const app = document.getElementById("app");
const messages = app.querySelector("#maintenance-messages");

function formatDate(value, locale, languageCode) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return fallbackDate[languageCode];
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function createMessage(language, maintenanceEnd) {
  const item = document.createElement("article");
  item.className = "message";
  item.lang = language.code;
  if (language.direction) {
    item.dir = language.direction;
  }

  const languageName = document.createElement("span");
  languageName.className = "language-name";
  languageName.textContent = language.name;

  const text = document.createElement("p");
  text.textContent = language.message(
    formatDate(maintenanceEnd, language.locale, language.code),
  );

  item.append(languageName, text);
  return item;
}

function renderMessages(maintenanceEnd) {
  const fragment = document.createDocumentFragment();
  languages.forEach((language) => {
    fragment.appendChild(createMessage(language, maintenanceEnd));
  });
  messages.replaceChildren(fragment);
}

function createGlobeStyle(token) {
  const encodedToken = encodeURIComponent(token);
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${encodedToken}`,
        ],
        tileSize: 256,
        attribution:
          '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">© MapTiler</a>',
      },
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

function hideGlobe(globeSection, map) {
  if (map) {
    map.remove();
  }
  globeSection.remove();
}

async function startGlobe(token) {
  const globeSection = app.querySelector("#globe-section");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (
    removeGlobeWhenUnavailable({
      globeSection,
      token,
      prefersReducedMotion,
    })
  ) {
    return;
  }

  let maplibregl;
  try {
    [{ default: maplibregl }] = await Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]);
  } catch {
    hideGlobe(globeSection);
    return;
  }

  const globe = app.querySelector("#globe");
  globeSection.setAttribute("aria-hidden", "false");
  const bottomPadding = Math.min(globe.clientHeight * 0.14, 160);

  let map;
  let isLoaded = false;
  let animationFrame;

  const failTimer = window.setTimeout(() => {
    if (!isLoaded) {
      hideGlobe(globeSection, map);
    }
  }, 10000);

  try {
    map = new maplibregl.Map({
      container: globe,
      style: createGlobeStyle(token),
      center: [12, 24],
      zoom: 3.65,
      minZoom: 3,
      maxZoom: 3.8,
      pitch: 8,
      maxPitch: 12,
      padding: { bottom: bottomPadding },
      attributionControl: false,
      renderWorldCopies: false,
      interactive: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.once("load", () => {
      isLoaded = true;
      window.clearTimeout(failTimer);
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const camera = getGlobeCamera(elapsed);
        map.jumpTo(camera);
        animationFrame = window.requestAnimationFrame(animate);
      };

      animationFrame = window.requestAnimationFrame(animate);
    });

    map.on("style.load", () => {
      map.setProjection({
        type: "globe",
      });
    });

    map.on("error", (event) => {
      if (!isLoaded && event.error) {
        window.clearTimeout(failTimer);
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
        }
        hideGlobe(globeSection, map);
      }
    });
  } catch {
    window.clearTimeout(failTimer);
    hideGlobe(globeSection, map);
  }
}

void initializeMaintenance({ renderMessages, startGlobe });
