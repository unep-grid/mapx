import { beforeEach, describe, expect, it, vi } from "vitest";

const rowsMock = vi.hoisted(() => vi.fn());

vi.mock("../attribution_manager", () => ({
  AttributionManager: vi.fn(() => ({
    rows: rowsMock,
  })),
}));

vi.mock("../el/src/index.js", () => ({
  el: (tagName, attrs, children) => {
    const node = document.createElement(tagName);
    const childItems = [];

    if (attrs instanceof Element || typeof attrs === "string") {
      childItems.push(attrs);
    } else if (Array.isArray(attrs)) {
      childItems.push(...attrs);
    } else if (attrs && typeof attrs === "object") {
      for (const [key, value] of Object.entries(attrs)) {
        switch (key) {
          case "class":
            node.classList.add(...value);
            break;
          case "on":
            node.addEventListener(value[0], value[1]);
            break;
          default:
            node.setAttribute(key, value);
            break;
        }
      }
    }

    if (Array.isArray(children)) {
      childItems.push(...children);
    } else if (children) {
      childItems.push(children);
    }

    for (const child of childItems) {
      if (child instanceof Element) {
        node.appendChild(child);
      } else if (typeof child === "string" && /<[a-z][\s\S]*>/i.test(child)) {
        node.innerHTML += child
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/\son\w+="[^"]*"/gi, "");
      } else {
        node.appendChild(document.createTextNode(child));
      }
    }

    return node;
  },
}));

vi.mock("../mx_helpers.js", () => ({
  formatZeros: (value, digits) => Number(value).toFixed(digits),
  path: () => "https://mapx.org",
}));

vi.mock("../is_test/index.js", () => ({
  isString: (value) => typeof value === "string",
  isArray: Array.isArray,
  isObject: (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Element),
  isEmpty: (value) =>
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0),
  isNotEmpty: (value) =>
    !(
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ),
  isFunction: (value) => typeof value === "function",
  isNumeric: (value) => !Number.isNaN(Number(value)),
  isHTML: (value) => typeof value === "string" && /<[a-z][\s\S]*>/i.test(value),
  isElement: (value) => value instanceof Element,
  isPromise: (value) => value instanceof Promise,
}));

import { MapControlAttribution } from "./index.js";

describe("MapControlAttribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rowsMock.mockReturnValue(getBaseRows());
  });

  it("renders base attributions directly in the collapsed control", () => {
    rowsMock.mockReturnValue([...getBaseRows(), getCustomRow()]);

    const control = new MapControlAttribution();
    const elControl = control.onAdd(createMapMock());
    const links = [...elControl.querySelectorAll("a")];
    const mapxLink = links.find((link) => link.textContent.includes("MapX"));
    const osmLink = links.find((link) =>
      link.textContent.includes("OpenStreetMap"),
    );

    expect(mapxLink).toBeTruthy();
    expect(mapxLink.href).toBe("https://mapx.org/");
    expect(mapxLink.target).toBe("_blank");
    expect(mapxLink.rel).toBe("noreferrer");
    expect(osmLink).toBeTruthy();
    expect(elControl.textContent).toContain("© UNEP/GRID MapX");
    expect(elControl.textContent).toContain("© OpenStreetMap contributors");
    expect(elControl.textContent).not.toContain("ACLED");
    expect(elControl.textContent).toContain("|");
  });

  it("normalizes attribution HTML links as external links", () => {
    const control = new MapControlAttribution();
    const elControl = control.onAdd(createMapMock());
    const osmLink = [...elControl.querySelectorAll("a")].find((link) =>
      link.textContent.includes("OpenStreetMap"),
    );

    expect(osmLink).toBeTruthy();
    expect(osmLink.href).toBe("https://openstreetmap.org/");
    expect(osmLink.target).toBe("_blank");
    expect(osmLink.rel).toBe("noreferrer");
  });

  it("shows a plus toggle only when additional attributions are hidden", () => {
    const controlWithoutAdditionalRows = new MapControlAttribution();
    const elBaseOnly = controlWithoutAdditionalRows.onAdd(createMapMock());

    expect(elBaseOnly.querySelector(".mx-attribution-toggle")).toBeNull();

    rowsMock.mockReturnValue([...getBaseRows(), getCustomRow()]);
    const controlWithAdditionalRows = new MapControlAttribution();
    const elWithAdditionalRows = controlWithAdditionalRows.onAdd(createMapMock());
    const toggle = elWithAdditionalRows.querySelector(".mx-attribution-toggle");

    expect(toggle).toBeTruthy();
    expect(toggle.classList.contains("fa-plus")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("expands and collapses the full attribution list", () => {
    rowsMock.mockReturnValue([...getBaseRows(), getCustomRow()]);
    const control = new MapControlAttribution();
    const elControl = control.onAdd(createMapMock());
    const toggle = elControl.querySelector(".mx-attribution-toggle");

    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(elControl.querySelector(".mx-attribution-panel")).toBeTruthy();
    expect(elControl.textContent).toContain("ACLED");
    expect(elControl.querySelectorAll(".mx-attribution-panel-row")).toHaveLength(
      3,
    );
    expect(elControl.querySelector(".mx-attribution-toggle").classList).toContain(
      "fa-minus",
    );
    expect(
      elControl
        .querySelector(".mx-attribution-toggle")
        .getAttribute("aria-expanded"),
    ).toBe("true");

    elControl
      .querySelector(".mx-attribution-toggle")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(elControl.querySelector(".mx-attribution-panel")).toBeNull();
    expect(elControl.textContent).not.toContain("ACLED");
    expect(elControl.querySelector(".mx-attribution-toggle").classList).toContain(
      "fa-plus",
    );
  });

  it("updates rows on style changes while preserving expanded state", () => {
    const map = createMapMock();
    rowsMock.mockReturnValue([...getBaseRows(), getCustomRow()]);
    const control = new MapControlAttribution();
    const elControl = control.onAdd(map);

    elControl
      .querySelector(".mx-attribution-toggle")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    rowsMock.mockReturnValue([...getBaseRows(), getMineralRow()]);
    map.emit("styledata");

    expect(elControl.querySelector(".mx-attribution-panel")).toBeTruthy();
    expect(elControl.textContent).toContain("Mineral operations");
    expect(elControl.textContent).not.toContain("ACLED");
    expect(elControl.querySelector(".mx-attribution-toggle").classList).toContain(
      "fa-minus",
    );
  });

  it("removes map listeners on remove", () => {
    const map = createMapMock();
    const control = new MapControlAttribution();
    control.onAdd(map);
    control.onRemove();

    expect(map.off).toHaveBeenCalledWith("styledata", control.render);
    expect(map.off).toHaveBeenCalledWith("idle", control.render);
  });
});

function createMapMock() {
  const listeners = {};
  return {
    on: vi.fn((event, callback) => {
      listeners[event] = callback;
    }),
    off: vi.fn(),
    emit: (event) => listeners[event]?.(),
  };
}

function getBaseRows() {
  return [
    {
      kind: "source",
      id: "mapx",
      type: "application",
      attribution_html: "© UNEP/GRID MapX",
      attribution_text: "© UNEP/GRID MapX",
    },
    {
      kind: "source",
      id: "protomaps_basemap",
      type: "vector",
      attribution_html:
        "© <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors",
      attribution_text: "© OpenStreetMap contributors",
    },
  ];
}

function getCustomRow() {
  return {
    kind: "source",
    id: "MX-0BAMT-MXYIM-NHMM0-SRC",
    type: "vector",
    attribution_html:
      "<a href='https://www.acleddata.com/'>Armed Conflict Location & Event Data Project (ACLED): Africa</a>",
    attribution_text:
      "Armed Conflict Location & Event Data Project (ACLED): Africa",
  };
}

function getMineralRow() {
  return {
    kind: "source",
    id: "MX-V7AY6-OCTNO-ZB4FV-SRC",
    type: "vector",
    attribution_html: "Mineral operations outside the United States (USGS, 2010)",
    attribution_text: "Mineral operations outside the United States (USGS, 2010)",
  };
}
