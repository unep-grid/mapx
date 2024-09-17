import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventSimple } from "./index.js"; 

describe("EventSimple", () => {
  let eventManager;

  beforeEach(() => {
    eventManager = new EventSimple();
  });

  it("should register and fire an event", async () => {
    const mockCallback = vi.fn();
    eventManager.on("test_event", mockCallback);

    await eventManager.fire("test_event", { data: 123 });

    expect(mockCallback).toHaveBeenCalledWith({ data: 123 }, "test_event");
  });

  it("should register and fire multiple events", async () => {
    const mockCallback = vi.fn();
    eventManager.on(["event1", "event2"], mockCallback);

    await eventManager.fire("event1", { data: "a" });
    await eventManager.fire("event2", { data: "b" });

    expect(mockCallback).toHaveBeenNthCalledWith(1, { data: "a" }, "event1");
    expect(mockCallback).toHaveBeenNthCalledWith(2, { data: "b" }, "event2");
  });

  it("should remove an event listener with off", async () => {
    const mockCallback = vi.fn();
    eventManager.on("test_event", mockCallback);

    eventManager.off("test_event", mockCallback);

    await eventManager.fire("test_event", { data: 123 });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should remove an event listener with off when types are in different order", async () => {
    const mockCallback = vi.fn();
    eventManager.on(["event1", "event2"], mockCallback);

    eventManager.off(["event2", "event1"], mockCallback);

    await eventManager.fire("event1", { data: "a" });
    await eventManager.fire("event2", { data: "b" });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should call once listeners only once", async () => {
    const mockCallback = vi.fn();
    eventManager.once("test_event", mockCallback);

    await eventManager.fire("test_event", { data: 123 });
    await eventManager.fire("test_event", { data: 456 });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ data: 123 }, "test_event");
  });

  it("should handle passthrough events", async () => {
    const mockCallback = vi.fn();
    eventManager.addPassthrough({ cb: mockCallback });

    await eventManager.fire("test_event", { data: 123 });

    expect(mockCallback).toHaveBeenCalledWith({
      type: "test_event",
      data: { data: 123 },
    });
  });

  it("should remove event listeners by group", async () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    eventManager.on("test_event", mockCallback1, "group1");
    eventManager.on("test_event", mockCallback2, "group2");

    eventManager.offGroup("group1");

    await eventManager.fire("test_event", { data: 123 });

    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalledWith({ data: 123 }, "test_event");
  });

  it("should throw error when firing an event with invalid type", async () => {
    await expect(eventManager.fire(null)).rejects.toThrow(
      "Event 'type' must be a non-empty string.",
    );
  });

  it("should throw error when registering an event with invalid type", () => {
    expect(() => eventManager.on(null, () => {})).toThrow(
      "'type' must be a non-empty string or an array of non-empty strings.",
    );
  });

  it("should clear all callbacks on destroy", async () => {
    const mockCallback = vi.fn();
    eventManager.on("test_event", mockCallback);

    eventManager.destroy();

    await eventManager.fire("test_event", { data: 123 });

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
