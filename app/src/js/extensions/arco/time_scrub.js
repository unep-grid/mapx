/**
 * @typedef {Object} TimeScrubCallbacks
 * @property {() => boolean} isPlaying - Playback state when the scrub begins.
 * @property {() => void} pause - Suspend playback without clearing its state.
 * @property {(time: number) => void} present - Cheap UI update, every request.
 * @property {(time: number) => void} apply - Layer seek, at most once per frame.
 * @property {(time: number | null, resume: boolean) => void} finish
 * @property {() => boolean} [live] - Seek while dragging ; otherwise on end only.
 */

/**
 * @typedef {Object} FrameScheduler
 * @property {(callback: FrameRequestCallback) => number} request
 * @property {(handle: number) => void} cancel
 */

/** @type {FrameScheduler} */
const browserFrames = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Coordinates a time scrub : pause playback on begin, present every requested
 * time immediately, seek the layer at most once per frame, flush the final
 * seek on end and resume playback if it was running when the scrub began.
 */
export class TimeScrub {
  /**
   * @param {TimeScrubCallbacks} callbacks
   * @param {FrameScheduler} [frames]
   */
  constructor(callbacks, frames = browserFrames) {
    this._callbacks = callbacks;
    this._frames = frames;
    this._active = false;
    this._resume = false;
    this._latest = null;
    this._applied = null;
    this._frame = null;
  }

  get interacting() {
    return this._active;
  }

  begin() {
    if (this._active) {
      return;
    }
    this._active = true;
    this._resume = this._callbacks.isPlaying();
    this._latest = null;
    this._applied = null;
    this._callbacks.pause();
  }

  /**
   * @param {number} time
   */
  request(time) {
    if (!this._active || !Number.isFinite(time)) {
      return;
    }
    this._latest = time;
    this._callbacks.present(time);
    if (this._frame !== null || this._callbacks.live?.() === false) {
      return;
    }
    this._frame = this._frames.request(() => {
      this._frame = null;
      if (this._active) {
        this._applyLatest();
      }
    });
  }

  end() {
    if (!this._active) {
      return;
    }
    this._cancelFrame();
    if (this._latest !== null && this._latest !== this._applied) {
      this._applyLatest();
    }
    const time = this._latest;
    const resume = this._resume;
    this._reset();
    this._callbacks.finish(time, resume);
  }

  /** Abandon pending work without resuming playback (explicit stop, cleanup). */
  cancel() {
    this._cancelFrame();
    this._reset();
  }

  _reset() {
    this._active = false;
    this._resume = false;
    this._latest = null;
    this._applied = null;
  }

  _applyLatest() {
    if (this._latest === null) {
      return;
    }
    this._applied = this._latest;
    this._callbacks.apply(this._latest);
  }

  _cancelFrame() {
    if (this._frame === null) {
      return;
    }
    this._frames.cancel(this._frame);
    this._frame = null;
  }
}
