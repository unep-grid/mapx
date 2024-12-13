import { el } from "../el_mapx";
import { isObject } from "../is_test";
import { getDictItem, updateLanguageElements } from "../language";
import { settings } from "../settings";

export function epsgBuildSearchBox(opt) {
  const selector = opt.selector;
  const elInput = document.querySelector(selector);
  const hasShiny = isObject(Shiny) && Shiny.onInputChange;
  if (!elInput) {
    console.warn(`epsgBuildSearchBox : element ${selector} not found`);
    return;
  }

  const elInputParent = elInput.parentElement;

  /*
   * hide actual input
   */
  elInput.style.display = "none";

  /*
   * New inputs
   */
  const elEpsgInput = el("input", {
    class: ["form-control"],
    placeholder: "Epsg code. e.g. 4326",
    dataset: {
      lang_key: "epsg_placeholder_input",
      lang_type: "placeholder",
    },
    value: elInput.value ? elInput.value * 1 : "",
    id: "epsgTextInput",
  });

  const elButtonGroup = el(
    "span",
    {
      class: ["input-group-btn"],
    },
    el("button", {
      class: ["btn", "btn-default"],
      dataset: { lang_key: "epsg_btn_open_search" },
      innerText: "Search",
      on: ["click", toggleSearch],
    }),
  );

  const elEpsgChange = el(
    "div",
    {
      class: ["input-group"],
    },
    elEpsgInput,
    elButtonGroup,
  );

  /**
   * Search group
   */

  const elInputSearch = el("input", {
    class: ["form-control"],
    placeholder: "Enter country/region name",
    dataset: {
      lang_key: "epsg_placeholder_search",
      lang_type: "placeholder",
    },
    type: "text",
    id: "epsgSearchInput",
  });

  const elResults = el("div", {
    id: "epsgListResults",
    on: ["click", choose, true],
  });

  const elSearchGroup = el(
    "div",
    {
      class: ["epsgio-box", "well"],
      style: {
        display: "none",
      },
    },
    el("label", {
      dataset: {
        lang_key: "epsg_label_search",
      },
    }),
    el(
      "div",
      {
        class: ["input-group"],
      },
      elInputSearch,
      el(
        "span",
        {
          class: ["input-group-btn"],
        },
        el("button", {
          class: ["btn", "btn-default"],
          innerText: "Search",
          dataset: { lang_key: "epsg_btn_search" },
          on: ["click", searchEpsg],
        }),
      ),
    ),
    elResults,
  );

  /**
   * Append to the parent
   */
  elInputParent.appendChild(elEpsgChange);
  elInputParent.appendChild(elSearchGroup);

  /**
   * Update labels
   */
  updateLanguageElements({ el: elInputParent });

  /**
   * Show or hide search block
   */
  function toggleSearch() {
    const isVisible = elSearchGroup.style.display === "block";
    elSearchGroup.style.display = isVisible ? "none" : "block";
  }

  /**
   * Update input using value of returned code
   */
  function choose(e) {
    const code = e?.target?.dataset?.code;
    if (!code) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    elInput.value = code;
    elEpsgInput.value = code;
    if (hasShiny) {
      Shiny.onInputChange(elInput.id, code);
    }
    elSearchGroup.style.display = "none";
    return code;
  }
  /**
   * Search epsg.io database and build results list as buttons
   */
  async function searchEpsg() {
    const txt = elInputSearch.value;

    if (!txt) {
      return;
    }
    elResults.innerHTML = "";

    const res = await epsgQuery(txt);

    if (res.length === 0) {
      const elEmpty = el("button", {
        class: ["btn", "btn-default", "epsgio-btn-choose", "disabled"],
      });
      elEmpty.innerText = await getDictItem("noValue");
      elResults.appendChild(elEmpty);
    } else {
      for (const r of res) {
        /**
         * Build select button
         */
        const elRow = el(
          "div",
          el("button", {
            innerText: r.name + " (" + r.code || r.id.code + ")",
            class: ["btn", "btn-default", "epsgio-btn-choose"],
            dataset: {
              code: r.id.code,
            },
          }),
        );
        elResults.appendChild(elRow);
      }
    }
  }
}

/**
 * Search MapTiler coordinate systems database
 * @param {String} code - EPSG code, country name, or region
 * @returns {Promise<Array>} Array of matching projection systems
 * @throws {Error} If token is missing or API request fails
 */
export async function epsgQuery(code) {
  if (!settings?.services?.maptiler?.token) {
    throw new Error("MapTiler API token is required");
  }

  const token = settings.services.maptiler.token;
  const url = new URL(
    `https://api.maptiler.com/coordinates/search/${encodeURIComponent(
      code,
    )}.json`,
  );
  url.searchParams.set("exports", "true");
  url.searchParams.set("key", token);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `MapTiler API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.warn("EPSG query failed:", error);
    throw error; // Re-throw to let caller handle the error
  }
}
