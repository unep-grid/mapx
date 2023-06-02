export class AnimationButton {
  constructor(opt) {
    const ab = this;
    const {
      element,
      onValueChange,
      startValue,
      endValue,
      mirror,
      infinite,
      duration,
      framerate,
    } = opt;
    ab._element = element;
    ab._onValueChange = onValueChange;
    ab._startValue = startValue;
    ab._endValue = endValue;
    ab._mirror = mirror;
    ab._duration = duration;
    ab._framerate = framerate || 10; // 10 fps
    ab._infinite = infinite;
    ab._currentValue = startValue;
    ab._direction = 1; // 1 for forward, -1 for backward
    ab._isAnimating = false;
    ab._animationFrameId = null;
    ab._step = (endValue - startValue) / ab._duration / ab._framerate;
    ab._element.innerHTML = "⏯"; // Set initial button state
    ab._element.addEventListener("click", () => ab.toggleAnimation());
    ab.animate = ab.animate.bind(ab);
  }

  animate() {
    const ab = this;
    try {
      if (!ab._isAnimating) {
        return;
      }
      if (ab._currentValue >= ab._endValue && ab._mirror) {
        ab._direction = -1;
      } else if (ab._currentValue <= ab._startValue && ab._mirror) {
        ab._direction = 1;
      } else if (ab._currentValue >= ab._endValue && ab._infinite) {
        ab._currentValue = ab._startValue;
      } else if (ab._currentValue >= ab._endValue) {
        ab.stopAnimation();
        return;
      }
      ab._currentValue += ab._direction * ab._step;
      ab._onValueChange(ab._currentValue);
      ab._animationFrameId = setTimeout(ab.animate, 1000 / ab._framerate);
    } catch (e) {
      console.error(e);
    }
  }

  startAnimation() {
    const ab = this;
    if (ab._isAnimating) {
      return;
    }
    ab._isAnimating = true;
    ab._element.innerHTML = "⏸"; // Change button state to pause
    ab.animate();
  }

  stopAnimation() {
    const ab = this;
    if (!ab._isAnimating) {
      return;
    }
    ab._isAnimating = false;
    ab._element.innerHTML = "⏯"; // Change button state to play
    clearTimeout(ab._animationFrameId);
  }

  toggleAnimation() {
    const ab = this;
    if (ab._isAnimating) {
      ab.stopAnimation();
    } else {
      ab.startAnimation();
    }
  }
}
