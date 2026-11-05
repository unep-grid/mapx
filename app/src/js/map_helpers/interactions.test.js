import { describe, expect, it } from "vitest";
import {
  MAP_INTERACTIONS,
  enableMapInteractionIfAllowed,
  getMapInteractions,
  isMapInteractionAllowed,
  setMapInteractions,
} from "./interactions.js";

function mockHandler() {
  let enabled = true;
  return {
    enable: () => (enabled = true),
    disable: () => (enabled = false),
    isEnabled: () => enabled,
  };
}

function mockMap() {
  const map = {};
  for (const name of MAP_INTERACTIONS) {
    map[name] = mockHandler();
  }
  return map;
}

describe("map interactions", () => {
  it("keeps every handler enabled by default", () => {
    const map = mockMap();
    expect(Object.values(getMapInteractions(map)).every(Boolean)).toBe(true);
    expect(isMapInteractionAllowed(map, "scrollZoom")).toBe(true);
  });

  it("disables only the requested handlers", () => {
    const map = mockMap();
    const state = setMapInteractions(map, {
      boxZoom: false,
      dragRotate: false,
    });
    expect(state.boxZoom).toBe(false);
    expect(state.dragRotate).toBe(false);
    expect(state.dragPan).toBe(true);
    expect(isMapInteractionAllowed(map, "boxZoom")).toBe(false);
    expect(isMapInteractionAllowed(map, "dragPan")).toBe(true);
  });

  it("re-enables a handler and clears the user restriction", () => {
    const map = mockMap();
    setMapInteractions(map, { scrollZoom: false });
    setMapInteractions(map, { scrollZoom: true });
    expect(map.scrollZoom.isEnabled()).toBe(true);
    expect(isMapInteractionAllowed(map, "scrollZoom")).toBe(true);
  });

  it("rejects unknown handlers and non boolean values without side effects", () => {
    const map = mockMap();
    expect(() =>
      setMapInteractions(map, { boxZoom: false, setStyle: false }),
    ).toThrow(/Unknown interaction/);
    expect(() => setMapInteractions(map, { boxZoom: "no" })).toThrow(/boolean/);
    expect(() => setMapInteractions(map, null)).toThrow(/object/);
    expect(map.boxZoom.isEnabled()).toBe(true);
  });
});

describe("enableMapInteractionIfAllowed", () => {
  it("re-enables an interaction disabled by internal code", () => {
    const map = mockMap();
    map.keyboard.disable();
    expect(enableMapInteractionIfAllowed(map, "keyboard")).toBe(true);
    expect(map.keyboard.isEnabled()).toBe(true);
  });

  it("keeps an interaction disabled by the embedder", () => {
    const map = mockMap();
    setMapInteractions(map, { keyboard: false });
    expect(enableMapInteractionIfAllowed(map, "keyboard")).toBe(false);
    expect(map.keyboard.isEnabled()).toBe(false);
  });
});
