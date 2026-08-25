import { describe, expect, it } from "vitest";
import { isViewId } from "@fxi/mx_valid";
import { newIdView } from "./id.js";

describe("view identifiers", () => {
  it("generates identifiers accepted by MapX validation", () => {
    expect(isViewId(newIdView())).toBe(true);
  });
});
