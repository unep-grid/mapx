import { describe, expect, it, vi } from "vitest";
import { TimeScrub } from "./time_scrub.js";

function harness({ playing = true, live = true } = {}) {
  let frame = null;
  const frames = {
    request: vi.fn((callback) => {
      frame = callback;
      return 7;
    }),
    cancel: vi.fn(),
  };
  const callbacks = {
    isPlaying: () => playing,
    pause: vi.fn(),
    present: vi.fn(),
    apply: vi.fn(),
    finish: vi.fn(),
    live: () => live,
  };
  const scrub = new TimeScrub(callbacks, frames);
  return {
    scrub,
    callbacks,
    frames,
    flush: () => {
      const callback = frame;
      frame = null;
      callback?.(0);
    },
  };
}

describe("TimeScrub", () => {
  it("presents every request and applies only the latest one per frame", () => {
    const { scrub, callbacks, frames, flush } = harness();
    scrub.begin();
    scrub.request(100);
    scrub.request(200);
    scrub.request(300);

    expect(callbacks.pause).toHaveBeenCalledOnce();
    expect(callbacks.present.mock.calls.map(([time]) => time)).toEqual([
      100, 200, 300,
    ]);
    expect(frames.request).toHaveBeenCalledOnce();
    expect(callbacks.apply).not.toHaveBeenCalled();
    flush();
    expect(callbacks.apply).toHaveBeenCalledWith(300);
    scrub.end();
    expect(callbacks.apply).toHaveBeenCalledOnce();
  });

  it("flushes the final seek before conditionally resuming", () => {
    const active = harness({ playing: true });
    active.scrub.begin();
    active.scrub.request(400);
    active.scrub.end();
    expect(active.callbacks.apply).toHaveBeenCalledWith(400);
    expect(active.callbacks.finish).toHaveBeenCalledWith(400, true);

    const paused = harness({ playing: false });
    paused.scrub.begin();
    paused.scrub.request(500);
    paused.scrub.end();
    expect(paused.callbacks.finish).toHaveBeenCalledWith(500, false);
  });

  it("defers the seek to the end when live seeking is disabled", () => {
    const { scrub, callbacks, frames } = harness({ live: false });
    scrub.begin();
    scrub.request(100);
    scrub.request(200);

    expect(frames.request).not.toHaveBeenCalled();
    expect(callbacks.present).toHaveBeenCalledTimes(2);
    scrub.end();
    expect(callbacks.apply).toHaveBeenCalledOnce();
    expect(callbacks.apply).toHaveBeenCalledWith(200);
  });

  it("ignores requests outside an interaction", () => {
    const { scrub, callbacks } = harness();
    scrub.request(100);
    scrub.end();

    expect(callbacks.present).not.toHaveBeenCalled();
    expect(callbacks.finish).not.toHaveBeenCalled();
  });

  it("cancels a deferred seek and resume", () => {
    const { scrub, callbacks, frames, flush } = harness();
    scrub.begin();
    scrub.request(600);
    scrub.cancel();
    flush();
    scrub.end();

    expect(scrub.interacting).toBe(false);
    expect(frames.cancel).toHaveBeenCalledWith(7);
    expect(callbacks.apply).not.toHaveBeenCalled();
    expect(callbacks.finish).not.toHaveBeenCalled();
  });
});
