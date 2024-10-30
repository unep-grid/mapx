import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { Geocoder } from "./index.js";
import { el } from "../el_mapx";
import { settings } from "../settings";

beforeAll(() => {
  // Mock the `window` object and the cancelAnimationFrame method
  global.window = {
    cancelAnimationFrame: vi.fn(),
    mozCancelAnimationFrame: vi.fn(),
  };
});

afterAll(() => {
  // Clean up after the tests
  delete global.window;
});

// Only mock mapboxgl since it's an external dependency
vi.mock("../mx", () => ({
  mapboxgl: {
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
      }),
    })),
  },
}));

// Use actual settings and el() helper
const originalSettings = { ...settings };

describe("Geocoder", () => {
  let geocoder;
  let mockMap;
  let mockResponse;
  let target;

  beforeEach(() => {
    // Create target element using actual el() helper
    target = el("div", { id: "target" });
    document.body.appendChild(target);

    // Mock map instance
    mockMap = {
      getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
      getBounds: vi.fn().mockReturnValue([
        [-1, -1],
        [1, 1],
      ]),
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
    };

    // Mock fetch response
    mockResponse = {
      features: [
        {
          properties: {
            name: "Test Location",
            city: "Test City",
            country: "Test Country",
          },
          geometry: {
            coordinates: [10, 20],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    geocoder = new Geocoder();
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (target && target.parentNode) {
      target.parentNode.removeChild(target);
    }
    // Restore original settings
    Object.assign(settings, originalSettings);
  });

  describe("initialization", () => {
    it("should initialize with default config", async () => {
      await geocoder.init({
        elTarget: target,
        map: mockMap,
      });

      expect(geocoder.config.url.toString()).toBe("https://photon.komoot.io/");
      expect(geocoder.config.limit).toBe(50);
      expect(geocoder._map).toBe(mockMap);
      expect(geocoder._elTarget).toBe(target);
      expect(geocoder._elTarget.contains(geocoder._elResultsList)).toBeTruthy();
    });

    it("should handle missing target element", async () => {
      await expect(() => geocoder.init({ map: mockMap })).rejects.toThrowError(
        "Geocoder : no target",
      );
    });
  });

  describe("search functionality", () => {
    beforeEach(async () => {
      await geocoder.init({
        elTarget: target,
        map: mockMap,
      });
    });

    it("should perform search on enter key", async () => {
      const input = target.querySelector("input");
      input.value = "test query";
      const event = new KeyboardEvent("keypress", { key: "Enter" });
      input.dispatchEvent(event);

      expect(global.fetch).toHaveBeenCalled();
      const url = new URL(global.fetch.mock.calls[0][0]);
      expect(url.searchParams.get("q")).toBe("test query");
    });

    it("should use correct language from settings", async () => {
      settings.language = "fr";
      geocoder._elInput.value = "paris";
      await geocoder.performSearch();

      const url = new URL(global.fetch.mock.calls[0][0]);
      expect(url.searchParams.get("lang")).toBe("fr");
    });

    it("should handle empty search query", async () => {
      geocoder._elInput.value = "";
      await geocoder.performSearch();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(geocoder._elResultsList.innerHTML).toBe("");
    });

    it("should display results using actual DOM elements", async () => {
      const results = [
        {
          feature: mockResponse.features[0],
          display_name: "Test Location, Test City, Test Country",
        },
      ];

      await geocoder.displayResults(results);

      const resultItems = target.querySelectorAll(".list-group-item");
      expect(resultItems.length).toBe(1);
      expect(resultItems[0].textContent).toBe(
        "Test Location, Test City, Test Country",
      );
    });
  });

  describe("marker management", () => {
    beforeEach(async () => {
      await geocoder.init({
        elTarget: target,
        map: mockMap,
      });
    });

    it("should add and remove markers", () => {
      const result = {
        feature: mockResponse.features[0],
        display_name: "Test Location",
      };

      const markerLocation = geocoder.addMarker(result);
      expect(geocoder._markers.size).toBe(1);

      markerLocation.remove();
      expect(geocoder._markers.size).toBe(0);
    });

    it("should clear all markers", () => {
      const result = {
        feature: mockResponse.features[0],
        display_name: "Test Location",
      };

      geocoder.addMarker(result);
      geocoder.addMarker(result);
      expect(geocoder._markers.size).toBe(2);

      geocoder.clearAllMarkers();
      expect(geocoder._markers.size).toBe(0);
    });
  });

  describe("UI interaction", () => {
    beforeEach(async () => {
      await geocoder.init({
        elTarget: target,
        map: mockMap,
      });
    });

    it("should show and hide loading state", () => {
      geocoder.showLoading();
      expect(geocoder._elLoading).toBeTruthy();

      geocoder.hideLoading();
      expect(geocoder._elLoading).toBeFalsy();
    });

    it("should show error messages", () => {
      const errorMessage = "Test error message";
      geocoder.showError(errorMessage);

      const elError = target.querySelector(".text-danger");
      expect(elError).toBeTruthy();
      expect(elError.innerText).toBe(errorMessage);
    });
  });

  describe("location handling", () => {
    beforeEach(async () => {
      await geocoder.init({
        elTarget: target,
        map: mockMap,
      });
    });

    it("should format location string correctly", () => {
      const location = {
        name: "Test Place",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        postcode: "12345",
      };

      const formatted = geocoder.formatLocationString(location);
      expect(formatted).toBe(
        "Test Place, Test City, Test State, 12345, Test Country",
      );
    });

    it("should handle navigation to point", () => {
      geocoder.goTo([10, 20]);
      expect(mockMap.flyTo).toHaveBeenCalledWith({
        center: { lng: 10, lat: 20 },
        zoom: 14,
      });
    });

    it("should handle navigation to bounds", () => {
      const bounds = [
        [-1, -1],
        [1, 1],
      ];
      geocoder.goTo(bounds);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(bounds, {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        linear: false,
        duration: 2000,
      });
    });
  });
});
