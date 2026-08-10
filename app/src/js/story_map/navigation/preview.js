// @ts-check

const COVER_SELECTOR = [
  ".mx-story-slide.mx-story-image-cover img",
  "img.mx-image-cover",
  "img.image-cover",
  ".mx-image-cover img",
  ".image-cover img",
].join(",");

/**
 * Convert a rendered story step into plain preview metadata. Reading from the
 * rendered step keeps language fallback identical to the story itself and
 * avoids passing arbitrary HTML to the navigation component.
 *
 * @param {Object} options
 * @param {Element} options.elStep
 * @param {string} [options.name]
 * @returns {{name: string, text: string, coverImageSrc: string}}
 */
export function getStepPreviewData({ elStep, name = "" }) {
  const slideFronts = Array.from(
    elStep.querySelectorAll(".mx-story-slide-front"),
  );
  const slideTexts = slideFronts.map((elSlide) =>
    normalizeText(elSlide.textContent || ""),
  );
  const text = slideTexts
    .filter(Boolean)
    .join(" ");
  const coverImage = /** @type {HTMLImageElement | null} */ (
    elStep.querySelector(COVER_SELECTOR)
  );

  return {
    name: normalizeText(name),
    text,
    coverImageSrc: coverImage?.getAttribute("src") || "",
  };
}

/** @param {string} value */
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}
