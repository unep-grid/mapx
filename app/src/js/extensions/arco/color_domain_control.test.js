import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArcoColorDomainControl,
  isColorDomainEligible,
  resolveInitialColorDomain,
} from "./color_domain_control.js";

describe("ARCO color-domain helpers", () => {
  it("only enables runtime domains for scalar Zarr layers", () => {
    expect(isColorDomainEligible({ kind: "scalar", backend: "zarr" })).toBe(
      true,
    );
    expect(isColorDomainEligible({ kind: "scalar", backend: "wmts" })).toBe(
      false,
    );
    expect(isColorDomainEligible({ kind: "vector", backend: "zarr" })).toBe(
      false,
    );
  });

  it("preserves an explicit automatic override before catalog defaults", () => {
    const defaults = { colorDomain: [-3, 3] };

    expect(resolveInitialColorDomain({}, defaults)).toEqual([-3, 3]);
    expect(
      resolveInitialColorDomain({ colorDomain: undefined }, defaults),
    ).toEqual([-3, 3]);
    expect(
      resolveInitialColorDomain({ colorDomain: null }, defaults),
    ).toBeNull();
    expect(
      resolveInitialColorDomain({ colorDomain: [-2, 2] }, defaults),
    ).toEqual([-2, 2]);
  });
});

describe("ArcoColorDomainControl", () => {
  let control;
  let onChange;

  beforeEach(() => {
    onChange = vi.fn();
    control = new ArcoColorDomainControl({ document, onChange });
  });

  it("displays a fixed domain and enables the Auto action", () => {
    control.sync({ colorDomain: [-3, 3], frameDomain: [-1, 1] });

    expect(control.elMin.value).toBe("-3");
    expect(control.elMax.value).toBe("3");
    expect(control.elAuto.disabled).toBe(false);
  });

  it("displays changing frame extrema while automatic", () => {
    control.sync({ colorDomain: null, frameDomain: [-1, 2] });
    expect([control.elMin.value, control.elMax.value]).toEqual(["-1", "2"]);

    control.sync({ colorDomain: null, frameDomain: [-4, 6] });
    expect([control.elMin.value, control.elMax.value]).toEqual(["-4", "6"]);
    expect(control.elAuto.disabled).toBe(true);
  });

  it("displays equal extrema for an automatic constant frame", () => {
    control.sync({ colorDomain: null, frameDomain: [5, 5] });

    expect([control.elMin.value, control.elMax.value]).toEqual(["5", "5"]);
    expect(control.elAuto.disabled).toBe(true);
  });

  it("emits a valid custom domain", () => {
    control.sync({ colorDomain: null, frameDomain: [0, 1] });
    control.elMin.value = "-2";
    control.elMax.value = "4";
    control.elMax.dispatchEvent(new Event("change"));

    expect(onChange).toHaveBeenCalledWith([-2, 4]);
    expect(control.elAuto.disabled).toBe(false);
    expect(control.elMin.checkValidity()).toBe(true);
  });

  it("keeps an invalid draft until the pair becomes valid", () => {
    control.sync({ colorDomain: [0, 1], frameDomain: [0, 1] });
    control.elMin.value = "5";
    control.elMin.dispatchEvent(new Event("change"));

    expect(onChange).not.toHaveBeenCalled();
    expect(control.elMin.value).toBe("5");
    expect(control.elMin.checkValidity()).toBe(false);
    expect(control.elMin.getAttribute("aria-invalid")).toBe("true");

    control.sync({ colorDomain: [0, 1], frameDomain: [-10, 10] });
    expect(control.elMin.value).toBe("5");

    control.elMax.value = "10";
    control.elMax.dispatchEvent(new Event("change"));

    expect(onChange).toHaveBeenCalledWith([5, 10]);
    expect(control.elMin.checkValidity()).toBe(true);
    expect(control.elMin.hasAttribute("aria-invalid")).toBe(false);
  });

  it("rejects equal extrema for a custom domain", () => {
    control.sync({ colorDomain: null, frameDomain: [0, 1] });
    control.elMin.value = "1";
    control.elMin.dispatchEvent(new Event("change"));

    expect(onChange).not.toHaveBeenCalled();
    expect(control.elMin.checkValidity()).toBe(false);
  });

  it("resets to the current frame domain", () => {
    control.sync({ colorDomain: [-3, 3], frameDomain: [-1.5, 2.5] });
    control.elAuto.click();

    expect(onChange).toHaveBeenCalledWith(null);
    expect([control.elMin.value, control.elMax.value]).toEqual(["-1.5", "2.5"]);
    expect(control.elAuto.disabled).toBe(true);
  });

  it("keeps custom values stable when frame extrema change", () => {
    control.sync({ colorDomain: [-3, 3], frameDomain: [-1, 1] });
    control.sync({ colorDomain: [-3, 3], frameDomain: [-10, 10] });

    expect([control.elMin.value, control.elMax.value]).toEqual(["-3", "3"]);
  });

  it("removes listeners and its owned DOM on destroy", () => {
    document.body.appendChild(control.elRoot);
    control.sync({ colorDomain: [0, 1] });
    control.destroy();
    control.elMin.value = "-1";
    control.elMin.dispatchEvent(new Event("change"));

    expect(onChange).not.toHaveBeenCalled();
    expect(control.elRoot.isConnected).toBe(false);
  });
});
